export type TileData = {
  id: number;
};

export type GridData = TileData[][];

export const createGrid = (width: number, height: number): GridData => {
  const grid: GridData = [];
  let id = 0;
  for (let y = 0; y < height; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ id: id++ });
    }
    grid.push(row);
  }
  return grid;
};
