# INTERVOX Prompt Specifications

This directory contains the Prompt-Driven Development (PDD) specifications for INTERVOX.

## What is PDD?

Prompt-Driven Development treats **prompts as the source of truth** and code as a regenerable artifact. Instead of patching code incrementally, you modify prompts and regenerate.

## Module Prompts

| Prompt File | Generated Code | Purpose |
|-------------|---------------|---------|
| `orchestrator.prompt` | `/modules/orchestrator/src/index.ts` | Investigation pipeline coordinator |
| `scraper-swarm.prompt` | `/modules/scraper-swarm/src/index.ts` | Multi-source web scraping |
| `persona-engine.prompt` | `/modules/persona-engine/src/index.ts` | Personality synthesis |
| `voice-interface.prompt` | `/modules/voice-interface/src/index.ts` | Grok + ElevenLabs voice |
| `ui-dashboard.prompt` | `/app/**/*.tsx` | Palantir-style UI |
| `shared-types.prompt` | `/shared/types/index.ts` | TypeScript interfaces |
| `shared-config.prompt` | `/shared/config/index.ts` | Environment config |

## Regeneration Workflow

To regenerate a module from its prompt:

1. Modify the `.prompt` file with your changes
2. Feed the prompt to Claude/GPT/your AI
3. Replace the generated code file
4. Run tests to validate

```bash
# Example: Regenerate orchestrator
cat prompts/orchestrator.prompt | claude-code "Generate the TypeScript implementation"
# Review and replace modules/orchestrator/src/index.ts
npm run typecheck
npm test
```

## PDD Principles Applied

1. **Prompts as Source of Truth** - All module specifications live in `/prompts`
2. **Regenerative Development** - Code can be fully regenerated from prompts
3. **Test Accumulation** - Tests validate regenerated code works correctly
4. **Synchronization** - Prompts, code, and tests stay in sync

## Adding New Modules

1. Create `prompts/new-module.prompt` with full specification
2. Generate code from prompt
3. Add tests in `modules/new-module/tests/`
4. Update this README
