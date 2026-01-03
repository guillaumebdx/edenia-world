import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, PanResponder, Dimensions } from 'react-native';
import { GridRenderer } from './src/renderer/GridRenderer';
import { WorldState } from './src/data/WorldState';
import { createCameraState, moveCameraPixels, centerCameraOnTile, isTileVisible, CameraState } from './src/data/CameraState';
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
import { buildDialogSystemPrompt, validateDialogResponse, CharacterIdentity } from './src/services/DialogService';
import { DialogBubble } from './src/ui/DialogBubble';
import { DialogState, DialogSequence, createDialogState, loadDialogSequence, clearDialogState } from './src/data/DialogState';
import { DialogPhase, startCurrentStep, completeFadeIn, startFadeOut, completeFadeOut } from './src/systems/DialogSystem';
import initialWorldConfig from './src/data/initialWorld.json';
import charactersIdentity from './src/data/charactersIdentity.json';
import charactersBehavior from './src/data/charactersBehavior.json';
import charactersBehavior2 from './src/data/charactersBehavior2.json';
import dialogMock from './src/data/dialogMock.json';

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
  const [showDebugOverlay, setShowDebugOverlay] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>(createDialogState());
  const [dialogPhase, setDialogPhase] = useState<DialogPhase>(DialogPhase.IDLE);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const dialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

      // Store prompt for dialog context
      setLastUserPrompt(userPrompt);

      // Apply intent updates with sequential processing to avoid race conditions
      setCharacters((prevChars) => {
        const updatedChars = applyIntentUpdates(prevChars, response.intentUpdates);
        // Process intents sequentially - each character sees the updated state from previous ones
        let processedChars = [...updatedChars];
        for (let i = 0; i < processedChars.length; i++) {
          processedChars[i] = processIntent(processedChars[i], processedChars, world);
        }
        return processedChars;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPromptError(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [characters, world]);

  // Dialog orchestration
  const advanceDialog = useCallback((phase: DialogPhase, state: DialogState) => {
    let update;
    let nextPhase: DialogPhase;

    switch (phase) {
      case DialogPhase.IDLE:
        update = startCurrentStep(state);
        nextPhase = DialogPhase.FADE_IN;
        break;
      case DialogPhase.FADE_IN:
        update = completeFadeIn(state);
        nextPhase = DialogPhase.SHOWING;
        break;
      case DialogPhase.SHOWING:
        update = startFadeOut(state);
        nextPhase = DialogPhase.FADE_OUT;
        break;
      case DialogPhase.FADE_OUT:
        update = completeFadeOut(state);
        nextPhase = update.state.isPlaying ? DialogPhase.DELAY : DialogPhase.IDLE;
        break;
      case DialogPhase.DELAY:
        update = startCurrentStep(state);
        nextPhase = DialogPhase.FADE_IN;
        break;
      default:
        return;
    }

    // Move camera to speaking character if off-screen (on FADE_IN start)
    if ((phase === DialogPhase.IDLE || phase === DialogPhase.DELAY) && update.state.currentBubble) {
      const speakingChar = characters.find(c => c.id === update.state.currentBubble?.characterId);
      if (speakingChar) {
        setCamera(prevCamera => {
          if (!isTileVisible(prevCamera, speakingChar.tileX, speakingChar.tileY, 3)) {
            return centerCameraOnTile(prevCamera, speakingChar.tileX, speakingChar.tileY, world.width, world.height);
          }
          return prevCamera;
        });
      }
    }

    setDialogState(update.state);
    setDialogPhase(nextPhase);

    if (update.scheduleNext !== undefined && update.state.isPlaying) {
      dialogTimeoutRef.current = setTimeout(() => {
        advanceDialog(nextPhase, update.state);
      }, update.scheduleNext);
    }
  }, [characters, world.width, world.height]);

  const handleLoadDialog = useCallback(async () => {
    if (dialogState.isPlaying || isDialogLoading) return;
    
    if (!OPENAI_API_KEY) {
      console.log('[DIALOG] No API key, using mock');
      const newState = loadDialogSequence(createDialogState(), dialogMock as DialogSequence);
      setDialogState(newState);
      setDialogPhase(DialogPhase.IDLE);
      setTimeout(() => advanceDialog(DialogPhase.IDLE, newState), 100);
      return;
    }

    if (!lastUserPrompt) {
      console.log('[DIALOG] No previous prompt, using mock');
      const newState = loadDialogSequence(createDialogState(), dialogMock as DialogSequence);
      setDialogState(newState);
      setDialogPhase(DialogPhase.IDLE);
      setTimeout(() => advanceDialog(DialogPhase.IDLE, newState), 100);
      return;
    }

    setIsDialogLoading(true);
    console.log('[DIALOG] Generating dialog via OpenAI...');

    try {
      const identities = (charactersIdentity as { characters: CharacterIdentity[] }).characters;
      const systemPrompt = buildDialogSystemPrompt(characters, identities, lastUserPrompt);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Génère un dialogue réactif entre les personnages.' },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in response');
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const dialogResponse = JSON.parse(jsonStr) as DialogSequence;
      const validIds = characters.map(c => c.id);
      
      if (!validateDialogResponse(dialogResponse, validIds)) {
        throw new Error('Invalid dialog response structure');
      }

      console.log('[DIALOG] Generated', dialogResponse.dialogSteps.length, 'dialog steps');
      
      const newState = loadDialogSequence(createDialogState(), dialogResponse);
      setDialogState(newState);
      setDialogPhase(DialogPhase.IDLE);
      
      setTimeout(() => {
        advanceDialog(DialogPhase.IDLE, newState);
      }, 100);
    } catch (error) {
      console.error('[DIALOG] Error:', error);
      // Fallback to mock on error
      console.log('[DIALOG] Falling back to mock');
      const newState = loadDialogSequence(createDialogState(), dialogMock as DialogSequence);
      setDialogState(newState);
      setDialogPhase(DialogPhase.IDLE);
      setTimeout(() => advanceDialog(DialogPhase.IDLE, newState), 100);
    } finally {
      setIsDialogLoading(false);
    }
  }, [dialogState.isPlaying, isDialogLoading, advanceDialog, characters, lastUserPrompt]);

  // Cleanup dialog timeout on unmount
  useEffect(() => {
    return () => {
      if (dialogTimeoutRef.current) {
        clearTimeout(dialogTimeoutRef.current);
      }
    };
  }, []);

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
        <GridRenderer world={world} camera={camera} tileSize={TILE_SIZE} showGrid={showDebugOverlay} />
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
            showId={showDebugOverlay}
          />
        ))}
        {dialogState.currentBubble && (
          <DialogBubble
            key={`${dialogState.currentStepIndex}-${dialogState.currentBubble.characterId}`}
            characterId={dialogState.currentBubble.characterId}
            text={dialogState.currentBubble.text}
            opacity={dialogState.currentBubble.opacity}
            characters={characters}
            cameraX={camera.x}
            cameraY={camera.y}
            tileSize={TILE_SIZE}
          />
        )}
      </View>
      <View style={styles.bottomPanel}>
        <PromptInput
          onSend={handlePromptSend}
          isLoading={isLoading}
          error={promptError}
        />
        <DebugBar
        showDebugOverlay={showDebugOverlay}
        onToggleDebugOverlay={() => setShowDebugOverlay((prev) => !prev)}
        onLoadMock1={() => {
          setCharacters((prevChars) => {
            const updatedChars = applyBehaviors(prevChars, charactersBehavior as CharactersBehaviorConfig);
            let processedChars = [...updatedChars];
            for (let i = 0; i < processedChars.length; i++) {
              processedChars[i] = processIntent(processedChars[i], processedChars, world);
            }
            return processedChars;
          });
        }}
        onLoadMock2={() => {
          setCharacters((prevChars) => {
            const updatedChars = applyBehaviors(prevChars, charactersBehavior2 as CharactersBehaviorConfig);
            let processedChars = [...updatedChars];
            for (let i = 0; i < processedChars.length; i++) {
              processedChars[i] = processIntent(processedChars[i], processedChars, world);
            }
            return processedChars;
          });
        }}
        onLoadDialog={handleLoadDialog}
        isDialogPlaying={dialogState.isPlaying || isDialogLoading}
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
