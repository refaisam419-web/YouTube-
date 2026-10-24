---
name: youtube-optimize-video
description: Improve an existing YouTube video's title, thumbnail, description and tags to raise its click-through rate and search traffic. Use when the user gives a video (URL or ID) that is underperforming or asks to optimise or repackage it.
---

# Optimise an existing video

## Steps

1. Get the video ID from the URL or the user's message. If none was given, list recent uploads with `vidiq_user_videos` and ask which one.
2. Launch these in parallel:
   - `youtube-analyst`: how this video is performing against the channel median, plus its change history
   - `youtube-packaging`: new titles, thumbnail concepts, description and tags. Give it the current metadata and the transcript.
3. Show a **before and after** table (title, description start, tags, thumbnail concept) with the reasoning and scores.
4. **Ask the user before making changes.** Only after explicit approval:
   - update the metadata with `vidiq_update_video`
   - update the thumbnail with `vidiq_update_video_thumbnail` (only if an image was generated and approved)
5. Suggest checking CTR again in 48–72 hours, and change one variable at a time if possible.
