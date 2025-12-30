export type CameraState = {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
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
    offsetX: 0,
    offsetY: 0,
    viewportWidth,
    viewportHeight,
  };
};

export const clampCamera = (
  camera: CameraState,
  worldWidth: number,
  worldHeight: number,
  tileSize: number
): CameraState => {
  const maxX = Math.max(0, worldWidth - camera.viewportWidth);
  const maxY = Math.max(0, worldHeight - camera.viewportHeight);
  
  let x = camera.x;
  let y = camera.y;
  let offsetX = camera.offsetX;
  let offsetY = camera.offsetY;

  if (x < 0) {
    x = 0;
    offsetX = 0;
  } else if (x > maxX) {
    x = maxX;
    offsetX = 0;
  } else if (x === maxX && offsetX > 0) {
    offsetX = 0;
  }

  if (y < 0) {
    y = 0;
    offsetY = 0;
  } else if (y > maxY) {
    y = maxY;
    offsetY = 0;
  } else if (y === maxY && offsetY > 0) {
    offsetY = 0;
  }

  return { ...camera, x, y, offsetX, offsetY };
};

export const moveCameraPixels = (
  camera: CameraState,
  dx: number,
  dy: number,
  worldWidth: number,
  worldHeight: number,
  tileSize: number
): CameraState => {
  let newOffsetX = camera.offsetX + dx;
  let newOffsetY = camera.offsetY + dy;
  let newX = camera.x;
  let newY = camera.y;

  while (newOffsetX >= tileSize) {
    newOffsetX -= tileSize;
    newX += 1;
  }
  while (newOffsetX < 0) {
    newOffsetX += tileSize;
    newX -= 1;
  }
  while (newOffsetY >= tileSize) {
    newOffsetY -= tileSize;
    newY += 1;
  }
  while (newOffsetY < 0) {
    newOffsetY += tileSize;
    newY -= 1;
  }

  const newCamera = {
    ...camera,
    x: newX,
    y: newY,
    offsetX: newOffsetX,
    offsetY: newOffsetY,
  };

  return clampCamera(newCamera, worldWidth, worldHeight, tileSize);
};
