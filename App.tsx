import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GridRenderer } from './src/renderer/GridRenderer';
import { createGrid } from './src/data/GridData';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const TILE_SIZE = 16;

const gridData = createGrid(GRID_WIDTH, GRID_HEIGHT);

export default function App() {
  return (
    <View style={styles.container}>
      <GridRenderer grid={gridData} tileSize={TILE_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
