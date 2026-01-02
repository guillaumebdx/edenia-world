import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, PanResponder, Dimensions } from 'react-native';
import { GridRenderer } from './src/renderer/GridRenderer';
import { WorldState } from './src/data/WorldState';
import { createCameraState, moveCameraPixels, CameraState } from './src/data/CameraState';
import { loadWorldFromConfig, InitialWorldConfig } from './src/data/WorldLoader';
import { DebugBar } from './src/ui/DebugBar';
import { PromptInput } from './src/ui/PromptInput';
import { Character } from './src/renderer/Character';
import { CharacterState, createCharacterState, CharactersIdentityConfig, CharactersBehaviorConfig, mergeConfigs, applyBehaviors, applyIntentUpdates } from './src/data/CharacterState';
import { getAssetSize } from './src/data/AssetConfig';
import { updateCharacterMovement, updateFacingDirections, processIntent } from './src/systems/CharacterSystem';
import { processBehavior } from './src/systems/BehaviorSystem';
import { createEventBus, GameEvent } from './src/systems/EventBus';
import { buildSystemPrompt, callOpenAI, validateResponse } from './src/services/OpenAIService';
import initialWorldConfig from './src/data/initialWorld.json';
import charactersIdentity from './src/data/charactersIdentity.json';
import charactersBehavior from './src/data/charactersBehavior.json';
import charactersBehavior2 from './src/data/charactersBehavior2.json';

import Constants from 'expo-constants';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || '';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILE_SIZE = 16;
const VIEWPORT_WIDTH = Math.ceil(SCREEN_WIDTH / TILE_SIZE);
const VIEWPORT_HEIGHT = Math.ceil(SCREEN_HEIGHT / TILE_SIZE);

const initialWorldState = loadWorldFromConfig(initialWorldConfig as InitialWorldConfig);
const initialCamera = createCameraState(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
const eventBus = createEventBus();

export default function App() {
  const [world] = useState<WorldState>(initialWorldState);
  const [camera, setCamera] = useState<CameraState>(initialCamera);
  const [showGrid, setShowGrid] = useState(true);
  const [showCharacterIds, setShowCharacterIds] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterState[]>(() => {
    // Merge identity and behavior configs
    const mergedConfigs = mergeConfigs(
      charactersIdentity as CharactersIdentityConfig,
      charactersBehavior as CharactersBehaviorConfig
    );
    // Collect blocked tiles from world assets (considering asset sizes)
    const blockedTiles = new Set<string>();
    for (let y = 0; y < initialWorldState.height; y++) {
      for (let x = 0; x < initialWorldState.width; x++) {
        const tile = initialWorldState.tiles[y]?.[x];
        if (tile && tile.isAnchor && tile.type !== 0) {
          // Block all tiles covered by this asset
          const size = getAssetSize(tile.type);
          for (let dy = 0; dy < size.height; dy++) {
            for (let dx = 0; dx < size.width; dx++) {
              blockedTiles.add(`${x + dx},${y + dy}`);
            }
          }
        }
      }
    }
    // Create characters, tracking occupied tiles to avoid overlap
    const occupiedTiles = new Set<string>(blockedTiles);
    return mergedConfigs.map((c) => {
      const char = createCharacterState(c, occupiedTiles);
      occupiedTiles.add(`${char.tileX},${char.tileY}`);
      return char;
    });
  });
  const lastPan = useRef({ x: 0, y: 0 });
  const lastTime = useRef<number>(Date.now());
  const animationRef = useRef<number | null>(null);
  const pendingEvents = useRef<GameEvent[]>([]);

  const gameLoop = useCallback(() => {
    const now = Date.now();
    const deltaTime = (now - lastTime.current) / 1000;
    lastTime.current = now;

    setCharacters((prevChars) => {
      const newChars = prevChars.map((char) => {
        const update = updateCharacterMovement(char, deltaTime, prevChars);
        pendingEvents.current.push(...update.events);
        return update.character;
      });

      const eventsToProcess = [...pendingEvents.current];
      pendingEvents.current = [];

      let processedChars = newChars;
      for (const event of eventsToProcess) {
        eventBus.emit(event);
        processedChars = processedChars.map((char) =>
          processBehavior(char, event, processedChars, world)
        );
      }

      return updateFacingDirections(processedChars);
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [world]);


  // Handle prompt submission to OpenAI
  const handlePromptSend = useCallback(async (userPrompt: string) => {
    if (!OPENAI_API_KEY) {
      setPromptError('OpenAI API key not configured');
      return;
    }

    setIsLoading(true);
    setPromptError(null);

    try {
      const systemPrompt = buildSystemPrompt(characters, world);
      const response = await callOpenAI(OPENAI_API_KEY, systemPrompt, userPrompt);

      // Validate response
      const validation = validateResponse(response, characters);
      if (!validation.valid) {
        setPromptError(`Invalid response: ${validation.error}`);
        setIsLoading(false);
        return;
      }

      // Apply intent updates
      setCharacters((prevChars) => {
        const updatedChars = applyIntentUpdates(prevChars, response.intentUpdates);
        return updatedChars.map((char) => processIntent(char, updatedChars, world));
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPromptError(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [characters, world]);

  useEffect(() => {
    lastTime.current = Date.now();
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

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
        {characters.map((char) => (
          <Character
            key={char.id}
            character={char}
            tileSize={TILE_SIZE}
            cameraX={camera.x}
            cameraY={camera.y}
            offsetX={camera.offsetX}
            offsetY={camera.offsetY}
            hairColor={char.hairColor}
            showId={showCharacterIds}
          />
        ))}
      </View>
      <View style={styles.bottomPanel}>
        <PromptInput
          onSend={handlePromptSend}
          isLoading={isLoading}
          error={promptError}
        />
        <DebugBar
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        showCharacterIds={showCharacterIds}
        onToggleCharacterIds={() => setShowCharacterIds((prev) => !prev)}
        onLoadMock1={() => {
          setCharacters((prevChars) => {
            const updatedChars = applyBehaviors(prevChars, charactersBehavior as CharactersBehaviorConfig);
            return updatedChars.map((char) => processIntent(char, updatedChars, world));
          });
        }}
        onLoadMock2={() => {
          setCharacters((prevChars) => {
            const updatedChars = applyBehaviors(prevChars, charactersBehavior2 as CharactersBehaviorConfig);
            return updatedChars.map((char) => processIntent(char, updatedChars, world));
          });
        }}
        />
      </View>
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
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
