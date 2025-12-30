import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WorldState } from '../data/WorldState';
import { CameraState } from '../data/CameraState';
import { Tile } from './Tile';

type GridRendererProps = {
  world: WorldState;
  camera: CameraState;
  tileSize: number;
  showGrid: boolean;
};

export const GridRenderer: React.FC<GridRendererProps> = ({ world, camera, tileSize, showGrid }) => {
  const visibleTiles: React.ReactNode[] = [];

  const extraTiles = 1;
  const renderWidth = camera.viewportWidth + extraTiles;
  const renderHeight = camera.viewportHeight + extraTiles;

  for (let vy = 0; vy < renderHeight; vy++) {
    const worldY = camera.y + vy;
    if (worldY < 0 || worldY >= world.height) continue;

    const rowTiles: React.ReactNode[] = [];
    for (let vx = 0; vx < renderWidth; vx++) {
      const worldX = camera.x + vx;
      if (worldX < 0 || worldX >= world.width) continue;

      const tile = world.tiles[worldY][worldX];
      rowTiles.push(<Tile key={tile.id} size={tileSize} tile={tile} showGrid={showGrid} />);
    }

    visibleTiles.push(
      <View key={worldY} style={styles.row}>
        {rowTiles}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.grid,
        {
          transform: [
            { translateX: -camera.offsetX },
            { translateY: -camera.offsetY },
          ],
        },
      ]}
    >
      {visibleTiles}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
});
