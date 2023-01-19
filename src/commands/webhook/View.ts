import { SimpleEmbed, SimpleError, SlashCommandContext } from '@discord-interactions/core'

export async function viewWebhooks(ctx: SlashCommandContext) {
  await ctx.defer()

  const webhooks = await ctx.db.all('SELECT channel_id, active FROM webhooks')

  if (webhooks.length === 0) {
    await ctx.send(SimpleError('There are currently no configured webhooks.').setEphemeral(true))
    return
  }

  let description = ''

  for (const webhook of webhooks) {
    description += `<#${webhook.channel_id}>: ${webhook.active ? '✅' : '❌'}\n`
  }

  await ctx.send(SimpleEmbed(description, 'Existing Webhooks').setEphemeral(true))
}
