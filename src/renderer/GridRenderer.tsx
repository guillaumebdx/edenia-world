import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GridData } from '../data/GridData';
import { Tile } from './Tile';

type GridRendererProps = {
  grid: GridData;
  tileSize: number;
};

export const GridRenderer: React.FC<GridRendererProps> = ({ grid, tileSize }) => {
  return (
    <View style={styles.grid}>
      {grid.map((row, y) => (
        <View key={y} style={styles.row}>
          {row.map((tile) => (
            <Tile key={tile.id} size={tileSize} />
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
