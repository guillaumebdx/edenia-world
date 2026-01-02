import { CharacterState } from '../data/CharacterState';
import { WorldState } from '../data/WorldState';

// Response type from OpenAI
export type IntentUpdate = {
  characterId: string;
  intent: {
    type: string;
    target?: { x: number; y: number };
    interest?: string;
    targetId?: string;
    radius?: number;
    pathVariance?: string;
    ground?: string;
  };
};

export type OpenAIBehaviorResponse = {
  intentUpdates: IntentUpdate[];
};

// Build the system prompt with all context
export const buildSystemPrompt = (
  characters: CharacterState[],
  world: WorldState
): string => {
  // Build character state summary
  const charactersSummary = characters.map((c) => ({
    id: c.id,
    tileX: c.tileX,
    tileY: c.tileY,
    status: c.status,
  }));

  // Build map summary (ground types and assets)
  const groundTiles: { x: number; y: number; ground: string }[] = [];
  const assets: { x: number; y: number; type: string }[] = [];
  
  const assetTypeNames: Record<number, string> = {
    1: 'TREE',
    2: 'ROCK',
    3: 'FLOWER',
    4: 'WATER',
  };

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const tile = world.tiles[y]?.[x];
      if (tile) {
        if (tile.ground !== 'grass') {
          groundTiles.push({ x, y, ground: tile.ground.toUpperCase() });
        }
        if (tile.isAnchor && tile.type !== 0) {
          const typeName = assetTypeNames[tile.type] || `TYPE_${tile.type}`;
          assets.push({ x, y, type: typeName });
        }
      }
    }
  }

  return `Tu es un générateur de comportements pour des personnages dans un jeu tile-based.
Tu dois répondre UNIQUEMENT avec du JSON valide, sans aucun texte avant ou après.

## Enums autorisés

### IntentType (type de déplacement)
- MOVE_TO_TILE : aller vers une position précise (x, y)
- MOVE_TO_INTEREST : aller vers un type d'objet (TREE, ROCK, FLOWER, WATER)
- MOVE_TO_CHARACTER : suivre un autre personnage
- MOVE_TO_GROUND : aller vers un type de sol (GRASS, DIRT, SAND)

### InterestType (types d'objets)
- TREE
- WATER
- ROCK
- FLOWER

### GroundType (types de sol)
- GRASS
- DIRT
- SAND

### FollowPolicy (politique de suivi)
- NEVER : ne jamais suivre
- WHEN_IDLE : suivre uniquement quand la cible est immobile

### PathVariance (variation du chemin)
- NONE : chemin direct
- LOW : légère variation
- MEDIUM : variation moyenne

## État actuel du monde

### Personnages (${characters.length} total)
${JSON.stringify(charactersSummary, null, 2)}

### Carte (${world.width}x${world.height} tiles)
Objets sur la carte:
${JSON.stringify(assets, null, 2)}

Zones de sol spéciales (hors herbe):
${JSON.stringify(groundTiles, null, 2)}

## Règles strictes
1. Réponds UNIQUEMENT avec du JSON valide
2. N'invente AUCUN personnage (utilise uniquement les IDs existants)
3. N'invente AUCUN enum (utilise uniquement ceux listés ci-dessus)
4. N'ajoute AUCUN champ supplémentaire
5. Le JSON doit être directement exécutable
6. N'inclus QUE les personnages mentionnés dans la demande - les autres gardent leur comportement actuel
7. Si un seul personnage est mentionné, la réponse ne doit contenir qu'UN SEUL intentUpdate

## Format de réponse attendu
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

## Exemples de champs intent selon le type

Pour MOVE_TO_TILE:
{ "type": "MOVE_TO_TILE", "target": { "x": 10, "y": 15 }, "pathVariance": "LOW" }

Pour MOVE_TO_INTEREST:
{ "type": "MOVE_TO_INTEREST", "interest": "TREE", "radius": 2, "pathVariance": "MEDIUM" }

Pour MOVE_TO_CHARACTER:
{ "type": "MOVE_TO_CHARACTER", "targetId": "c1", "radius": 1, "pathVariance": "LOW" }

Pour MOVE_TO_GROUND:
{ "type": "MOVE_TO_GROUND", "ground": "SAND", "pathVariance": "NONE" }`;
};

// Call OpenAI API
export const callOpenAI = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<OpenAIBehaviorResponse> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse JSON response
  let parsed: OpenAIBehaviorResponse;
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    let jsonString = content.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Invalid JSON from OpenAI: ${content}`);
  }

  // Validate structure
  if (!parsed.intentUpdates || !Array.isArray(parsed.intentUpdates)) {
    throw new Error('Invalid response structure: missing intentUpdates array');
  }

  return parsed;
};

// Validate the response against known characters
export const validateResponse = (
  response: OpenAIBehaviorResponse,
  characters: CharacterState[]
): { valid: boolean; error?: string } => {
  const validCharacterIds = new Set(characters.map((c) => c.id));
  const validIntentTypes = ['MOVE_TO_TILE', 'MOVE_TO_INTEREST', 'MOVE_TO_CHARACTER', 'MOVE_TO_GROUND'];
  const validInterestTypes = ['TREE', 'WATER', 'ROCK', 'FLOWER'];
  const validGroundTypes = ['GRASS', 'DIRT', 'SAND'];
  const validPathVariances = ['NONE', 'LOW', 'MEDIUM'];

  for (const update of response.intentUpdates) {
    // Check character exists
    if (!validCharacterIds.has(update.characterId)) {
      return { valid: false, error: `Unknown character: ${update.characterId}` };
    }

    // Check intent type
    if (!validIntentTypes.includes(update.intent.type)) {
      return { valid: false, error: `Invalid intent type: ${update.intent.type}` };
    }

    // Check interest type if present
    if (update.intent.interest && !validInterestTypes.includes(update.intent.interest)) {
      return { valid: false, error: `Invalid interest type: ${update.intent.interest}` };
    }

    // Check ground type if present
    if (update.intent.ground && !validGroundTypes.includes(update.intent.ground)) {
      return { valid: false, error: `Invalid ground type: ${update.intent.ground}` };
    }

    // Check path variance if present
    if (update.intent.pathVariance && !validPathVariances.includes(update.intent.pathVariance)) {
      return { valid: false, error: `Invalid path variance: ${update.intent.pathVariance}` };
    }

    // Check target character exists for MOVE_TO_CHARACTER
    if (update.intent.type === 'MOVE_TO_CHARACTER' && update.intent.targetId) {
      if (!validCharacterIds.has(update.intent.targetId)) {
        return { valid: false, error: `Unknown target character: ${update.intent.targetId}` };
      }
    }
  }

  return { valid: true };
};
