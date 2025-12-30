import { createWorldState, WorldState, GroundType } from './WorldState';
import { applyAction } from '../actions/ActionDispatcher';

export type InitialAsset = {
  type: number;
  x: number;
  y: number;
};

export type InitialWorldConfig = {
  width: number;
  height: number;
  ground: GroundType[][];
  assets: InitialAsset[];
};

export const loadWorldFromConfig = (config: InitialWorldConfig): WorldState => {
  let world = createWorldState(config.width, config.height);

  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      world.tiles[y][x].ground = config.ground[y][x];
    }
  }

  for (const asset of config.assets) {
    world = applyAction(world, {
      type: 'SET_TILE_TYPE',
      payload: {
        x: asset.x,
        y: asset.y,
        tileType: asset.type,
      },
    });
  }

  return world;
};
