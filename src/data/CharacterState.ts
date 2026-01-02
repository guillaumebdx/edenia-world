export type Direction = 'front' | 'back' | 'left' | 'right';

// Enums
export enum IntentType {
  NONE = 'NONE',
  MOVE_TO_TILE = 'MOVE_TO_TILE',
  MOVE_TO_INTEREST = 'MOVE_TO_INTEREST',
  MOVE_TO_CHARACTER = 'MOVE_TO_CHARACTER',
  MOVE_TO_GROUND = 'MOVE_TO_GROUND',
}

export enum CharacterStatus {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
}

export enum InterestType {
  TREE = 'TREE',
  WATER = 'WATER',
  ROCK = 'ROCK',
  FLOWER = 'FLOWER',
}

export enum FollowPolicy {
  NEVER = 'NEVER',
  WHEN_IDLE = 'WHEN_IDLE',
}

export enum ArrivalBehavior {
  NONE = 'NONE',
  WAIT = 'WAIT',
}

export enum PathVariance {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
}

export enum GroundType {
  GRASS = 'GRASS',
  DIRT = 'DIRT',
  SAND = 'SAND',
}

export type Position = {
  x: number;
  y: number;
};

// Intent types
export type MoveToTileIntent = {
  type: IntentType.MOVE_TO_TILE;
  target: Position;
  pathVariance: PathVariance;
};

export type MoveToInterestIntent = {
  type: IntentType.MOVE_TO_INTEREST;
  interest: InterestType;
  radius: number;
  pathVariance: PathVariance;
};

export type MoveToCharacterIntent = {
  type: IntentType.MOVE_TO_CHARACTER;
  targetId: string;
  radius: number;
  pathVariance: PathVariance;
};

export type MoveToGroundIntent = {
  type: IntentType.MOVE_TO_GROUND;
  ground: GroundType;
  pathVariance: PathVariance;
};

export type NoIntent = {
  type: IntentType.NONE;
};

export type CharacterIntent = MoveToTileIntent | MoveToInterestIntent | MoveToCharacterIntent | MoveToGroundIntent | NoIntent;

// Character state
export type CharacterState = {
  id: string;
  position: Position;
  tileX: number;
  tileY: number;
  targetTileX: number | null;
  targetTileY: number | null;
  path: Position[];
  pathIndex: number;
  direction: Direction;
  status: CharacterStatus;
  animationFrame: number;
  speed: number;
  intent: CharacterIntent;
  followPolicy: FollowPolicy;
  arrivalBehavior: ArrivalBehavior;
  hairColor: string;
};

// Config types for JSON
export type IntentConfig = {
  type: string;
  target?: { x: number; y: number };
  interest?: string;
  targetId?: string;
  radius?: number;
  pathVariance?: string;
  ground?: string;
};

// Identity config (who the character is)
export type CharacterIdentityConfig = {
  id: string;
  hairColor?: string;
};

export type CharactersIdentityConfig = {
  characters: CharacterIdentityConfig[];
};

// Behavior config (what the character does)
export type CharacterBehaviorConfig = {
  id: string;
  start: { x: number; y: number };
  intent?: IntentConfig;
  followPolicy?: string;
  arrivalBehavior?: string;
  speed?: number;
};

export type CharactersBehaviorConfig = {
  behaviors: CharacterBehaviorConfig[];
};

// Combined config for internal use
export type CharacterConfig = {
  id: string;
  start: { x: number; y: number };
  intent?: IntentConfig;
  followPolicy?: string;
  arrivalBehavior?: string;
  speed?: number;
  hairColor?: string;
};

// Merge identity and behavior configs
export const mergeConfigs = (
  identity: CharactersIdentityConfig,
  behavior: CharactersBehaviorConfig
): CharacterConfig[] => {
  return behavior.behaviors.map((b) => {
    const charIdentity = identity.characters.find((c) => c.id === b.id);
    return {
      ...b,
      hairColor: charIdentity?.hairColor ?? 'brown',
    };
  });
};

// Apply new behaviors to existing characters (keeps position, updates intent)
export const applyBehaviors = (
  characters: CharacterState[],
  behavior: CharactersBehaviorConfig
): CharacterState[] => {
  return characters.map((char) => {
    const newBehavior = behavior.behaviors.find((b) => b.id === char.id);
    if (!newBehavior) return char;

    return {
      ...char,
      intent: parseIntent(newBehavior.intent),
      followPolicy: (newBehavior.followPolicy as FollowPolicy) ?? FollowPolicy.NEVER,
      arrivalBehavior: (newBehavior.arrivalBehavior as ArrivalBehavior) ?? ArrivalBehavior.NONE,
      status: CharacterStatus.IDLE,
      path: [],
      pathIndex: 0,
      targetTileX: null,
      targetTileY: null,
    };
  });
};

// Apply intent updates from LLM response (only updates specified characters)
export const applyIntentUpdates = (
  characters: CharacterState[],
  updates: { characterId: string; intent: IntentConfig; followPolicy?: string }[]
): CharacterState[] => {
  console.log(`[ENGINE] Applying ${updates.length} intent updates:`, updates.map(u => u.characterId));
  return characters.map((char) => {
    const update = updates.find((u) => u.characterId === char.id);
    if (!update) return char;

    console.log(`[ENGINE] ${char.id}: Intent set to ${update.intent.type}`);
    return {
      ...char,
      intent: parseIntent(update.intent),
      // Reset followPolicy to NEVER unless explicitly specified
      followPolicy: (update.followPolicy as FollowPolicy) ?? FollowPolicy.NEVER,
      status: CharacterStatus.IDLE,
      path: [],
      pathIndex: 0,
      targetTileX: null,
      targetTileY: null,
    };
  });
};

const parseIntent = (config?: IntentConfig): CharacterIntent => {
  if (!config) return { type: IntentType.NONE };

  const pathVariance = (config.pathVariance as PathVariance) ?? PathVariance.NONE;

  switch (config.type) {
    case 'MOVE_TO_TILE':
      return {
        type: IntentType.MOVE_TO_TILE,
        target: config.target ?? { x: 0, y: 0 },
        pathVariance,
      };
    case 'MOVE_TO_INTEREST':
      return {
        type: IntentType.MOVE_TO_INTEREST,
        interest: (config.interest as InterestType) ?? InterestType.TREE,
        radius: config.radius ?? 1,
        pathVariance,
      };
    case 'MOVE_TO_CHARACTER':
      return {
        type: IntentType.MOVE_TO_CHARACTER,
        targetId: config.targetId ?? '',
        radius: config.radius ?? 1,
        pathVariance,
      };
    case 'MOVE_TO_GROUND':
      return {
        type: IntentType.MOVE_TO_GROUND,
        ground: (config.ground as GroundType) ?? GroundType.GRASS,
        pathVariance,
      };
    default:
      return { type: IntentType.NONE };
  }
};

export const createCharacterState = (
  config: CharacterConfig,
  occupiedTiles?: Set<string>
): CharacterState => {
  let startTileX = config.start.x;
  let startTileY = config.start.y;

  // If tile is occupied, find a nearby free tile
  if (occupiedTiles && occupiedTiles.has(`${startTileX},${startTileY}`)) {
    const directions = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
      { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
    ];
    for (const dir of directions) {
      const nx = startTileX + dir.dx;
      const ny = startTileY + dir.dy;
      if (!occupiedTiles.has(`${nx},${ny}`)) {
        startTileX = nx;
        startTileY = ny;
        break;
      }
    }
  }

  const startX = startTileX + 0.5;
  const startY = startTileY + 0.5;
  return {
    id: config.id,
    position: { x: startX, y: startY },
    tileX: startTileX,
    tileY: startTileY,
    targetTileX: null,
    targetTileY: null,
    path: [],
    pathIndex: 0,
    direction: 'front',
    status: CharacterStatus.IDLE,
    animationFrame: 0,
    speed: config.speed ?? 3,
    intent: parseIntent(config.intent),
    followPolicy: (config.followPolicy as FollowPolicy) ?? FollowPolicy.NEVER,
    arrivalBehavior: (config.arrivalBehavior as ArrivalBehavior) ?? ArrivalBehavior.NONE,
    hairColor: config.hairColor ?? 'brown',
  };
};

export const getTileFromPosition = (pos: Position): { tileX: number; tileY: number } => {
  return {
    tileX: Math.floor(pos.x),
    tileY: Math.floor(pos.y),
  };
};

export const getDirectionFromMovement = (dx: number, dy: number): Direction => {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'front' : 'back';
};
