# INTERVOX

**Talk to Anyone.** Voice-controlled OSINT platform that scrapes public information about a person and creates an AI persona you can have a voice conversation with.

Built with **Prompt-Driven Development (PDD)** - prompts are the source of truth, code is regenerable.

## What It Does

1. **Enter a name** - "Elon Musk", "Sam Altman", anyone public
2. **Confirm identity** - We disambiguate between people with the same name
3. **We scrape everything** - LinkedIn, Twitter, Wikipedia, news, YouTube, podcasts, GitHub
4. **Build a persona** - AI analyzes personality, opinions, and speaking style
5. **Voice conversation** - Talk to their digital twin with natural voice

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Anthropic Claude** - Orchestration, data analysis, persona building
- **xAI Grok** - Voice persona responses (better personality)
- **ElevenLabs** - Text-to-speech
- **rtrvr.ai** - Web scraping
- **Toolhouse.ai** - Agent orchestration
- **Tailwind CSS** - Palantir-inspired dark UI

## Quick Start

```bash
# Clone the repo
git clone https://github.com/fluxnodeai/intervox.git
cd intervox

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your API keys in .env

# Run development server
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create a `.env` file with:

```env
ANTHROPIC_API_KEY=     # Claude API - https://console.anthropic.com
XAI_API_KEY=           # Grok API - https://console.x.ai
ELEVENLABS_API_KEY=    # Voice - https://elevenlabs.io
TOOLHOUSE_API_KEY=     # Agent tools - https://app.toolhouse.ai
RTRVR_API_KEY=         # Scraping - https://rtrvr.ai
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERVOX                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   UI     │───▶│ Orchestrator │───▶│  Scraper Swarm  │   │
│  │ (Next.js)│    │  (Anthropic) │    │   (rtrvr.ai)    │   │
│  └──────────┘    └──────────────┘    └─────────────────┘   │
│       │                 │                     │             │
│       │                 ▼                     │             │
│       │         ┌──────────────┐              │             │
│       │         │Persona Engine│◀─────────────┘             │
│       │         │  (Anthropic) │                            │
│       │         └──────────────┘                            │
│       │                 │                                   │
│       ▼                 ▼                                   │
│  ┌──────────────────────────────────┐                      │
│  │        Voice Interface           │                      │
│  │  ┌────────────┐  ┌────────────┐  │                      │
│  │  │    Grok    │  │ ElevenLabs │  │                      │
│  │  │ (Responses)│  │   (Voice)  │  │                      │
│  │  └────────────┘  └────────────┘  │                      │
│  └──────────────────────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Prompt-Driven Development (PDD)

This project follows PDD principles where **prompts are the source of truth** and code is a regenerable artifact.

### Prompt Files (`/prompts`)

| Prompt | Generated Code | Purpose |
|--------|---------------|---------|
| `orchestrator.prompt` | `/modules/orchestrator/src/index.ts` | Investigation pipeline |
| `scraper-swarm.prompt` | `/modules/scraper-swarm/src/index.ts` | Web scraping |
| `persona-engine.prompt` | `/modules/persona-engine/src/index.ts` | Personality synthesis |
| `voice-interface.prompt` | `/modules/voice-interface/src/index.ts` | Voice conversation |
| `ui-dashboard.prompt` | `/app/**/*.tsx` | React UI components |
| `shared-types.prompt` | `/shared/types/index.ts` | TypeScript interfaces |
| `shared-config.prompt` | `/shared/config/index.ts` | Configuration |

### Regeneration Workflow

```bash
# 1. Modify the prompt
nano prompts/orchestrator.prompt

# 2. Regenerate code from prompt
# Feed prompt to Claude Code or your AI tool

# 3. Validate
npm run typecheck
npm test
```

### PDD Principles Applied

1. **Prompts as Source of Truth** - All specifications in `/prompts`
2. **Regenerative Development** - Code fully regenerable from prompts
3. **Test Accumulation** - Tests validate regenerated code
4. **Synchronization** - Prompts, code, and tests stay in sync

## Modules

- **`/modules/orchestrator`** - Central coordinator for investigation pipeline
- **`/modules/scraper-swarm`** - Multi-source web scraping with rtrvr.ai
- **`/modules/persona-engine`** - Personality synthesis and system prompt generation
- **`/modules/voice-interface`** - Grok for responses, ElevenLabs for TTS

## API Routes

- `POST /api/investigate` - Start new investigation
- `POST /api/confirm` - Confirm identity selection
- `GET /api/status/[targetId]` - Get investigation status
- `POST /api/chat` - Send message to persona
- `POST /api/tts` - Text-to-speech conversion

## Security

- All API keys in `.env` (never committed)
- Pre-commit hook runs security checks
- No hardcoded secrets anywhere

```bash
# Run security check manually
./scripts/security-check.sh
```

## Hackathon Submission

Built for the **Get Funded @Prompt Driven Development Hackathon**.

### Scoring Criteria Met

- **Innovation & Originality (25pts)** - Novel voice + OSINT + persona concept
- **Technical Implementation (25pts)** - Full PDD methodology with prompts as source of truth
- **Investment Potential (25pts)** - Clear market for competitive intelligence
- **Presentation & Demo (15pts)** - Live voice conversation demo
- **Use of PDD Principles (10pts)** - Prompts, regeneration, test accumulation

### Sponsor Technologies Used

- **rtrvr.ai** - Web scraping infrastructure
- **Toolhouse.ai** - Agent orchestration
- **ElevenLabs** - Voice synthesis
- **Anthropic Claude** - AI orchestration

## License

MIT

---

Built for hackathon. Ship fast, talk to anyone.
