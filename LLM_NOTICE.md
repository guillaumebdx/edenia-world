# LLM Notice - What We Send to OpenAI

> **Last updated:** 2026-01-03

This document describes exactly what data is sent to the LLM (OpenAI) when processing user prompts.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Request                              │
├─────────────────────────────────────────────────────────────────┤
│  Endpoint: https://api.openai.com/v1/chat/completions           │
│  Model: gpt-4o-mini                                             │
│  Temperature: 0.3                                               │
│  Max Tokens: 2000                                               │
├─────────────────────────────────────────────────────────────────┤
│  Messages:                                                      │
│    [0] role: "system"  → System Prompt (see below)              │
│    [1] role: "user"    → User's natural language instruction    │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Prompt Structure

The system prompt is built dynamically by `buildSystemPrompt()` in `src/services/OpenAIService.ts`.

### 1. Role Definition
```
Tu es un générateur de comportements pour des personnages dans un jeu tile-based.
Tu dois répondre UNIQUEMENT avec du JSON valide, sans aucun texte avant ou après.
```

### 2. Available Enums

| Enum | Values | Description |
|------|--------|-------------|
| **IntentType** | `MOVE_TO_TILE`, `MOVE_TO_INTEREST`, `MOVE_TO_CHARACTER`, `MOVE_TO_GROUND` | Type of movement |
| **InterestType** | `TREE`, `WATER`, `ROCK`, `FLOWER` | Object types on map |
| **GroundType** | `GRASS`, `DIRT`, `SAND` | Terrain types |
| **FollowPolicy** | `NEVER`, `WHEN_IDLE` | When to follow a character |
| **PathVariance** | `NONE`, `LOW`, `MEDIUM` | Path randomization |

### 3. Current World State

#### Characters Array
```json
[
  { "id": "c1", "tileX": 5, "tileY": 10, "status": "IDLE" },
  { "id": "c2", "tileX": 12, "tileY": 8, "status": "MOVING" },
  ...
]
```

**Fields sent:**
- `id` - Character identifier
- `tileX`, `tileY` - Current position
- `status` - Current state (IDLE or MOVING)

#### Map Assets
```json
[
  { "x": 10, "y": 8, "type": "TREE" },
  { "x": 25, "y": 15, "type": "WATER" },
  ...
]
```

**Only anchor tiles with type ≠ 0 are included.**

#### Ground Tiles (non-grass only)
```json
[
  { "x": 30, "y": 25, "ground": "SAND" },
  { "x": 35, "y": 28, "ground": "DIRT" },
  ...
]
```

**Grass tiles are excluded to reduce payload size.**

### 4. Strict Rules
```
1. Réponds UNIQUEMENT avec du JSON valide
2. N'invente AUCUN personnage (utilise uniquement les IDs existants)
3. N'invente AUCUN enum (utilise uniquement ceux listés ci-dessus)
4. N'ajoute AUCUN champ supplémentaire
5. Le JSON doit être directement exécutable
6. N'inclus QUE les personnages mentionnés dans la demande
7. Si un seul personnage est mentionné, la réponse ne doit contenir qu'UN SEUL intentUpdate
```

### 5. Expected Response Format
```json
{
  "intentUpdates": [
    {
      "characterId": "c1",
      "intent": {
        "type": "MOVE_TO_INTEREST",
        "interest": "FLOWER",
        "radius": 2,
        "pathVariance": "LOW"
      }
    }
  ]
}
```

### 6. Intent Examples by Type

| Intent Type | Example |
|-------------|---------|
| **MOVE_TO_TILE** | `{ "type": "MOVE_TO_TILE", "target": { "x": 10, "y": 15 }, "pathVariance": "LOW" }` |
| **MOVE_TO_INTEREST** | `{ "type": "MOVE_TO_INTEREST", "interest": "TREE", "radius": 2, "pathVariance": "MEDIUM" }` |
| **MOVE_TO_CHARACTER** | `{ "type": "MOVE_TO_CHARACTER", "targetId": "c1", "radius": 1, "pathVariance": "LOW" }` |
| **MOVE_TO_GROUND** | `{ "type": "MOVE_TO_GROUND", "ground": "SAND", "pathVariance": "NONE" }` |

---

## What We Do NOT Send

- ❌ Character appearance (hair color, etc.)
- ❌ Character paths or movement history
- ❌ Blocked tiles or pathfinding data
- ❌ Previous prompts or conversation history
- ❌ Asset sizes or multi-tile information
- ❌ Animation states

---

## Response Processing

1. **JSON Extraction** - Strip markdown code blocks if present
2. **Structure Validation** - Check `intentUpdates` array exists
3. **Character Validation** - All `characterId` must exist
4. **Enum Validation** - All values must be valid enums
5. **Application** - `applyIntentUpdates()` applies to character states
6. **Execution** - `processIntent()` starts movement (sequential)

---

## File Reference

| File | Role |
|------|------|
| `src/services/OpenAIService.ts` | `buildSystemPrompt()`, `callOpenAI()`, `validateResponse()` |
| `src/data/CharacterState.ts` | `applyIntentUpdates()` |
| `App.tsx` | `handlePromptSend()` orchestration |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-03 | Added rules 6-7: only include mentioned characters in response |
| 2026-01-03 | Initial version |
