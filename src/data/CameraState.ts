export type CameraState = {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
};

export const createCameraState = (
  viewportWidth: number,
  viewportHeight: number
): CameraState => {
  return {
    x: 0,
    y: 0,
    viewportWidth,
    viewportHeight,
  };
};

export const clampCamera = (
  camera: CameraState,
  worldWidth: number,
  worldHeight: number
): CameraState => {
  const maxX = Math.max(0, worldWidth - camera.viewportWidth);
  const maxY = Math.max(0, worldHeight - camera.viewportHeight);
  return {
    ...camera,
    x: Math.max(0, Math.min(camera.x, maxX)),
    y: Math.max(0, Math.min(camera.y, maxY)),
  };
};

export const moveCamera = (
  camera: CameraState,
  dx: number,
  dy: number,
  worldWidth: number,
  worldHeight: number
): CameraState => {
  const newCamera = {
    ...camera,
    x: camera.x + dx,
    y: camera.y + dy,
  };
  return clampCamera(newCamera, worldWidth, worldHeight);
};
