import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Platform } from 'react-native';
import { useGameEngine } from '../../../component/engine';
import { useAutoPlayer } from '../../../component/auto';
import { R } from '../../../assets';
import { height, width } from '../../../component/auto/data';

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
  const gameEngine = useGameEngine();
  const { gameState } = gameEngine;
  const autoPlayer = useAutoPlayer();
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <View style={styles.container}>
      <Image source={R.images.bg2} style={{ height: height * 0.15, width: width, opacity: 0.85, position: "absolute" }} />
      <View style={{ flexDirection: 'row', justifyContent: "space-between", width: width - 50 }}> <View style={{}}>
        <View style={styles.box}>
          <Text style={styles.label}>Score:</Text>
          <Text style={styles.value}>{score}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>Target:</Text>
          <Text style={styles.value}>{targetScore}</Text>
        </View>
      </View>
      <Image source={R.images.player} style={{width:140,height:60, marginTop:-10,marginLeft:80}} resizeMode='contain'/>
        <View style={{ flexDirection: 'row',gap:12 }}>
          <TouchableOpacity
            style={[
              styles.autoPlayButton,
              isAutoPlayActive ? styles.autoPlayActive : styles.autoPlayInactive
            ]}
            onPress={onToggleAutoPlay}
          >
            <Text style={styles.autoPlayText}>
              {isAutoPlayActive ? 'Auto: ON ' : 'Auto: OFF'}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'column',width:80 }}>
            <View style={[styles.box]}>
              <Text style={styles.label}>Level</Text>
              <Text style={styles.value}>{level}</Text>
            </View>
          <View style={[styles.box]}>
            <Text style={styles.label}>Time</Text>
            <Text style={[
              styles.value,
              timeRemaining <= 10 && styles.timeWarning
            ]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  row: {
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    justifyContent: "space-between"
  },
  levelBox: {
  },
  timeBox: {
  },
  label: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#058a2d',
    fontWeight: 'bold',
  },
  timeWarning: {
    color: '#FF5252',
  },
  autoPlayButton: {
    height:28,
    paddingHorizontal:6,
    alignSelf:"center",
    alignItems:'center',
    justifyContent:'center',
    paddingVertical:3,
    borderRadius:20
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
