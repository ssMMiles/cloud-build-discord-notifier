import { ButtonBuilder, ButtonStyle } from '@discord-interactions/builders'
import { Button, ButtonContext, SimpleEmbed } from '@discord-interactions/core'

export const StopBuild = new Button(
  'build.stop',
  new ButtonBuilder(ButtonStyle.Danger, 'Stop').setEmoji({ name: '🛑' }),
  async (ctx: ButtonContext<{ projectId: string; buildId: string }>): Promise<void> => {
    if (!ctx.state) return

    await ctx.defer()

    const { projectId, buildId } = ctx.state

    await ctx.cloudbuild.cancelBuild({ projectId: projectId, id: buildId })

    await ctx.send(SimpleEmbed(`Build \`\`${buildId}\`\` has been cancelled.`).setEphemeral(true))
  }
)
