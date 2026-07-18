# External Notification Delivery Specification

## Purpose

Routes alerts to email, Slack, Teams, Telegram, and Webhook via a central dispatcher with channel adapters and audit logging.

## Requirements

### Requirement: NotificationDispatcher Service

The system SHALL provide a `NotificationDispatcher` that queries project members with channel preferences after alert generation and delegates delivery to channel adapters. Dispatch MUST be fire-and-forget (`void`); failures MUST NOT propagate to callers.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Scan triggers dispatch | Project has 3 members with email enabled for `DOCUMENT_EXPIRING` | Scan generates an alert | Dispatcher queries matching members, sends email to each, logs deliveries |
| No matching preferences | No member has any channel enabled for alert type | Alert is generated | Dispatcher logs zero deliveries, returns without error |
| Channel fails delivery | Slack webhook returns HTTP 500 | Dispatcher sends via SlackChannel | Delivery logged as `"failed"` with error; other channels proceed unaffected |
| Duplicate prevention | Delivery exists for same alert+user+channel | Same alert dispatched again | Dispatcher skips, no duplicate sent |

### Requirement: Channel Adapters

The system SHALL implement 5 channel adapters conforming to `NotificationChannel { send(alert, user, config): Promise<DeliveryResult> }`:

| Channel | Transport | Config Source | Payload Format |
|---------|-----------|---------------|----------------|
| Email | nodemailer SMTP | `SMTP_*` env vars + `user.email` | HTML body with app link |
| Slack | `fetch` POST webhook | `UserChannelConfig.webhookUrl` | Block Kit JSON |
| Teams | `fetch` POST webhook | `UserChannelConfig.webhookUrl` | MessageCard JSON |
| Telegram | `fetch` POST Bot API | `UserChannelConfig.{botToken, chatId}` | Markdown text |
| Webhook | `fetch` POST with HMAC | `WebhookEndpoint.{url, secret, eventTypes}` | Signed JSON |

#### Scenario: Email sends HTML with app link
- GIVEN SMTP configured and user has email preference enabled
- WHEN alert dispatched
- THEN email sent with subject `[ManteMap] {title}`, HTML body, and `{APP_URL}/projects/{id}/alerts` link

#### Scenario: Slack sends Block Kit message
- GIVEN valid Slack webhook URL in UserChannelConfig
- WHEN alert dispatched
- THEN HTTP POST with `header`, `section` (fields), and `actions` (button) blocks

#### Scenario: Telegram sends markdown text
- GIVEN valid botToken and chatId configured
- WHEN alert dispatched
- THEN HTTP POST to `api.telegram.org/bot{token}/sendMessage` with `parse_mode=Markdown`

#### Scenario: Webhook sends signed JSON payload
- GIVEN valid WebhookEndpoint with secret configured
- WHEN alert dispatched via WebhookChannel
- THEN HTTP POST with `X-ManteMap-Signature` header and JSON body matching the template formatter output

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

### Requirement: NotificationDelivery Audit Log

The system SHALL log every delivery attempt in `NotificationDelivery`:

| Field | Type | Description |
|-------|------|-------------|
| alertId | FK | The originating alert |
| userId | FK | Target user |
| channelType | String | `"email"`, `"slack"`, `"teams"`, `"telegram"`, or `"webhook"` |
| status | String | `"sent"`, `"failed"`, or `"skipped"` |
| errorMessage | String? | Failure reason if status is `"failed"` |
| deliveredAt | DateTime | Timestamp of attempt |

`@@index([alertId])`, `@@index([userId])`, `@@index([status])`.

#### Scenario: Successful delivery logged
- GIVEN email channel sends successfully
- WHEN dispatch completes
- THEN `NotificationDelivery` row created with `status="sent"`

#### Scenario: Failed delivery logged
- GIVEN SMTP connection refused
- WHEN email dispatch fails
- THEN row created with `status="failed"` and `errorMessage` containing the error

### Requirement: Template Formatters per AlertType

The system SHALL provide formatter functions per `AlertType` returning channel-specific message structures:

| AlertType | Formatter Returns |
|-----------|-------------------|
| `DOCUMENT_EXPIRING` | Document name, project name, days until expiry, app link |
| `STATUS_INCIDENT` | Item name, new status, project name, app link |
| `STATUS_BLOCKING` | Item name, blocking status, project name, app link |
| `STATUS_FINAL` | Item name, final status reached, project name, app link |
| `EVENT_UPCOMING` | Event name, date, project name, app link |

Each formatter SHALL return `{ email: {subject, html}, slack: {blocks}, teams: MessageCard, telegram: {text}, webhook: {event, timestamp, alert, project, appUrl} }`.

#### Scenario: DOCUMENT_EXPIRING formatter includes expiry context
- GIVEN alert with `metadata: { daysUntilExpiry: 7, documentName: "Permit.pdf" }`
- WHEN formatter invoked
- THEN email subject includes document name, HTML body includes expiry date and app link

### Requirement: Parallel Dispatch with Timeout

The dispatcher SHALL use `Promise.allSettled` for parallel channel delivery with a per-channel timeout of 10 seconds.

#### Scenario: Slow channel does not block others
- GIVEN Slack webhook takes 8s to respond and Telegram responds in 2s
- WHEN dispatcher sends to both
- THEN both settle independently; Telegram delivery logged before Slack timeout expires
