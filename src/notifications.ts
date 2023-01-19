import { ActionRowBuilder, EmbedBuilder } from '@discord-interactions/builders'
import { DiscordApplication } from '@discord-interactions/core'
import { Message, PubSub } from '@google-cloud/pubsub'
import NodeCache from 'node-cache'
import { Database } from 'sqlite'
import { toTimestamp } from './util.js'

const BUILD_TTL = 60 * 30

function secondsToHms(seconds: number): string {
  seconds = Number(seconds)
  var h = Math.floor(seconds / 3600)
  var m = Math.floor((seconds % 3600) / 60)
  var s = Math.floor((seconds % 3600) % 60)

  var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
  var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
  var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
  return hDisplay + mDisplay + sDisplay
}

const BuildStatuses = {
  PENDING: '🔒 Awaiting Approval',
  QUEUED: '⏳  Build Queued',
  WORKING: '🔄  Build Started',
  SUCCESS: '✅  Build Succeeded',
  CANCELLED: '❌  Build Cancelled',
  FAILURE: '❌  Build Failed',
  INTERNAL_ERROR: '❔  Internal Error',
  TIMEOUT: '⏰  Build Timed Out',
  EXPIRED: '⏰  Build Expired',
}

export default class NotificationHandler {
  private pubsub: PubSub

  private queue: Message[] = []
  private executingQueue: boolean = false

  private app: DiscordApplication
  private db: Database
  private cache: NodeCache

  private constructor(app: DiscordApplication, db: Database, keyFilename?: string) {
    this.pubsub = new PubSub({ keyFilename })

    this.app = app
    this.db = db
    this.cache = new NodeCache({ stdTTL: BUILD_TTL })
  }

  static async setup(app: DiscordApplication, db: Database, keyFileName: string) {
    const instance = new NotificationHandler(app, db, keyFileName)

    const [topic] = await instance.pubsub.topic('cloud-builds').get()
    const [subscription] = await topic.subscription('build-notifications').get()

    subscription.on('message', message => {
      console.log('Received message and pushed to queue.')
      instance.queueMessage(message)
    })

    console.log('Awaiting build notifications.')
  }

  queueMessage(message: Message) {
    this.queue.push(message)

    if (!this.executingQueue) this.executeQueue()
  }

  async executeQueue(allowed = false) {
    if (this.executingQueue && !allowed) return

    if (this.queue.length === 0) return (this.executingQueue = false)

    this.executingQueue = true
    await this.handleMessage(this.queue.shift())

    this.executeQueue(true)
  }

  async handleMessage(message: Message): Promise<void> {
    const build = JSON.parse(message.data.toString())

    const buildId = message.attributes.buildId
    const projectId = build.projectId

    const messageTime = new Date(message.publishTime).getTime()

    const embed = new EmbedBuilder()
    const buttons = new ActionRowBuilder()

    let title = ''

    if (build.status === 'PENDING') {
      title += BuildStatuses[build.status]
      buttons.addComponents(
        await this.app.components.createInstance('build.approve', { projectId, buildId }),
        await this.app.components.createInstance('build.reject', { projectId, buildId })
      )
    } else if (['QUEUED', 'WORKING'].includes(build.status)) {
      title += BuildStatuses[build.status]
      buttons.addComponents(await this.app.components.createInstance('build.stop', { projectId, buildId }))
    } else if (['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT', 'CANCELLED', 'EXPIRED'].includes(build.status)) {
      title += BuildStatuses[build.status]
      buttons.addComponents(await this.app.components.createInstance('build.retry', { projectId, buildId }))
    } else {
      title += 'Unknown Build Status'
      console.dir(build, { depth: 5, colors: true })
    }

    embed.setTitle(title)

    let description = `**${
      build?.substitutions?.TRIGGER_NAME.replaceAll('-', ' ') || 'Unknown Project'
    }**\n${buildId} - [(View Logs)](${build.logUrl})`

    if (build?.results?.images?.length > 0) {
      description += `\n\n**Built Images:**\n`

      for (const image of build.results.images) {
        description += `- ${image.name}\n`
      }
    }

    const start = new Date(build.startTime),
      timestamp = toTimestamp(start, 'T'),
      duration = secondsToHms((new Date(build.finishTime).getTime() - start.getTime()) / 1000)

    if (build.startTime && build.finishTime) {
      description += `\n\n*Started at ${timestamp} and took ${duration}.*`
    } else if (build.startTime) {
      description += `\n\n*Started at ${timestamp}.*`
    }

    embed.setDescription(description)

    const data = {
      body: {
        embeds: [embed.toJSON()],
        components: buttons.components.length > 0 ? [buttons.toJSON()] : [],
        username: 'Cloud Build',
        avatar_url: 'https://storage.googleapis.com/files.milesmoonlove.com/builder.png',
      },
    }

    if (buttons.components.length > 0) await this.sendWebhook(buildId, messageTime, data)

    message.ack()
  }

  async sendWebhook(buildId: string, messageTime: number, data: any) {
    const webhooks: [{ id: string; token: string }] = await this.db.all(
      'SELECT id, token FROM webhooks WHERE active = 1'
    )

    for (const webhook of webhooks) {
      const existingMessage: string = this.cache.get(`${webhook.id}.${buildId}`)

      let response: { id?: string }
      try {
        if (existingMessage !== undefined) {
          const [existingMessageTime, existingMessageId] = existingMessage.split('|')

          if (Number(existingMessageTime) > messageTime) {
            console.log('Skipping out of order message.')
            continue
          }

          response = await this.app.rest.patch(
            `/webhooks/${webhook.id}/${webhook.token}/messages/${existingMessageId}` as any,
            data
          )
        } else {
          response = await this.app.rest.post(`/webhooks/${webhook.id}/${webhook.token}?wait=true` as any, data)
        }
      } catch (err) {
        console.error('Error sending webhook: ', err)
      }

      if (response?.id) this.cache.set(`${webhook.id}.${buildId}`, `${messageTime}|${response.id}`)
    }
  }
}
