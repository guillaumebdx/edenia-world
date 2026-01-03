import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { CharacterState } from '../data/CharacterState';

type DialogBubbleProps = {
  characterId: string;
  text: string;
  opacity: number;
  characters: CharacterState[];
  cameraX: number;
  cameraY: number;
  tileSize: number;
};

const BUBBLE_WIDTH = 160;
const TAIL_HEIGHT = 8;

export const DialogBubble: React.FC<DialogBubbleProps> = ({
  characterId,
  text,
  opacity,
  characters,
  cameraX,
  cameraY,
  tileSize,
}) => {
  const character = characters.find((c) => c.id === characterId);
  if (!character) return null;

  const screenHeight = Dimensions.get('window').height;

  // Calculate screen position - center of character tile
  const screenX = (character.position.x - cameraX) * tileSize;
  const screenY = (character.position.y - cameraY) * tileSize;

  // Position from bottom of screen, so bubble grows upward
  // The tail should be at screenY - 10 (just above character head)
  const tailBottomY = screenY - 10;
  const bottomOffset = screenHeight - tailBottomY;

  return (
    <View
      style={{
        position: 'absolute',
        left: screenX - BUBBLE_WIDTH / 2,
        bottom: bottomOffset,
        width: BUBBLE_WIDTH,
        alignItems: 'center',
        opacity,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: '#333',
            textAlign: 'center',
            fontWeight: '500',
          }}
        >
          {text}
        </Text>
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: TAIL_HEIGHT,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: 'rgba(255, 255, 255, 0.95)',
          marginTop: -1,
        }}
      />
    </View>
  );
};
