# Delta for Alert Management

## ADDED Requirements

### Requirement: Post-Scan Notification Dispatch

POST `/alerts/scan` SHALL call `notificationDispatcher.dispatchForProject(projectId)` after alert generation completes. The dispatch call MUST be fire-and-forget (`void`) — scan response MUST NOT wait for delivery. The scan response SHALL return alert counts as before; dispatch outcome is observable only via `NotificationDelivery` log.

#### Scenario: Scan triggers email for expiring documents
- GIVEN a project member with `email=true` for `DOCUMENT_EXPIRING`
- WHEN scan generates 3 expiration alerts
- THEN dispatcher sends 3 emails; scan returns `{ total: 3 }` without blocking

#### Scenario: Scan with zero alerts skips dispatch
- GIVEN no documents expiring and no upcoming events
- WHEN scan runs
- THEN `dispatchForProject` is not called; scan returns `{ total: 0 }`

### Requirement: Service Hook Dispatch

Item status transition hooks SHALL call `dispatcher.dispatch(alert)` after `generateAlert()`. Document service hooks SHALL call `dispatcher.dispatch(alert)` after `generateAlert()`. Alert generation logic itself SHALL NOT change — dispatch is additive.

#### Scenario: Status transition triggers Slack notification
- GIVEN a member with `slack=true` for `STATUS_INCIDENT` and Slack webhook configured
- WHEN an item transitions to incident status
- THEN `generateAlert()` creates alert; `dispatcher.dispatch(alert)` sends Slack message; delivery logged

#### Scenario: Dispatch failure does not block status transition
- GIVEN SMTP is down
- WHEN an item transitions to blocking status
- THEN alert generated and persisted normally; email dispatch logs `"failed"`; item status transition returns success

#### Scenario: Document update triggers notification
- GIVEN a member with `telegram=true` for `DOCUMENT_EXPIRING` and Telegram configured
- WHEN a document's expiry metadata is updated generating an alert
- THEN `generateAlert()` runs; `dispatcher.dispatch(alert)` sends Telegram message

### Requirement: No Duplicate Delivery

The dispatcher SHALL check `NotificationDelivery` for existing `"sent"` entries matching `alertId + userId + channelType` before delivering. If found, the dispatch SHALL be skipped.

#### Scenario: Re-scan skips already-delivered notifications
- GIVEN delivery already logged as `"sent"` for alert+user+channel
- WHEN scan runs again generating the same alert
- THEN dispatcher skips that user+channel combination; delivery log not duplicated

## MODIFIED Requirements

### Requirement: Alert Scan Endpoint

POST `/alerts/scan` SHALL generate alerts for: documents expiring within 30/14/7/1 days, and upcoming recurring events within 7 days. After generation, SHALL trigger external notification dispatch as fire-and-forget (`void`). MUST return count of generated/updated alerts.
(Previously: Scan only generated alerts without external notification dispatch.)

#### Scenario: Scan generates expiration alerts
- GIVEN documents expiring in 14 and 3 days
- WHEN scan is triggered
- THEN alerts are generated/updated for both documents
