import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, PanResponder, Dimensions } from 'react-native';
import { GridRenderer } from './src/renderer/GridRenderer';
import { WorldState } from './src/data/WorldState';
import { createCameraState, moveCamera, CameraState } from './src/data/CameraState';
import { loadWorldFromConfig, InitialWorldConfig } from './src/data/WorldLoader';
import initialWorldConfig from './src/data/initialWorld.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILE_SIZE = 16;
const VIEWPORT_WIDTH = Math.ceil(SCREEN_WIDTH / TILE_SIZE);
const VIEWPORT_HEIGHT = Math.ceil(SCREEN_HEIGHT / TILE_SIZE);

const initialWorldState = loadWorldFromConfig(initialWorldConfig as InitialWorldConfig);
const initialCamera = createCameraState(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

export default function App() {
  const [world] = useState<WorldState>(initialWorldState);
  const [camera, setCamera] = useState<CameraState>(initialCamera);
  const lastPan = useRef({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          lastPan.current = { x: 0, y: 0 };
        },
        onPanResponderMove: (_, gestureState) => {
          const dx = Math.floor((lastPan.current.x - gestureState.dx) / TILE_SIZE);
          const dy = Math.floor((lastPan.current.y - gestureState.dy) / TILE_SIZE);

          if (dx !== 0 || dy !== 0) {
            setCamera((prev) => moveCamera(prev, dx, dy, world.width, world.height));
            lastPan.current = {
              x: lastPan.current.x - dx * TILE_SIZE,
              y: lastPan.current.y - dy * TILE_SIZE,
            };
          }
        },
      }),
    [world.width, world.height]
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <GridRenderer world={world} camera={camera} tileSize={TILE_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
});
