export type SetTileTypeAction = {
  type: 'SET_TILE_TYPE';
  payload: {
    x: number;
    y: number;
    tileType: number;
  };
};

export type Action = SetTileTypeAction;

export const isValidAction = (action: unknown): action is Action => {
  if (typeof action !== 'object' || action === null) {
    return false;
  }
  const a = action as Record<string, unknown>;
  if (a.type === 'SET_TILE_TYPE') {
    const payload = a.payload as Record<string, unknown>;
    return (
      typeof payload === 'object' &&
      payload !== null &&
      typeof payload.x === 'number' &&
      typeof payload.y === 'number' &&
      typeof payload.tileType === 'number'
    );
  }
  return false;
};
