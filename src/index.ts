import {
  DiscordApplication,
  InteractionContext,
  InteractionHandlerTimedOut,
  PingContext,
  SyncMode,
  UnauthorizedInteraction,
  UnknownApplicationCommandType,
  UnknownComponentType,
  UnknownInteractionType,
} from '@discord-interactions/core'
import { CloudBuildClient } from '@google-cloud/cloudbuild'
import fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import fs from 'node:fs'
import { Database, open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { ApproveBuild } from './buttons/ApproveBuild.js'
import { RejectBuild } from './buttons/RejectBuild.js'
import { RetryBuild } from './buttons/RetryBuild.js'
import { StopBuild } from './buttons/StopBuild.js'
import { Webhook } from './commands/webhook/index.js'
import NotificationHandler from './notifications.js'

declare module '@discord-interactions/core' {
  interface SlashCommandContext {
    db: Database
    cloudbuild: CloudBuildClient
  }

  interface ButtonContext {
    db: Database
    cloudbuild: CloudBuildClient
  }
}

const keys = ['PORT', 'DISCORD_TOKEN', 'DISCORD_ID', 'DISCORD_PUBKEY', 'DB_PATH']

const missing = keys.filter(key => !(key in process.env))

if (missing.length !== 0) {
  console.error(`Missing Enviroment Variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
  process.exit(1)
}

const cloudbuild = new CloudBuildClient({ keyFilename: process.env.GCLOUD_AUTH_FILE })

async function main() {
  const db = await open({
    filename: process.env.DB_PATH,
    driver: sqlite3.Database,
  })

  const schema = fs.readFileSync('src/db/schema.sql').toString()
  await db.exec(schema)

  const hook = async (ctx: InteractionContext) => {
    if (ctx instanceof PingContext) return
    if (!ctx.guildId) return

    ctx.decorate('db', db)
    ctx.decorate('cloudbuild', cloudbuild)
  }

  const app = new DiscordApplication({
    clientId: process.env.DISCORD_ID as string,
    token: process.env.DISCORD_TOKEN as string,
    publicKey: process.env.DISCORD_PUBKEY as string,

    hooks: {
      interaction: [hook],
    },

    syncMode: SyncMode.Enabled,
  })

  app.components.register(RetryBuild, StopBuild, ApproveBuild, RejectBuild)
  await app.commands.register(new Webhook())

  await NotificationHandler.setup(app, db, process.env.GCLOUD_AUTH_FILE)

  const PORT = process.env.PORT

  // @ts-ignore
  const server = fastify()
  server.register(rawBody)

  server.get('/', (_, res) => {
    res.send('Ready!')
  })

  server.post('/', async (request, reply) => {
    const signature = request.headers['x-signature-ed25519']
    const timestamp = request.headers['x-signature-timestamp']

    if (typeof request.rawBody !== 'string' || typeof signature !== 'string' || typeof timestamp !== 'string') {
      return reply.code(400).send({
        error: 'Invalid request',
      })
    }

    try {
      const [response, finishExecution] = await app.handleInteraction(request.rawBody, signature, timestamp)

      await reply.code(200).send(await response)
      await finishExecution
    } catch (err) {
      if (err instanceof UnauthorizedInteraction) {
        console.error('Unauthorized Interaction')
        return reply.code(401).send()
      }

      if (err instanceof InteractionHandlerTimedOut) {
        console.error('Interaction Handler Timed Out')

        return reply.code(408).send()
      }

      if (
        err instanceof UnknownInteractionType ||
        err instanceof UnknownApplicationCommandType ||
        err instanceof UnknownComponentType
      ) {
        console.error('Unknown Interaction - Library may be out of date.')
        console.dir(err.interaction)

        return reply.code(400).send()
      }

      console.error(err)
    }
  })

  server.listen(PORT, '0.0.0.0').then(async () => {
    console.log(`Server listening on ${PORT}.`)
  })
}

main()
