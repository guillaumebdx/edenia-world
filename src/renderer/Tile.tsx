import React from 'react';
import { View, StyleSheet } from 'react-native';

const TILE_COLORS: Record<number, string> = {
  0: '#888',
  1: '#4a4',
};

type TileProps = {
  size: number;
  tileType: number;
};

export const Tile: React.FC<TileProps> = ({ size, tileType }) => {
  const backgroundColor = TILE_COLORS[tileType] ?? '#888';
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: '#444',
  },
});
