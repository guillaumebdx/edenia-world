import { Action, isValidAction } from './Action';
import { WorldState, TileState } from '../data/WorldState';
import { getAssetSize } from '../data/AssetConfig';

const canPlaceAsset = (
  world: WorldState,
  x: number,
  y: number,
  width: number,
  height: number
): boolean => {
  if (x < 0 || y < 0 || x + width > world.width || y + height > world.height) {
    return false;
  }
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const tile = world.tiles[y + dy][x + dx];
      if (tile.type !== 0) {
        return false;
      }
    }
  }
  return true;
};

const cloneTiles = (tiles: TileState[][]): TileState[][] => {
  return tiles.map((row) => row.map((tile) => ({ ...tile })));
};

export const applyAction = (world: WorldState, action: Action): WorldState => {
  if (!isValidAction(action)) {
    return world;
  }

  switch (action.type) {
    case 'SET_TILE_TYPE': {
      const { x, y, tileType } = action.payload;
      const assetSize = getAssetSize(tileType);

      if (!canPlaceAsset(world, x, y, assetSize.width, assetSize.height)) {
        return world;
      }

      const newTiles = cloneTiles(world.tiles);

      for (let dy = 0; dy < assetSize.height; dy++) {
        for (let dx = 0; dx < assetSize.width; dx++) {
          const isAnchor = dx === 0 && dy === 0;
          newTiles[y + dy][x + dx] = {
            ...newTiles[y + dy][x + dx],
            type: tileType,
            isAnchor,
            anchorX: x,
            anchorY: y,
          };
        }
      }

      return {
        ...world,
        tiles: newTiles,
      };
    }
    default:
      return world;
  }
};
