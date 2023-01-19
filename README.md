# Cloud Build Discord Notifier

An interactions based Discord bot that listens for Pub/Sub events from Cloud Build and sends them to a configured set of webhooks. Allows for builds to be approved/denied, cancelled & retried. 

**There are no built-in permission checks on these actions, so use Discord's settings to restrict the bot to a private server/channels.**

For easiest usage, Workload Identity to allow the bot to authenticate with GCP APIs. A service account key can also be provided, but this is not recommended.

If you don't want to configure detailed permissions, the easiest preset roles are:
 - `roles/pubsub.subscriber`
 - `roles/cloudbuild.builds.approver`
 - `roles/cloudbuild.builds.editor`

Configuration is passed through environment variables or a `.env` file, and requires the following keys:

```
# Webserver Port
PORT=3000

# Discord Creds
DISCORD_CLIENT_ID=123456789123456789
DISCORD_PUBKEY=8768788987ad9e89876f978679de990a0008769696969
DISCORD_TOKEN=BAAAAAAAAAA.BAAA.BAAAAAAAAAAAAAAA

# Internal SQLite DB
DB_PATH=/data/db.sqlite

# Optional GCP Service Account Key
GCLOUD_AUTH_FILE=gcloud-auth.json
```
