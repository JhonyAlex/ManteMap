# Channel Configuration Specification

## Purpose

Per-user credential storage and management for Slack, Teams, and Telegram notification channels. Email uses `user.email` + SMTP environment variables (no config entry).

## Requirements

### Requirement: UserChannelConfig Model

The system SHALL store per-user per-channel-type credentials via `UserChannelConfig`:

| Field | Type | Description |
|-------|------|-------------|
| userId | FK | Owning user |
| channelType | String | `"slack"`, `"teams"`, or `"telegram"` |
| config | Json | Channel-specific credentials (see below) |
| enabled | Boolean | Whether this config is active (default: true) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

`@@unique([userId, channelType])` — one config per user per channel type.

| Channel | `config` Shape |
|---------|---------------|
| Slack | `{ "webhookUrl": "https://hooks.slack.com/services/..." }` |
| Teams | `{ "webhookUrl": "https://{tenant}.webhook.office.com/..." }` |
| Telegram | `{ "botToken": "123456:ABC-DEF...", "chatId": "123456789" }` |

#### Scenario: User saves Slack webhook
- GIVEN no existing Slack config for user
- WHEN PUT with valid webhookUrl
- THEN config persisted with `enabled=true`, GET returns the config

#### Scenario: User updates Telegram config
- GIVEN existing Telegram config with old botToken
- WHEN PUT with new botToken and chatId
- THEN config updated atomically; old values replaced

#### Scenario: User deletes channel config
- GIVEN existing Teams config
- WHEN DELETE for user+teams channel type
- THEN config removed; subsequent GET returns `{ "configured": false }`

### Requirement: Channel Config CRUD API

Routes under `/api/projects/{projectId}/notification-channels`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notification-channels?type={channelType}` | Get config for current user and channel type |
| PUT | `/notification-channels` | Upsert config (body: `{ channelType, config }`) |
| DELETE | `/notification-channels?type={channelType}` | Remove config |
| GET | `/notification-channels` | List all configured channels for current user |

All routes SHALL enforce project membership. Config is scoped to the authenticated user — each user manages their own channels.

#### Scenario: GET returns unconfigured state
- GIVEN user has no Slack config
- WHEN GET `/notification-channels?type=slack`
- THEN response is `{ "configured": false, "config": null }`

#### Scenario: List returns only configured channels
- GIVEN user has Slack and Telegram configured
- WHEN GET `/notification-channels`
- THEN response is `[ { channelType: "slack", ... }, { channelType: "telegram", ... } ]`

### Requirement: Test Connectivity Endpoint

POST `/api/projects/{projectId}/notification-channels/test` SHALL send a test message using the stored config. Request body: `{ channelType: string }`. Response: `{ success: boolean, error?: string }`.

#### Scenario: Test button verifies Slack webhook
- GIVEN valid Slack webhook URL saved for user
- WHEN POST test with `channelType="slack"`
- THEN test message posted to Slack; response `{ success: true }`

#### Scenario: Test fails with invalid webhook
- GIVEN invalid Teams webhook URL saved
- WHEN POST test with `channelType="teams"`
- THEN HTTP POST to webhook fails; response `{ success: false, error: "Teams webhook returned 404" }`

#### Scenario: Test fails when channel not configured
- GIVEN user has no Telegram config
- WHEN POST test with `channelType="telegram"`
- THEN response `{ success: false, error: "Channel not configured" }`

### Requirement: Channel Config UI

The system SHALL provide a `ChannelConfigForm` component per channel type with: webhook URL / bot token input fields, save button, test button, and enabled/disabled toggle.

#### Scenario: User configures Slack via UI
- GIVEN ChannelConfigForm for Slack rendered
- WHEN user enters webhook URL and clicks Save
- THEN config persisted via PUT API; success toast shown

#### Scenario: Test button sends and shows result
- GIVEN Slack webhook URL saved in form
- WHEN user clicks "Test"
- THEN test message sent; success or error toast shown based on response
