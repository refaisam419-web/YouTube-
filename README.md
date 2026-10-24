# YouTube skill agents

A set of [Claude Code](https://claude.com/claude-code) subagents and skills for running a YouTube channel. They use the **vidIQ MCP server** for YouTube data and generation.

## Agents (`.claude/agents/`)

| Agent | What it does |
|---|---|
| `youtube-researcher` | Keyword research, outlier videos, trends, competitors → a ranked list of video ideas |
| `youtube-scriptwriter` | Retention-focused long-form and Shorts scripts with B-roll and on-screen text cues |
| `youtube-packaging` | Titles (generated and scored), thumbnail concepts and images, description, tags, chapters |
| `youtube-analyst` | Channel and video analytics, outlier analysis, subscriber insights, earnings estimates |
| `youtube-community-manager` | Comment triage, sentiment, content ideas, reply drafts (never posts) |

Each agent can only use the tools it needs. None of them can upload, edit, or post on YouTube.

## Skills (`.claude/skills/`)

| Skill | Use it for |
|---|---|
| `/youtube-video-plan` | Idea → research → script → packaging, saved to `plans/<slug>.md` |
| `/youtube-channel-audit` | Full channel audit and a 30-day growth plan in `reports/` |
| `/youtube-optimize-video` | Repackaging an underperforming video (changes only after your approval) |
| `/youtube-comment-replies` | Triaging comments and posting replies you approve |

Anything that changes your channel (metadata updates, thumbnails, comment replies) is done by the skill in the main conversation, and only after you approve it.

## Setup

1. Connect the **vidIQ** connector (claude.ai → Settings → Connectors) or add the vidIQ MCP server to Claude Code.
2. Link your YouTube channel in vidIQ. The skills will ask you to authorise if needed.
3. Open this repo in Claude Code and try:
   - `/youtube-video-plan budget home espresso setups`
   - `/youtube-channel-audit`
   - "Use the youtube-researcher agent to find Shorts ideas about personal finance"

## Customising

Edit the Markdown files directly. Each file's frontmatter sets the agent's `name`, `description` (which decides when Claude uses it) and `tools`. The body is its system prompt. Put your channel's voice, niche and audience into the agent prompts to get more on-brand output.
