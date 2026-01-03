# How It Works - LLM Integration

## Overview

Edenia-World is a tile-based game where characters are controlled by **behavior JSON**. The LLM (OpenAI) acts as a **JSON generator** that translates natural language instructions into executable behaviors. The game engine remains 100% data-driven and has no knowledge of the LLM.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Prompt    │ ──▶ │    OpenAI LLM   │ ──▶ │  Behavior JSON  │
│ (natural lang)  │     │ (JSON generator)│     │  (structured)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Game Engine   │
                                                │ (executes JSON) │
                                                └─────────────────┘
```

## What the LLM Receives

### System Prompt

The LLM receives a detailed system prompt containing:

1. **Available Enums** - All valid values the LLM can use
2. **Current World State** - Characters positions, map layout
3. **Strict Rules** - JSON-only output, no invented values
4. **Response Format** - Expected JSON structure with examples

### Enums Provided to LLM

```typescript
// Intent Types (what the character should do)
IntentType:
  - MOVE_TO_TILE      // Go to specific coordinates (x, y)
  - MOVE_TO_INTEREST  // Go to an object type (tree, rock, etc.)
  - MOVE_TO_CHARACTER // Follow another character
  - MOVE_TO_GROUND    // Go to a ground type (grass, sand, etc.)

// Interest Types (objects on the map)
InterestType:
  - TREE
  - WATER
  - ROCK
  - FLOWER

// Ground Types (terrain)
GroundType:
  - GRASS
  - DIRT
  - SAND

// Follow Policy (when to follow a character)
FollowPolicy:
  - NEVER     // Never follow
  - WHEN_IDLE // Follow only when target stops moving

// Path Variance (movement style)
PathVariance:
  - NONE   // Direct path
  - LOW    // Slight variation
  - MEDIUM // More variation
```

### World State Provided

```json
{
  "characters": [
    { "id": "c1", "tileX": 5, "tileY": 5, "status": "IDLE" },
    { "id": "c2", "tileX": 11, "tileY": 6, "status": "MOVING" }
  ],
  "assets": [
    { "x": 10, "y": 8, "type": "TREE" },
    { "x": 20, "y": 15, "type": "WATER" }
  ],
  "groundTiles": [
    { "x": 30, "y": 25, "ground": "SAND" }
  ]
}
```

## What the LLM Returns

The LLM must return **only valid JSON** in this exact format:

```json
{
  "intentUpdates": [
    {
      "characterId": "c2",
      "intent": {
        "type": "MOVE_TO_INTEREST",
        "interest": "FLOWER",
        "radius": 2,
        "pathVariance": "LOW"
      }
    },
    {
      "characterId": "c3",
      "intent": {
        "type": "MOVE_TO_CHARACTER",
        "targetId": "c1",
        "radius": 1,
        "pathVariance": "MEDIUM"
      }
    }
  ]
}
```

### Intent Examples

**MOVE_TO_TILE** - Go to exact position:
```json
{
  "type": "MOVE_TO_TILE",
  "target": { "x": 10, "y": 15 },
  "pathVariance": "LOW"
}
```

**MOVE_TO_INTEREST** - Go near an object type:
```json
{
  "type": "MOVE_TO_INTEREST",
  "interest": "TREE",
  "radius": 2,
  "pathVariance": "MEDIUM"
}
```

**MOVE_TO_CHARACTER** - Follow another character:
```json
{
  "type": "MOVE_TO_CHARACTER",
  "targetId": "c1",
  "radius": 1,
  "pathVariance": "LOW"
}
```

**MOVE_TO_GROUND** - Go to terrain type:
```json
{
  "type": "MOVE_TO_GROUND",
  "ground": "SAND",
  "pathVariance": "NONE"
}
```

## Validation

Before executing, the engine validates the LLM response:

1. **Structure Check** - Must have `intentUpdates` array
2. **Character Check** - All `characterId` must exist
3. **Enum Check** - All values must be valid enums
4. **Target Check** - For `MOVE_TO_CHARACTER`, target must exist

If validation fails, the response is rejected and an error is displayed.

## Execution Flow

```
1. User types: "c2 va voir une fleur et c3 rejoint c1"

2. App builds system prompt with:
   - All enums
   - Current character positions
   - Map data (assets, ground types)

3. OpenAI receives:
   - System prompt (context)
   - User prompt (instruction)

4. OpenAI returns JSON:
   {
     "intentUpdates": [
       { "characterId": "c2", "intent": { "type": "MOVE_TO_INTEREST", "interest": "FLOWER", ... } },
       { "characterId": "c3", "intent": { "type": "MOVE_TO_CHARACTER", "targetId": "c1", ... } }
     ]
   }

5. App validates JSON

6. App applies intents to characters via applyIntentUpdates()

7. Engine processes intents via processIntent()
   - Finds target tile
   - Calculates path (A* pathfinding)
   - Starts movement

8. Game loop updates character positions each frame
```

## Key Files

| File | Role |
|------|------|
| `src/services/OpenAIService.ts` | Builds prompt, calls API, validates response |
| `src/data/CharacterState.ts` | Intent types, enums, `applyIntentUpdates()` |
| `src/systems/CharacterSystem.ts` | `processIntent()`, pathfinding, movement |
| `src/systems/BehaviorSystem.ts` | Event-driven behavior (WHEN_IDLE follow) |
| `src/systems/EventBus.ts` | Event system for character state changes |

## Mock Behaviors

For testing without LLM, mock JSON files are provided:

- `src/data/charactersBehavior.json` - Mock 1
- `src/data/charactersBehavior2.json` - Mock 2

These follow the same structure as LLM responses and can be loaded via Debug buttons.

## Design Principles

1. **Engine is LLM-agnostic** - The engine only knows about JSON behaviors
2. **No parsing heuristics** - LLM output is used as-is or rejected
3. **Strict validation** - Invalid JSON = no execution
4. **Data-driven** - All behavior comes from JSON, not code
5. **Extensible** - New intent types can be added without changing the LLM integration

## Example Prompts

| User Prompt | LLM Interpretation |
|-------------|-------------------|
| "c2 va voir une fleur" | MOVE_TO_INTEREST with interest=FLOWER |
| "tout le monde va dans l'eau" | Multiple MOVE_TO_INTEREST with interest=WATER |
| "c3 suit c1" | MOVE_TO_CHARACTER with targetId=c1 |
| "c5 va en (20, 30)" | MOVE_TO_TILE with target={x:20, y:30} |
| "la moitié va sur le sable" | Multiple MOVE_TO_GROUND with ground=SAND |

---

## Dialog System

En plus du système de mouvement, un **système de dialogue** permet aux personnages de réagir aux ordres reçus.

### Fonctionnement

1. L'utilisateur envoie un ordre de mouvement (ex: "Rejoignez tous c10")
2. L'ordre est stocké comme `lastUserPrompt`
3. L'utilisateur clique sur **Dial** dans la barre de debug
4. Un appel OpenAI génère un dialogue contextuel
5. Les bulles s'affichent séquentiellement au-dessus des personnages
6. Si un personnage qui parle est hors champ, la caméra se déplace vers lui

### Ton des dialogues

- Humour **noir**, cynique, désabusé
- Humour **sec**, pince-sans-rire
- Charriages entre personnages (parfois méchants mais drôles)
- Vraies **conversations** (répliques qui se répondent)
- Fatalisme amusé face à leur condition
- Références détournées à "la voix d'en haut"

### Fichiers du système de dialogue

| Fichier | Rôle |
|---------|------|
| `src/data/charactersIdentity.json` | Identités enrichies (personnalité, style de parole) |
| `src/services/DialogService.ts` | Prompt builder + validation |
| `src/data/DialogState.ts` | Types et état du dialogue |
| `src/systems/DialogSystem.ts` | Orchestration des phases (fade, timing) |
| `src/ui/DialogBubble.tsx` | Composant UI de la bulle |

Voir `DIALOG_SYSTEM.md` pour la documentation complète.
