import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WorldState } from '../data/WorldState';
import { CameraState } from '../data/CameraState';
import { Tile } from './Tile';

type GridRendererProps = {
  world: WorldState;
  camera: CameraState;
  tileSize: number;
};

export const GridRenderer: React.FC<GridRendererProps> = ({ world, camera, tileSize }) => {
  const visibleTiles: React.ReactNode[] = [];

  for (let vy = 0; vy < camera.viewportHeight; vy++) {
    const worldY = camera.y + vy;
    if (worldY >= world.height) break;

    const rowTiles: React.ReactNode[] = [];
    for (let vx = 0; vx < camera.viewportWidth; vx++) {
      const worldX = camera.x + vx;
      if (worldX >= world.width) break;

      const tile = world.tiles[worldY][worldX];
      rowTiles.push(<Tile key={tile.id} size={tileSize} tile={tile} />);
    }

    visibleTiles.push(
      <View key={worldY} style={styles.row}>
        {rowTiles}
      </View>
    );
  }

  return <View style={styles.grid}>{visibleTiles}</View>;
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
});
