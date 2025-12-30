export type GroundType = 'grass' | 'dirt' | 'sand';

export type TileState = {
  id: number;
  type: number;
  ground: GroundType;
  isAnchor: boolean;
  anchorX: number | null;
  anchorY: number | null;
};

export type WorldState = {
  width: number;
  height: number;
  tiles: TileState[][];
};

export const createWorldState = (width: number, height: number): WorldState => {
  const tiles: TileState[][] = [];
  let id = 0;
  for (let y = 0; y < height; y++) {
    const row: TileState[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ id: id++, type: 0, ground: 'grass', isAnchor: false, anchorX: null, anchorY: null });
    }
    tiles.push(row);
  }
  return {
    width,
    height,
    tiles,
  };
};
