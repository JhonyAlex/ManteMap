# Webhooks Specification

## Purpose

Extend the NotificationDispatcher to deliver signed JSON payloads to external HTTP endpoints via a WebhookChannel, enabling ERP/ticketing/CMDB integration.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| WH-001 | WebhookChannel registered in ChannelRegistry | MUST |
| WH-002 | HMAC-SHA256 payload signing | MUST |
| WH-003 | Per-endpoint event type filtering | MUST |
| WH-004 | Delivery audit via NotificationDelivery | MUST |
| WH-005 | WebhookEndpoint model for configuration | MUST |
| WH-006 | Failed delivery isolation | MUST |

### Requirement: WebhookChannel in dispatcher (WH-001)

The system MUST register a `WebhookChannel` implementing `NotificationChannel`. The channel SHALL be registered in `ChannelRegistry` alongside existing email/slack/teams/telegram channels. On dispatch, it SHALL POST a JSON payload to the configured URL.

#### Scenario: Webhook fires on alert dispatch
- GIVEN a user with webhook channel enabled for `STATUS_INCIDENT`
- WHEN an incident-status alert is generated
- THEN an HTTP POST is sent to the configured webhook URL with a signed JSON body

### Requirement: HMAC-SHA256 payload signing (WH-002)

Every webhook POST MUST include an `X-ManteMap-Signature` header containing the HMAC-SHA256 hex digest of the JSON body, computed with the endpoint's secret. The signature SHALL use the format `sha256={hexDigest}`.

#### Scenario: Valid signature delivered
- GIVEN a webhook endpoint with secret `sk_test_abc123`
- WHEN a payload `{"type":"STATUS_INCIDENT","item":"Pump A"}` is dispatched
- THEN `X-ManteMap-Signature: sha256=a1b2c3...` header is included

#### Scenario: Missing secret skips signing
- GIVEN a webhook endpoint with no secret configured
- WHEN dispatch occurs
- THEN no `X-ManteMap-Signature` header is sent

### Requirement: Per-endpoint event filtering (WH-003)

Each `WebhookEndpoint` MUST expose `eventTypes: string[]` controlling which alert types trigger delivery. Unmatched event types SHALL be skipped.

#### Scenario: Filtered event not delivered
- GIVEN endpoint configured with `eventTypes: ["DOCUMENT_EXPIRING"]`
- WHEN a `STATUS_INCIDENT` alert is generated
- THEN no POST is sent to that endpoint

### Requirement: Delivery audit (WH-004)

Every webhook delivery attempt MUST log to `NotificationDelivery` with `channelType="webhook"`, `status` as `"sent"` or `"failed"`, and `errorMessage` on failure.

#### Scenario: Failed delivery logged
- GIVEN webhook URL `https://broken.example.com` is unreachable
- WHEN dispatch attempt times out
- THEN a `NotificationDelivery` row is created with `status="failed"` and error details

### Requirement: WebhookEndpoint model (WH-005)

The system MUST provide a `WebhookEndpoint` model with fields: `id`, `projectId`, `name`, `url`, `secret` (encrypted at rest), `eventTypes`, `active`, `retryCount` (default 3), `createdAt`. Each endpoint MUST belong to a project. Secret MUST be excluded from all API responses and logs.

#### Scenario: Secret excluded from response
- GIVEN an endpoint with secret configured
- WHEN the endpoint config is fetched via API
- THEN the response excludes the `secret` field

### Requirement: Failed delivery isolation (WH-006)

A webhook delivery failure MUST NOT block other channels. The dispatcher SHALL catch webhook errors and log them without rethrowing.

#### Scenario: Webhook fails but email succeeds
- GIVEN a user with both webhook and email channels enabled
- WHEN webhook URL returns 500 but SMTP is healthy
- THEN email is delivered successfully; webhook failure is logged independently
