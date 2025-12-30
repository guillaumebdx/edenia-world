import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type DebugBarProps = {
  showGrid: boolean;
  onToggleGrid: () => void;
};

export const DebugBar: React.FC<DebugBarProps> = ({ showGrid, onToggleGrid }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onToggleGrid}>
        <Text style={styles.buttonText}>
          Grid: {showGrid ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
});
