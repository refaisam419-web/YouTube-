---
name: youtube-channel-audit
description: Audit a YouTube channel's performance and produce a prioritised growth plan. Use when the user asks how their channel is doing, why views dropped, or what to do next to grow.
---

# YouTube channel audit

## Steps

1. Launch these agents in parallel:
   - `youtube-analyst`: full audit for the requested period (default: last 90 days vs. the 90 days before)
   - `youtube-community-manager`: themes and content requests from comments on the last 5–10 uploads (summary only, no reply drafts)
   - `youtube-researcher`: 5 new video opportunities in the channel's niche, measured against the channel's own baseline
2. Combine the results into `reports/channel-audit-<YYYY-MM-DD>.md`:
   - Summary (5 bullets)
   - Metrics this period vs. the previous one
   - What's working and what isn't
   - What the audience is asking for
   - Next 5 videos to make
   - 30-day action plan, in priority order
3. Give the user the summary and the report path.
