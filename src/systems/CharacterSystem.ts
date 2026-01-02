import {
  CharacterState,
  CharacterStatus,
  Position,
  getDirectionFromMovement,
  getTileFromPosition,
  IntentType,
  InterestType,
  FollowPolicy,
  PathVariance,
  CharacterIntent,
  GroundType,
} from '../data/CharacterState';
import { WorldState } from '../data/WorldState';
import { isTileBlocked } from '../data/Pathfinding';
import { getAssetSize } from '../data/AssetConfig';
import { GameEvent } from './EventBus';

export type CharacterUpdate = {
  character: CharacterState;
  events: GameEvent[];
};

export const setCharacterPath = (
  character: CharacterState,
  path: Position[],
  world: WorldState,
  occupiedTiles: Set<string>
): CharacterState => {
  if (path.length === 0) {
    return character;
  }

  const finalTarget = path[path.length - 1];
  const currentTile = getTileFromPosition(character.position);
  const fullPath = findPathAvoidingOccupied(
    world,
    currentTile.tileX,
    currentTile.tileY,
    finalTarget.x,
    finalTarget.y,
    occupiedTiles
  );

  if (fullPath.length <= 1) {
    return character;
  }

  return {
    ...character,
    targetTileX: finalTarget.x,
    targetTileY: finalTarget.y,
    path: fullPath.slice(1),
    pathIndex: 0,
    status: CharacterStatus.MOVING,
  };
};

export const setCharacterTarget = (
  character: CharacterState,
  targetX: number,
  targetY: number,
  world: WorldState,
  occupiedTiles: Set<string>
): CharacterState => {
  const currentTile = getTileFromPosition(character.position);
  const path = findPathAvoidingOccupied(world, currentTile.tileX, currentTile.tileY, targetX, targetY, occupiedTiles);

  if (path.length <= 1) {
    return character;
  }

  return {
    ...character,
    targetTileX: targetX,
    targetTileY: targetY,
    path: path.slice(1),
    pathIndex: 0,
    status: CharacterStatus.MOVING,
  };
};

const seededRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};

const shuffleArray = <T>(array: T[], random: () => number): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const findPathAvoidingOccupied = (
  world: WorldState,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  occupiedTiles: Set<string>,
  variationSeed?: number
): Position[] => {
  // Soft blocking: prefer to avoid but can walk through if needed
  const isHardBlocked = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= world.width || y >= world.height) return true;
    return false;
  };

  const isSoftBlocked = (x: number, y: number): boolean => {
    if (isTileBlocked(world, x, y)) return true;
    if (occupiedTiles.has(`${x},${y}`)) return true;
    return false;
  };

  // Don't block destination - character can walk there
  if (isHardBlocked(endX, endY)) {
    return [];
  }

  const seed = variationSeed ?? (startX * 1000 + startY * 100 + endX * 10 + endY + Date.now() % 1000);
  const random = seededRandom(seed);
  const variationStrength = 0.3;

  const openSet: { x: number; y: number; g: number; h: number; f: number; variation: number; parent: any }[] = [];
  const closedSet = new Set<string>();

  const heuristic = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const startNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic({ x: startX, y: startY }, { x: endX, y: endY }),
    f: 0,
    variation: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === endX && current.y === endY) {
      const path: Position[] = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    const baseDirections = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const directions = shuffleArray(baseDirections, random);

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const key = `${nx},${ny}`;

      if (closedSet.has(key)) continue;
      if (isHardBlocked(nx, ny)) continue;
      
      // Soft blocked tiles have higher cost but can be traversed
      const softBlockedCost = isSoftBlocked(nx, ny) ? 10 : 0;

      const g = current.g + 1 + softBlockedCost;
      const variation = (random() - 0.5) * variationStrength;
      const existing = openSet.find((n) => n.x === nx && n.y === ny);

      if (!existing) {
        const h = heuristic({ x: nx, y: ny }, { x: endX, y: endY });
        openSet.push({ x: nx, y: ny, g, h, f: g + h + variation, variation, parent: current });
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + existing.h + existing.variation;
        existing.parent = current;
      }
    }
  }

  return [];
};

export const updateCharacterMovement = (
  character: CharacterState,
  deltaTime: number,
  allCharacters?: CharacterState[]
): CharacterUpdate => {
  const events: GameEvent[] = [];

  if (character.status !== CharacterStatus.MOVING || character.path.length === 0) {
    return { character, events };
  }

  const targetTile = character.path[character.pathIndex];
  if (!targetTile) {
    const newChar: CharacterState = {
      ...character,
      status: CharacterStatus.IDLE,
      animationFrame: 0,
    };
    events.push({ type: 'stateChanged', characterId: character.id, payload: { status: 'idle' } });
    return { character: newChar, events };
  }

  const targetX = targetTile.x + 0.5;
  const targetY = targetTile.y + 0.5;

  const dx = targetX - character.position.x;
  const dy = targetY - character.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const moveDistance = character.speed * deltaTime;

  if (distance <= moveDistance) {
    const newPosition = { x: targetX, y: targetY };
    const tile = getTileFromPosition(newPosition);
    const nextPathIndex = character.pathIndex + 1;

    if (nextPathIndex >= character.path.length) {
      // Check if destination tile is occupied by another character
      let finalTileX = tile.tileX;
      let finalTileY = tile.tileY;
      let finalPosition = newPosition;

      if (allCharacters) {
        const isOccupied = allCharacters.some(
          c => c.id !== character.id && c.tileX === tile.tileX && c.tileY === tile.tileY
        );
        if (isOccupied) {
          // Find nearest free tile
          const freeTile = findNearestFreeTile(tile.tileX, tile.tileY, allCharacters, character.id);
          if (freeTile) {
            finalTileX = freeTile.x;
            finalTileY = freeTile.y;
            finalPosition = { x: freeTile.x + 0.5, y: freeTile.y + 0.5 };
          }
        }
      }

      const newChar: CharacterState = {
        ...character,
        position: finalPosition,
        tileX: finalTileX,
        tileY: finalTileY,
        status: CharacterStatus.IDLE,
        animationFrame: 0,
        path: [],
        pathIndex: 0,
        targetTileX: null,
        targetTileY: null,
      };
      events.push({ type: 'stateChanged', characterId: character.id, payload: { status: 'idle' } });
      return { character: newChar, events };
    }

    const nextTarget = character.path[nextPathIndex];
    const nextDx = nextTarget.x + 0.5 - newPosition.x;
    const nextDy = nextTarget.y + 0.5 - newPosition.y;

    return {
      character: {
        ...character,
        position: newPosition,
        tileX: tile.tileX,
        tileY: tile.tileY,
        pathIndex: nextPathIndex,
        direction: getDirectionFromMovement(nextDx, nextDy),
        animationFrame: (character.animationFrame + 1) % 2,
      },
      events,
    };
  }

  const dirX = dx / distance;
  const dirY = dy / distance;

  const newPosition = {
    x: character.position.x + dirX * moveDistance,
    y: character.position.y + dirY * moveDistance,
  };

  const tile = getTileFromPosition(newPosition);
  const direction = getDirectionFromMovement(dx, dy);

  const animationSpeed = 0.15;
  const newAnimTime = (character.animationFrame + deltaTime / animationSpeed) % 2;

  return {
    character: {
      ...character,
      position: newPosition,
      tileX: tile.tileX,
      tileY: tile.tileY,
      direction,
      animationFrame: Math.floor(newAnimTime),
    },
    events,
  };
};

export const getOccupiedTiles = (characters: CharacterState[], excludeId?: string): Set<string> => {
  const occupied = new Set<string>();
  for (const char of characters) {
    if (char.id !== excludeId) {
      occupied.add(`${char.tileX},${char.tileY}`);
    }
  }
  return occupied;
};

// Find nearest free tile not occupied by any character
const findNearestFreeTile = (
  x: number,
  y: number,
  allCharacters: CharacterState[],
  excludeId: string
): Position | null => {
  const occupiedByCharacters = new Set<string>();
  for (const char of allCharacters) {
    if (char.id !== excludeId) {
      occupiedByCharacters.add(`${char.tileX},${char.tileY}`);
    }
  }

  // Search in expanding rings
  for (let r = 1; r <= 5; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!occupiedByCharacters.has(`${nx},${ny}`)) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
};

export const findAdjacentFreeTile = (
  targetX: number,
  targetY: number,
  world: WorldState,
  occupiedTiles: Set<string>
): Position | null => {
  const directions = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];

  for (const dir of directions) {
    const nx = targetX + dir.x;
    const ny = targetY + dir.y;
    if (!isTileBlocked(world, nx, ny) && !occupiedTiles.has(`${nx},${ny}`)) {
      return { x: nx, y: ny };
    }
  }
  return null;
};

// Map InterestType to asset type numbers
const INTEREST_TO_ASSET: Record<InterestType, number> = {
  [InterestType.TREE]: 1,
  [InterestType.ROCK]: 2,
  [InterestType.FLOWER]: 3,
  [InterestType.WATER]: 4,
};

// Get variance strength from PathVariance enum
const getVarianceStrength = (variance: PathVariance): number => {
  switch (variance) {
    case PathVariance.NONE: return 0;
    case PathVariance.LOW: return 0.2;
    case PathVariance.MEDIUM: return 0.4;
    default: return 0;
  }
};

// Map GroundType to world ground strings
const GROUND_TYPE_MAP: Record<GroundType, string> = {
  [GroundType.GRASS]: 'grass',
  [GroundType.DIRT]: 'dirt',
  [GroundType.SAND]: 'sand',
};

// Find all anchor tiles of a specific interest type
export const findInterestTiles = (
  world: WorldState,
  interest: InterestType
): Position[] => {
  const assetType = INTEREST_TO_ASSET[interest];
  const positions: Position[] = [];

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const tile = world.tiles[y]?.[x];
      if (tile && tile.isAnchor && tile.type === assetType) {
        positions.push({ x, y });
      }
    }
  }

  return positions;
};

// Find nearest tile of a specific ground type
export const findNearestGround = (
  world: WorldState,
  fromX: number,
  fromY: number,
  ground: GroundType,
  occupiedTiles: Set<string>
): Position | null => {
  const groundString = GROUND_TYPE_MAP[ground];
  
  let nearest: Position | null = null;
  let nearestDist = Infinity;

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const tile = world.tiles[y]?.[x];
      if (tile && tile.ground === groundString && tile.type === 0) {
        // Check if not occupied
        if (!occupiedTiles.has(`${x},${y}`)) {
          const dist = Math.abs(x - fromX) + Math.abs(y - fromY);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = { x, y };
          }
        }
      }
    }
  }

  return nearest;
};

// Find nearest interest tile within radius
export const findNearestInterest = (
  world: WorldState,
  fromX: number,
  fromY: number,
  interest: InterestType,
  radius: number,
  occupiedTiles: Set<string>
): Position | null => {
  const interestTiles = findInterestTiles(world, interest);
  
  let nearest: Position | null = null;
  let nearestDist = Infinity;

  for (const anchorTile of interestTiles) {
    const dist = Math.abs(anchorTile.x - fromX) + Math.abs(anchorTile.y - fromY);
    if (dist < nearestDist) {
      // Get asset size to find tiles around the whole asset
      const tile = world.tiles[anchorTile.y]?.[anchorTile.x];
      const assetType = tile?.type ?? 0;
      const size = getAssetSize(assetType);
      
      // Find adjacent free tile around the asset
      const adjacent = findAdjacentFreeTileAroundAsset(
        anchorTile.x, anchorTile.y, size.width, size.height, 
        world, occupiedTiles, radius
      );
      if (adjacent) {
        nearestDist = dist;
        nearest = adjacent;
      }
    }
  }

  return nearest;
};

// Find adjacent tile around an asset (considering asset size)
const findAdjacentFreeTileAroundAsset = (
  anchorX: number,
  anchorY: number,
  assetWidth: number,
  assetHeight: number,
  world: WorldState,
  occupiedTiles: Set<string>,
  maxRadius: number
): Position | null => {
  // Check tiles around the asset perimeter, expanding outward
  for (let r = 0; r < maxRadius; r++) {
    // Bottom edge (below asset)
    for (let dx = -r; dx < assetWidth + r; dx++) {
      const nx = anchorX + dx;
      const ny = anchorY + assetHeight + r;
      if (isValidDestination(nx, ny, world, occupiedTiles)) {
        return { x: nx, y: ny };
      }
    }
    // Top edge (above asset)
    for (let dx = -r; dx < assetWidth + r; dx++) {
      const nx = anchorX + dx;
      const ny = anchorY - 1 - r;
      if (isValidDestination(nx, ny, world, occupiedTiles)) {
        return { x: nx, y: ny };
      }
    }
    // Left edge
    for (let dy = -r; dy < assetHeight + r; dy++) {
      const nx = anchorX - 1 - r;
      const ny = anchorY + dy;
      if (isValidDestination(nx, ny, world, occupiedTiles)) {
        return { x: nx, y: ny };
      }
    }
    // Right edge
    for (let dy = -r; dy < assetHeight + r; dy++) {
      const nx = anchorX + assetWidth + r;
      const ny = anchorY + dy;
      if (isValidDestination(nx, ny, world, occupiedTiles)) {
        return { x: nx, y: ny };
      }
    }
  }
  return null;
};

const isValidDestination = (
  x: number, y: number, 
  world: WorldState, 
  occupiedTiles: Set<string>
): boolean => {
  if (x < 0 || x >= world.width || y < 0 || y >= world.height) return false;
  // Prefer non-blocked tiles but don't strictly require it
  // Only reject if occupied by another character
  if (occupiedTiles.has(`${x},${y}`)) return false;
  return true;
};

// Find adjacent tile within radius (for character following)
const findAdjacentFreeTileWithRadius = (
  targetX: number,
  targetY: number,
  world: WorldState,
  occupiedTiles: Set<string>,
  radius: number
): Position | null => {
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        if (dx === 0 && dy === 0) continue;
        
        const nx = targetX + dx;
        const ny = targetY + dy;
        
        if (isValidDestination(nx, ny, world, occupiedTiles)) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
};

// Process a character's intent and start movement if needed
// forceProcess: bypass WHEN_IDLE check (used by BehaviorSystem after event)
export const processIntent = (
  character: CharacterState,
  allCharacters: CharacterState[],
  world: WorldState,
  forceProcess: boolean = false
): CharacterState => {
  // Don't process if already moving
  if (character.status === CharacterStatus.MOVING) {
    return character;
  }

  const intent = character.intent;
  if (intent.type === IntentType.NONE) {
    return character;
  }

  const occupiedTiles = getOccupiedTiles(allCharacters, character.id);

  switch (intent.type) {
    case IntentType.MOVE_TO_TILE: {
      const target = intent.target;
      if (character.tileX === target.x && character.tileY === target.y) {
        // Already at destination
        return { ...character, intent: { type: IntentType.NONE } };
      }
      const varianceSeed = intent.pathVariance !== PathVariance.NONE 
        ? Date.now() + character.id.charCodeAt(0) 
        : undefined;
      return setCharacterTargetWithVariance(character, target.x, target.y, world, occupiedTiles, intent.pathVariance, varianceSeed);
    }

    case IntentType.MOVE_TO_INTEREST: {
      const target = findNearestInterest(world, character.tileX, character.tileY, intent.interest, intent.radius, occupiedTiles);
      if (!target) {
        return character;
      }
      if (character.tileX === target.x && character.tileY === target.y) {
        return { ...character, intent: { type: IntentType.NONE } };
      }
      const varianceSeed = intent.pathVariance !== PathVariance.NONE 
        ? Date.now() + character.id.charCodeAt(0) 
        : undefined;
      return setCharacterTargetWithVariance(character, target.x, target.y, world, occupiedTiles, intent.pathVariance, varianceSeed);
    }

    case IntentType.MOVE_TO_CHARACTER: {
      // WHEN_IDLE policy: skip unless forced (by BehaviorSystem after target becomes idle)
      if (character.followPolicy === FollowPolicy.WHEN_IDLE && !forceProcess) {
        return character;
      }

      const targetChar = allCharacters.find(c => c.id === intent.targetId);
      if (!targetChar) {
        return character;
      }

      const dist = Math.abs(targetChar.tileX - character.tileX) + Math.abs(targetChar.tileY - character.tileY);
      if (dist <= intent.radius) {
        // Already within radius
        return character;
      }

      const adjacent = findAdjacentFreeTileWithRadius(targetChar.tileX, targetChar.tileY, world, occupiedTiles, intent.radius);
      if (!adjacent) {
        return character;
      }

      const varianceSeed = intent.pathVariance !== PathVariance.NONE 
        ? Date.now() + character.id.charCodeAt(0) 
        : undefined;
      return setCharacterTargetWithVariance(character, adjacent.x, adjacent.y, world, occupiedTiles, intent.pathVariance, varianceSeed);
    }

    case IntentType.MOVE_TO_GROUND: {
      const target = findNearestGround(world, character.tileX, character.tileY, intent.ground, occupiedTiles);
      if (!target) {
        return character;
      }
      if (character.tileX === target.x && character.tileY === target.y) {
        return { ...character, intent: { type: IntentType.NONE } };
      }
      const varianceSeed = intent.pathVariance !== PathVariance.NONE 
        ? Date.now() + character.id.charCodeAt(0) 
        : undefined;
      return setCharacterTargetWithVariance(character, target.x, target.y, world, occupiedTiles, intent.pathVariance, varianceSeed);
    }

    default:
      return character;
  }
};

// Set character target with path variance
const setCharacterTargetWithVariance = (
  character: CharacterState,
  targetX: number,
  targetY: number,
  world: WorldState,
  occupiedTiles: Set<string>,
  variance: PathVariance,
  seed?: number
): CharacterState => {
  const currentTile = getTileFromPosition(character.position);
  const path = findPathAvoidingOccupied(world, currentTile.tileX, currentTile.tileY, targetX, targetY, occupiedTiles, seed);

  if (path.length <= 1) {
    return character;
  }

  return {
    ...character,
    targetTileX: targetX,
    targetTileY: targetY,
    path: path.slice(1),
    pathIndex: 0,
    status: CharacterStatus.MOVING,
  };
};

export const updateFacingDirections = (characters: CharacterState[]): CharacterState[] => {
  return characters.map((char) => {
    if (char.status !== CharacterStatus.IDLE) {
      return char;
    }

    for (const other of characters) {
      if (other.id === char.id) continue;
      if (other.status !== CharacterStatus.IDLE) continue;

      const dx = other.tileX - char.tileX;
      const dy = other.tileY - char.tileY;

      if (Math.abs(dx) + Math.abs(dy) === 1) {
        let newDirection = char.direction;
        if (dx === 1) newDirection = 'right';
        else if (dx === -1) newDirection = 'left';
        else if (dy === 1) newDirection = 'front';
        else if (dy === -1) newDirection = 'back';

        return { ...char, direction: newDirection };
      }
    }

    return char;
  });
};
