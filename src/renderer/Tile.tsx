import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { TILE_ASSETS } from './TileAssets';
import { TileState, GroundType } from '../data/WorldState';
import { getAssetSize } from '../data/AssetConfig';

const GROUND_COLORS: Record<GroundType, string> = {
  grass: '#5a8f3c',
  dirt: '#8b6b4a',
  sand: '#d4b896',
};

type TileProps = {
  size: number;
  tile: TileState;
};

export const Tile: React.FC<TileProps> = ({ size, tile }) => {
  const asset = TILE_ASSETS[tile.type];
  const assetSize = getAssetSize(tile.type);
  const groundColor = GROUND_COLORS[tile.ground];

  const showSprite = tile.isAnchor && asset;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: groundColor,
        },
      ]}
    >
      {showSprite && (
        <Image
          source={asset}
          style={{
            position: 'absolute',
            width: size * assetSize.width,
            height: size * assetSize.height,
            zIndex: 1,
          }}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: '#3a5f2c',
  },
});
