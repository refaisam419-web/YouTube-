---
name: youtube-video-plan
description: Plan a YouTube video from idea to upload-ready package (research, script, titles, thumbnail, description, tags). Use when the user wants to plan, make, or brainstorm a new YouTube video or Short.
---

# YouTube video plan

Builds a complete video plan by running the YouTube subagents in sequence.

## Steps

1. **Brief.** Get the topic or niche, format (long-form or Short), target length, and audience from the user's request. Use defaults for anything missing (long-form, 8–12 min) and say which defaults you picked.
2. **Research.** Launch the `youtube-researcher` agent with the brief. If the user already chose a specific topic, ask it only to validate the topic and pick the best angle and keyword.
3. **Pick.** Show the shortlist and go with the top pick unless the user chose a different one.
4. **Script and packaging in parallel.** Launch both in the same turn:
   - `youtube-scriptwriter` with the chosen angle, keyword, audience and length
   - `youtube-packaging` with the angle, keyword and the core promise of the video
5. **Assemble** the result into `plans/<slug>.md` with these sections:
   - Idea and evidence
   - Titles (top 3 with scores, recommended pick)
   - Thumbnail concepts
   - Script
   - Description, tags, chapters
   - Pre-publish checklist (end screen, cards, pinned comment, playlist, upload time)
6. Give the user a short summary and the file path.

Don't upload or publish anything unless the user explicitly asks.
