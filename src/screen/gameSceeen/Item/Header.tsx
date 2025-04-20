import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface GameHeaderProps {
  score: number;
  targetScore: number;
  timeRemaining: number;
  level: number;
  isAutoPlayActive: boolean;
  onToggleAutoPlay: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  targetScore,
  timeRemaining,
  level,
  isAutoPlayActive,
  onToggleAutoPlay
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.box}>
          <Text style={styles.label}>Score</Text>
          <Text style={styles.value}>{score}</Text>
        </View>

        <View style={[styles.box, styles.levelBox]}>
          <Text style={styles.label}>Level</Text>
          <Text style={styles.value}>{level}</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.value}>{targetScore}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.box, styles.timeBox]}>
          <Text style={styles.label}>Time</Text>
          <Text style={[
            styles.value,
            timeRemaining <= 10 && styles.timeWarning
          ]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.autoPlayButton,
            isAutoPlayActive ? styles.autoPlayActive : styles.autoPlayInactive
          ]}
          onPress={onToggleAutoPlay}
        >
          <Text style={styles.autoPlayText}>
            {isAutoPlayActive ? 'Auto: ON' : 'Auto: OFF'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1C',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  box: {
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  levelBox: {
    backgroundColor: '#FFD70030',
  },
  timeBox: {
    flex: 2,
  },
  label: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  timeWarning: {
    color: '#FF5252',
  },
  autoPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  autoPlayActive: {
    backgroundColor: '#4CAF50',
  },
  autoPlayInactive: {
    backgroundColor: '#9E9E9E',
  },
  autoPlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
