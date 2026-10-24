---
name: youtube-comment-replies
description: Review comments on YouTube videos and reply in the creator's voice, with approval before anything is posted. Use when the user wants to answer, triage or summarise their YouTube comments.
---

# Comment replies

## Steps

1. Launch the `youtube-community-manager` agent with the video ID(s), or ask it to cover the latest uploads.
2. Show the user the sentiment summary, the content ideas, and the table of reply drafts.
3. Let the user approve, edit or skip each draft. Treat "approve all" as approval only for the drafts shown.
4. For approved replies only: check posting permission with `vidiq_comment_reply_permission` (connect the channel with `vidiq_connect_youtube_channel` if needed), then post each reply with `vidiq_reply_to_comment`.
5. Report what was posted, what was skipped, and any failures.

Never post a reply the user hasn't approved.
