import React from 'react';
import { Image, StyleSheet, View, Text } from 'react-native';
import { CharacterState } from '../data/CharacterState';
import { getCharacterSprite } from '../data/CharacterSprites';

type CharacterProps = {
  character: CharacterState;
  tileSize: number;
  cameraX: number;
  cameraY: number;
  offsetX: number;
  offsetY: number;
  hairColor?: string;
  showId?: boolean;
};

export const Character: React.FC<CharacterProps> = ({
  character,
  tileSize,
  cameraX,
  cameraY,
  offsetX,
  offsetY,
  hairColor = 'brown',
  showId = false,
}) => {
  const sprite = getCharacterSprite(character.direction, character.animationFrame, hairColor);

  const screenX = (character.position.x - cameraX) * tileSize - offsetX - tileSize / 2;
  const screenY = (character.position.y - cameraY) * tileSize - offsetY - tileSize;

  return (
    <View
      style={[
        styles.container,
        {
          width: tileSize,
          height: tileSize * 2 + 12,
          left: screenX,
          top: screenY - (showId ? 12 : 0),
        },
      ]}
    >
      {showId && (
        <View style={styles.idContainer}>
          <Text style={styles.idText}>{character.id}</Text>
        </View>
      )}
      <Image
        source={sprite}
        style={[styles.sprite, { width: tileSize, height: tileSize * 2 }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 100,
    alignItems: 'center',
  },
  idContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginBottom: 2,
  },
  idText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  sprite: {},
});
