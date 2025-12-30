import React from 'react';
import { View, StyleSheet } from 'react-native';

type TileProps = {
  size: number;
};

export const Tile: React.FC<TileProps> = ({ size }) => {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#888',
    borderWidth: 1,
    borderColor: '#444',
  },
});
