# INTERVOX

**Talk to Anyone.** Voice-controlled OSINT platform that scrapes public information about a person and creates an AI persona you can have a voice conversation with.

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

## License

MIT

---

Built for hackathon. Ship fast, ask questions later.
