import { WorldState } from './WorldState';
import { Position } from './CharacterState';
import { getAssetSize } from './AssetConfig';

type Node = {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
};

const SOLID_ASSET_TYPES = [1, 2];

export const isTileBlocked = (world: WorldState, x: number, y: number): boolean => {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) {
    return true;
  }
  const tile = world.tiles[y][x];
  if (tile.type !== 0 && SOLID_ASSET_TYPES.includes(tile.type)) {
    return true;
  }
  if (tile.anchorX !== null && tile.anchorY !== null) {
    const anchorTile = world.tiles[tile.anchorY][tile.anchorX];
    if (SOLID_ASSET_TYPES.includes(anchorTile.type)) {
      return true;
    }
  }
  return false;
};

const heuristic = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const getNeighbors = (node: Node, world: WorldState): Position[] => {
  const neighbors: Position[] = [];
  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  for (const dir of directions) {
    const nx = node.x + dir.x;
    const ny = node.y + dir.y;
    if (!isTileBlocked(world, nx, ny)) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
};

const reconstructPath = (node: Node): Position[] => {
  const path: Position[] = [];
  let current: Node | null = node;
  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  return path;
};

export const findPath = (
  world: WorldState,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Position[] => {
  if (isTileBlocked(world, endX, endY)) {
    return [];
  }

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic({ x: startX, y: startY }, { x: endX, y: endY }),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === endX && current.y === endY) {
      return reconstructPath(current);
    }

    closedSet.add(`${current.x},${current.y}`);

    for (const neighbor of getNeighbors(current, world)) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key)) {
        continue;
      }

      const g = current.g + 1;
      const existingNode = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

      if (!existingNode) {
        const h = heuristic(neighbor, { x: endX, y: endY });
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g,
          h,
          f: g + h,
          parent: current,
        });
      } else if (g < existingNode.g) {
        existingNode.g = g;
        existingNode.f = g + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  return [];
};
