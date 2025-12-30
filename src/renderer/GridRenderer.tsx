import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WorldState } from '../data/WorldState';
import { Tile } from './Tile';

type GridRendererProps = {
  world: WorldState;
  tileSize: number;
};

export const GridRenderer: React.FC<GridRendererProps> = ({ world, tileSize }) => {
  return (
    <View style={styles.grid}>
      {world.tiles.map((row, y) => (
        <View key={y} style={styles.row}>
          {row.map((tile) => (
            <Tile key={tile.id} size={tileSize} tileType={tile.type} />
          ))}
        </View>
      ))}
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
