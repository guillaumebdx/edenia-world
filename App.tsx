import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GridRenderer } from './src/renderer/GridRenderer';
import { createWorldState, WorldState } from './src/data/WorldState';
import { applyAction } from './src/actions/ActionDispatcher';
import { Action } from './src/actions/Action';

const TILE_SIZE = 16;

const initialWorldState = createWorldState(20, 20);

export default function App() {
  const [world, setWorld] = useState<WorldState>(initialWorldState);

  const dispatch = (action: Action) => {
    setWorld((prev) => applyAction(prev, action));
  };

  useEffect(() => {
    dispatch({
      type: 'SET_TILE_TYPE',
      payload: { x: 5, y: 5, tileType: 1 },
    });
    dispatch({
      type: 'SET_TILE_TYPE',
      payload: { x: 10, y: 10, tileType: 1 },
    });
  }, []);

  return (
    <View style={styles.container}>
      <GridRenderer world={world} tileSize={TILE_SIZE} />
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
