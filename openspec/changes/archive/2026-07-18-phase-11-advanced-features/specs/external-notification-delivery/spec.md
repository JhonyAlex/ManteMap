# Delta for External Notification Delivery

## ADDED Requirements

### Requirement: WebhookChannel registered in ChannelRegistry

The system MUST register a `WebhookChannel` adapter implementing `NotificationChannel` in the ChannelRegistry alongside email, slack, teams, and telegram. The webhook channel SHALL POST signed JSON payloads to `WebhookEndpoint` URLs, filtered by endpoint `eventTypes`. Delivery SHALL log to `NotificationDelivery` with `channelType="webhook"`.

#### Scenario: Webhook channel dispatches on alert
- GIVEN a WebhookEndpoint configured with URL `https://hooks.example.com/mantemap` and eventTypes `["STATUS_INCIDENT"]`
- WHEN a STATUS_INCIDENT alert is generated
- THEN `WebhookChannel.send()` POSTs a JSON payload to the URL with `X-ManteMap-Signature` header

#### Scenario: Webhook respects event type filter
- GIVEN a WebhookEndpoint with eventTypes `["DOCUMENT_EXPIRING"]` only
- WHEN a `STATUS_INCIDENT` alert fires
- THEN `WebhookChannel` skips delivery to that endpoint

#### Scenario: Webhook logs delivery to audit
- GIVEN a webhook delivery succeeds with HTTP 200
- WHEN dispatch completes
- THEN a `NotificationDelivery` row is created with `channelType="webhook"` and `status="sent"`

### Requirement: UserChannelConfig extended for webhook

The `UserChannelConfig` model's `channelType` enum MUST include `"webhook"`. The `config` JSON field for webhook type MUST accept `{ webhookEndpointId: string }` referencing a `WebhookEndpoint`.

#### Scenario: User enables webhook channel
- GIVEN a user in a project with a WebhookEndpoint `endp-1`
- WHEN the user configures channel preferences with `channelType="webhook"`, `config={ webhookEndpointId: "endp-1" }`
- THEN the dispatcher routes alerts for that user through the referenced endpoint

## MODIFIED Requirements

### Requirement: Channel Adapters

The system SHALL implement 5 channel adapters conforming to `NotificationChannel { send(alert, user, config): Promise<DeliveryResult> }`:

| Channel | Transport | Config Source | Payload Format |
|---------|-----------|---------------|----------------|
| Email | nodemailer SMTP | `SMTP_*` env vars + `user.email` | HTML body with app link |
| Slack | `fetch` POST webhook | `UserChannelConfig.webhookUrl` | Block Kit JSON |
| Teams | `fetch` POST webhook | `UserChannelConfig.webhookUrl` | MessageCard JSON |
| Telegram | `fetch` POST Bot API | `UserChannelConfig.{botToken, chatId}` | Markdown text |
| Webhook | `fetch` POST with HMAC | `WebhookEndpoint.{url, secret, eventTypes}` | Signed JSON |

(Previously: 4 channel adapters — Email, Slack, Teams, Telegram — no webhook channel)

#### Scenario: Email sends HTML with app link
- GIVEN SMTP configured and user has email preference enabled
- WHEN alert dispatched
- THEN email sent with subject `[ManteMap] {title}`, HTML body, and `{APP_URL}/projects/{id}/alerts` link

#### Scenario: Webhook sends signed JSON payload
- GIVEN valid WebhookEndpoint with secret configured
- WHEN alert dispatched via WebhookChannel
- THEN HTTP POST with `X-ManteMap-Signature` header and JSON body matching the template formatter output
