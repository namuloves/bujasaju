# UTM tagging conventions

Every inbound link that bujasaju.com does not control must carry UTM
parameters. Without them GA4 collapses the traffic into `(direct) / (none)`
and the channel that produced a visit becomes unrecoverable — retroactively
un-fixable, which is why this has to be settled before any marketing starts.

GA4 reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and
`utm_term` automatically. No code change is required to start using them.

## Rules

1. **Lowercase everything.** GA4 is case-sensitive: `Naver` and `naver` become
   two separate rows that never reconcile.
2. **Hyphens, never spaces or underscores** in campaign names.
3. **Never tag an internal link.** A UTM on a bujasaju → bujasaju link restarts
   the session and destroys the original attribution. Tag only links that live
   somewhere else.
4. **`utm_medium` is the important one.** It decides GA4's Default Channel
   Group. Use only the values in the table below — an invented medium lands in
   "Unassigned" and is invisible in every channel report.
5. **`utm_source` is where the click physically happened**, not the company.
   A link in a Naver blog post is `naver-blog`, not `naver`.

## Taxonomy

| Channel | `utm_source` | `utm_medium` |
| --- | --- | --- |
| Naver blog post | `naver-blog` | `social` |
| Naver cafe post | `naver-cafe` | `social` |
| Naver paid search | `naver` | `cpc` |
| KakaoTalk share / open chat | `kakao` | `social` |
| Instagram bio link | `instagram` | `social` |
| Instagram story / post | `instagram` | `social` |
| Threads | `threads` | `social` |
| X / Twitter | `x` | `social` |
| Reddit | `reddit` | `social` |
| YouTube description | `youtube` | `social` |
| Newsletter (Resend) | `newsletter` | `email` |
| Google Ads | `google` | `cpc` |
| A blog or press mention | *their domain* | `referral` |

Organic search needs no tagging — GA4 detects it. Never tag a link you expect
Google or Naver to crawl, or the UTM leaks into the search index.

## Campaign naming

```
utm_campaign = <yyyy-mm>-<short-topic>
```

Examples: `2026-09-launch`, `2026-09-ilju-quiz`, `2026-10-new-billionaires`.

The date prefix sorts chronologically in GA4's table and prevents a campaign
name from being silently reused across two different pushes.

Use `utm_content` only to distinguish two variants of the same campaign
(`carousel` vs `single`, `subject-a` vs `subject-b`). Leave `utm_term` alone
unless running paid search.

## Examples

```
https://bujasaju.com/?utm_source=naver-blog&utm_medium=social&utm_campaign=2026-09-ilju-quiz

https://bujasaju.com/profile/1234?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-new-billionaires&utm_content=subject-a

https://bujasaju.com/?utm_source=instagram&utm_medium=social&utm_campaign=2026-09-launch&utm_content=carousel
```

## Where to read the result

GA4 → **Reports → Acquisition → Traffic acquisition**, then switch the primary
dimension to *Session source / medium* or *Session campaign*.

Cross this with the email funnel in `docs/email-capture-analytics.md`: the
number that matters per channel is `sign_up / email_gate_viewed`, not sessions.
A channel that sends 500 visitors who never reach a gate is worth less than one
that sends 50 who convert.

## Gotchas

- **Kakao and Instagram in-app browsers** open links in a webview with its own
  cookie jar. A visitor who later returns in Safari counts as a new user, so
  in-app social traffic will look worse on returning-visitor metrics than it is.
- **Share buttons** (`src/components/match/ShareButtons.tsx`) currently share
  the bare URL. Appending `utm_source=kakao&utm_medium=social&utm_campaign=user-share`
  to the shared link would separate viral traffic from everything else. The
  `share_click` event already records the outgoing side of this.
- **Resend links** must be tagged by hand — nothing adds UTMs automatically.
- A UTM'd URL that gets indexed creates a duplicate-content variant. Canonical
  tags handle this, but avoid tagging links on crawlable public pages.
