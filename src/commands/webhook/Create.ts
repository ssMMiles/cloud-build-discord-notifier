import { SimpleEmbed, SimpleError, SlashCommandContext } from '@discord-interactions/core'

export async function createWebhook(ctx: SlashCommandContext): Promise<void> {
  await ctx.defer()

  // @ts-ignore
  const channelId = ctx.hasOption('channel') ? ctx.options.get('channel').value : ctx.channelId

  const existingWebhook = await ctx.db.get('SELECT id FROM webhooks WHERE channel_id = ?', channelId)

  if (existingWebhook !== undefined) {
    await ctx.send(SimpleError('A webhook is already set for this channel.').setEphemeral(true))
    return
  }

  try {
    var webhook: any = await ctx.app.rest.post(`/channels/${channelId}/webhooks`, {
      body: {
        name: 'Cloud Build',
        avatar: 'https://storage.googleapis.com/files.milesmoonlove.com/builder.png',
      },
    })
  } catch (err) {
    console.error(err)

    await ctx.send(SimpleError('There was an error creating the webhook. Please try again later.').setEphemeral(true))
    return
  }

  const data = { id: webhook.id, token: webhook.token, channelId: channelId }

  await ctx.db.run('INSERT INTO webhooks (id, token, channel_id) VALUES (?, ?, ?)', data.id, data.token, data.channelId)

  await ctx.send(SimpleEmbed(`Created webhook in <#${channelId}>.`).setEphemeral(true))
}
