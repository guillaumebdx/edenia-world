import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type DebugBarProps = {
  showDebugOverlay: boolean;
  onToggleDebugOverlay: () => void;
  onLoadMock1: () => void;
  onLoadMock2: () => void;
  onLoadDialog: () => void;
  isDialogPlaying: boolean;
};

export const DebugBar: React.FC<DebugBarProps> = ({ 
  showDebugOverlay, 
  onToggleDebugOverlay,
  onLoadMock1,
  onLoadMock2,
  onLoadDialog,
  isDialogPlaying,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onToggleDebugOverlay}>
        <Text style={styles.buttonText}>
          Debug: {showDebugOverlay ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonMargin, styles.mockButton]} onPress={onLoadMock1}>
        <Text style={styles.buttonText}>Mock1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonMargin, styles.mockButton]} onPress={onLoadMock2}>
        <Text style={styles.buttonText}>Mock2</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, styles.buttonMargin, styles.dialogButton, isDialogPlaying && styles.dialogButtonActive]} 
        onPress={onLoadDialog}
        disabled={isDialogPlaying}
      >
        <Text style={styles.buttonText}>{isDialogPlaying ? '...' : 'Dial'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  buttonMargin: {
    marginLeft: 12,
  },
  mockButton: {
    backgroundColor: '#2a6',
  },
  dialogButton: {
    backgroundColor: '#a62',
  },
  dialogButtonActive: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
});
