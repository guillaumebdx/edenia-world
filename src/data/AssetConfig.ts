export type AssetSize = {
  width: number;
  height: number;
};

export const ASSET_SIZES: Record<number, AssetSize> = {
  0: { width: 1, height: 1 },
  1: { width: 3, height: 4 },
  2: { width: 4, height: 2 },
  3: { width: 2, height: 2 },
  4: { width: 1, height: 1 },
};

export const getAssetSize = (tileType: number): AssetSize => {
  return ASSET_SIZES[tileType] ?? { width: 1, height: 1 };
};
