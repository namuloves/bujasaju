# Email capture analytics

The email funnel is sent to both GA4 and Vercel Analytics through
`src/lib/analytics.ts`. Email addresses and other user-provided PII must never
be included in analytics properties.

## Events

| Event | Trigger | Important properties |
| --- | --- | --- |
| `email_gate_viewed` | At least 25% of a capture surface enters the viewport | `capture_source`, `ui_language`, `experiment_variant` |
| `email_form_started` | First interaction with the form | `capture_source`, `ui_language`, `experiment_variant` |
| `sign_up` | The backend persists a new email address | `method`, `capture_source`, `ui_language`, `experiment_variant`, `subscriber_status` |
| `email_signup_repeated` | The backend accepts an address already on the list | `method`, `capture_source`, `ui_language`, `experiment_variant`, `subscriber_status` |
| `email_signup_failed` | Validation, request, or storage failure | Context above plus `failure_reason` and optional `http_status` |

`capture_source` values are `unlock-gate`, `profile-wall`, and
`match-results`. The current `experiment_variant` is `baseline`.

## GA4 property setup

In GA4 Admin for measurement ID `G-75TZ2JD6DS`:

1. Under **Data display → Events**, create or select `sign_up` and mark it as a
   key event. Use **Once per event** counting so each newly persisted address is
   counted.
2. Under **Data display → Custom definitions**, create these event-scoped
   dimensions:

   | Dimension name | Event parameter |
   | --- | --- |
   | Email capture source | `capture_source` |
   | Email UI language | `ui_language` |
   | Email experiment variant | `experiment_variant` |
   | Subscriber status | `subscriber_status` |
   | Email failure reason | `failure_reason` |

3. Validate `email_gate_viewed`, `email_form_started`, and `sign_up` in
   Realtime or DebugView after deployment. Custom dimensions can take 24–48
   hours to become available in standard reports.

The primary conversion rate is `sign_up / email_gate_viewed`, segmented by
`capture_source` and `experiment_variant`. Upstash remains the source of truth
for the unique subscriber count.
