export type TileState = {
  id: number;
  type: number;
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
      row.push({ id: id++, type: 0 });
    }
    tiles.push(row);
  }
  return {
    width,
    height,
    tiles,
  };
};
