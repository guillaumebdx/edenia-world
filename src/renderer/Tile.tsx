import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { TILE_ASSETS } from './TileAssets';
import { TileState, GroundType } from '../data/WorldState';
import { getAssetSize } from '../data/AssetConfig';
import { getAnimationConfig } from '../data/AnimationConfig';
import { AnimatedSprite } from './AnimatedSprite';

const GROUND_COLORS: Record<GroundType, string> = {
  grass: '#5a8f3c',
  dirt: '#8b6b4a',
  sand: '#d4b896',
};

type TileProps = {
  size: number;
  tile: TileState;
  showGrid: boolean;
};

export const Tile: React.FC<TileProps> = ({ size, tile, showGrid }) => {
  const asset = TILE_ASSETS[tile.type];
  const assetSize = getAssetSize(tile.type);
  const groundColor = GROUND_COLORS[tile.ground];
  const animation = getAnimationConfig(tile.type);

  const showSprite = tile.isAnchor && (asset || animation);

  const spriteStyle = {
    position: 'absolute' as const,
    width: size * assetSize.width,
    height: size * assetSize.height,
    zIndex: 1,
  };

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: groundColor,
          borderWidth: showGrid ? 1 : 0,
        },
      ]}
    >
      {showSprite && animation ? (
        <AnimatedSprite animation={animation} style={spriteStyle} />
      ) : showSprite && asset ? (
        <Image
          source={asset}
          style={spriteStyle}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: '#3a5f2c',
  },
});
