import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, PanResponder, Dimensions } from 'react-native';
import { GridRenderer } from './src/renderer/GridRenderer';
import { WorldState } from './src/data/WorldState';
import { createCameraState, moveCameraPixels, CameraState } from './src/data/CameraState';
import { loadWorldFromConfig, InitialWorldConfig } from './src/data/WorldLoader';
import { DebugBar } from './src/ui/DebugBar';
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
  const [showGrid, setShowGrid] = useState(true);
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
          const dx = gestureState.dx - lastPan.current.x;
          const dy = gestureState.dy - lastPan.current.y;
          lastPan.current = { x: gestureState.dx, y: gestureState.dy };
          setCamera((prev) => moveCameraPixels(prev, -dx, -dy, world.width, world.height, TILE_SIZE));
        },
      }),
    [world.width, world.height]
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer} {...panResponder.panHandlers}>
        <GridRenderer world={world} camera={camera} tileSize={TILE_SIZE} showGrid={showGrid} />
      </View>
      <DebugBar showGrid={showGrid} onToggleGrid={() => setShowGrid((prev) => !prev)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  mapContainer: {
    flex: 1,
  },
});
