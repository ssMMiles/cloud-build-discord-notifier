import { ButtonBuilder, ButtonStyle } from '@discord-interactions/builders'
import { Button, ButtonContext, SimpleEmbed } from '@discord-interactions/core'

export const RetryBuild = new Button(
  'build.retry',
  new ButtonBuilder(ButtonStyle.Secondary, 'Retry').setEmoji({ name: '🔁' }),
  async (ctx: ButtonContext<{ projectId: string; buildId: string }>): Promise<void> => {
    if (!ctx.state) return

    await ctx.defer()

    const { projectId, buildId } = ctx.state

    await ctx.cloudbuild.retryBuild({ projectId: projectId, id: buildId })

    await ctx.send(SimpleEmbed(`Build \`\`${buildId}\`\` is being retried.`).setEphemeral(true))
  }
)
