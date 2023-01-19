import { ButtonBuilder, ButtonStyle } from '@discord-interactions/builders'
import { Button, ButtonContext, SimpleEmbed } from '@discord-interactions/core'

export const ApproveBuild = new Button(
  'build.approve',
  new ButtonBuilder(ButtonStyle.Success, '').setEmoji({ name: '✔️' }),
  async (ctx: ButtonContext<{ projectId: string; buildId: string }>): Promise<void> => {
    if (!ctx.state) return

    await ctx.defer()

    const { projectId, buildId } = ctx.state

    await ctx.cloudbuild.approveBuild({
      name: `projects/${projectId}/builds/${buildId}`,
      approvalResult: {
        decision: 'APPROVED',
      },
    })

    await ctx.send(SimpleEmbed(`Build \`\`${buildId}\`\` has been approved.`).setEphemeral(true))
  }
)
