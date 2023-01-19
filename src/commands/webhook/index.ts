import {
  AllowedChannelTypes,
  CommandGroupBuilder,
  PermissionBits,
  SlashCommandChannelOption,
  SubcommandOption,
} from '@discord-interactions/builders'
import { ICommandGroup, ISubcommandHandlers } from '@discord-interactions/core'
import { createWebhook } from './Create.js'
import { removeWebhook } from './Remove.js'
import { viewWebhooks } from './View.js'

export class Webhook implements ICommandGroup {
  builder: CommandGroupBuilder = new CommandGroupBuilder('webhook', 'View and manage your build webhooks.')
    .addRequiredPermissions(PermissionBits.ADMINISTRATOR)
    .setDMEnabled(false)
    .addSubcommands(
      new SubcommandOption('create', 'Create a new webhook.').addChannelOption(
        new SlashCommandChannelOption('channel', 'The channel to create the webhook in.').addChannelTypes(
          AllowedChannelTypes[0]
        )
      ),
      new SubcommandOption('remove', 'Remove an existing webhook.').addChannelOption(
        new SlashCommandChannelOption('channel', 'The channel to remove the webhook from.').addChannelTypes(
          AllowedChannelTypes[0]
        )
      ),
      new SubcommandOption('view', 'View all configured webhooks.')
    )

  handlers: ISubcommandHandlers = {
    create: {
      handler: createWebhook,
    },
    delete: {
      handler: removeWebhook,
    },
    view: {
      handler: viewWebhooks,
    },
  }
}
