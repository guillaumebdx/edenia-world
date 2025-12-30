import { Action, isValidAction } from './Action';
import { WorldState } from '../data/WorldState';

export const applyAction = (world: WorldState, action: Action): WorldState => {
  if (!isValidAction(action)) {
    return world;
  }

  switch (action.type) {
    case 'SET_TILE_TYPE': {
      const { x, y, tileType } = action.payload;
      if (x < 0 || x >= world.width || y < 0 || y >= world.height) {
        return world;
      }
      const newTiles = world.tiles.map((row, rowIndex) =>
        rowIndex === y
          ? row.map((tile, colIndex) =>
              colIndex === x ? { ...tile, type: tileType } : tile
            )
          : row
      );
      return {
        ...world,
        tiles: newTiles,
      };
    }
    default:
      return world;
  }
};
