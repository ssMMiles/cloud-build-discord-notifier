import { SimpleEmbed, SimpleError, SlashCommandContext } from '@discord-interactions/core'

export async function removeWebhook(ctx: SlashCommandContext) {
  await ctx.defer()

  const channelId = ctx.hasOption('channel') ? ctx.getChannelOption('channel').value : ctx.channelId

  const webhook = await ctx.db.get('SELECT id FROM webhooks WHERE channel_id = ?', BigInt(channelId))

  if (webhook === undefined) {
    await ctx.send(SimpleError('No webhook is currently set for this channel.').setEphemeral(true))
    return
  }

  try {
    await ctx.app.rest.delete(`/webhooks/${webhook.id}`, {
      body: {
        name: 'Cloud Build',
        avatar: 'https://storage.googleapis.com/files.milesmoonlove.com/builder.png',
      },
    })
  } catch (err) {
    await ctx.send(SimpleError('There was an error removing the webhook. Please try again later.').setEphemeral(true))
    return
  }

  await ctx.db.run('DELETE FROM webhooks WHERE id = ?', webhook.id)

  await ctx.send(SimpleEmbed(`Removed webhook in <#${channelId}>.`).setEphemeral(true))
}
