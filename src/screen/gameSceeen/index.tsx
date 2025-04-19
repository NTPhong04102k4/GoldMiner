// src/screens/GoldMinerGameScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
  Text,
  StatusBar,
  BackHandler,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';
import ImmersiveMode from 'react-native-immersive-mode';
import { R } from '../../assets';
import AnimatedHook from '../../component/hooks';
import { GameItem } from '../../component/engine/type';
import { useGameEngine } from '../../component/engine';

// Game UI components
const GameHeader = ({ score, targetScore, timeRemaining, level }: {
  score: number;
  targetScore: number;
  timeRemaining: number;
  level: number;
}) => (
  <View style={styles.header}>
    <View style={styles.headerItem}>
      <Text style={styles.headerLabel}>Level</Text>
      <Text style={styles.headerValue}>{level}</Text>
    </View>
    <View style={styles.headerItem}>
      <Text style={styles.headerLabel}>Target</Text>
      <Text style={styles.headerValue}>${targetScore}</Text>
    </View>
    <View style={styles.headerItem}>
      <Text style={styles.headerLabel}>Score</Text>
      <Text style={styles.headerValue}>${score}</Text>
    </View>
    <View style={styles.headerItem}>
      <Text style={styles.headerLabel}>Time</Text>
      <Text style={styles.headerValue}>{timeRemaining}s</Text>
    </View>
  </View>
);

// Game items display
const GameItems = React.memo(({ items }: { items: GameItem[] }) => {
  // Chỉ log một lần khi items thay đổi, không phải mỗi lần render
  useEffect(() => {
    console.log('Items updated:', items);
  }, [items]);
  
  return (
    <View style={styles.itemsContainer}>
      {items.map((item) => {
        if (item.collected) return null;
        
        let source;
        switch (item.type) {
          case 'gold1': source = R.images.vang_1; break;
          case 'gold2': source = R.images.vang_2; break;
          case 'gold3': source = R.images.vang_3; break;
          case 'gold4': source = R.images.vang_4; break;
          case 'rock1': source = R.images.stone_1; break;
          case 'rock2': source = R.images.stone_2; break;
          case 'tnt': source = R.images.tnt1; break;
          default: source = R.images.vang_1;
        }
        
        return (
          <Image
            key={item.id}
            source={source}
            style={[
              styles.gameItem,
              {
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
              },
            ]}
            resizeMode="stretch"
          />
        );
      })}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - chỉ re-render khi items thực sự thay đổi
  // Nếu items không thay đổi, trả về true để tránh re-render
  return JSON.stringify(prevProps.items) === JSON.stringify(nextProps.items);
});

// Level complete overlay
const LevelCompleteOverlay = ({ score, targetScore, onNext }: {
  score: number;
  targetScore: number;
  onNext: () => void;
}) => (
  <View style={styles.overlay}>
    <View style={styles.messageBox}>
      <Text style={styles.messageTitle}>Level Complete!</Text>
      <Text style={styles.messageText}>
        You collected ${score} of ${targetScore} required!
      </Text>
      <TouchableWithoutFeedback onPress={onNext}>
        <View style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Next Level</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </View>
);

// Game over overlay
const GameOverOverlay = ({ score, targetScore, onRestart }: {
  score: number;
  targetScore: number;
  onRestart: () => void;
}) => (
  <View style={styles.overlay}>
    <View style={styles.messageBox}>
      <Text style={styles.messageTitle}>Game Over!</Text>
      <Text style={styles.messageText}>
        You collected ${score} of ${targetScore} required.
      </Text>
      <TouchableWithoutFeedback onPress={onRestart}>
        <View style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Try Again</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </View>
);

// Start screen overlay
const StartScreenOverlay = ({ onStart }: { onStart: () => void }) => (
  <View style={styles.overlay}>
    <View style={styles.messageBox}>
      <Text style={styles.messageTitle}>Gold Miner</Text>
      <Text style={styles.messageText}>
        Tap to throw your hook and collect valuable items!
      </Text>
      <TouchableWithoutFeedback onPress={onStart}>
        <View style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Start Game</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </View>
);

// Main game screen component
const GoldMinerGameScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Use the game engine hook to get state and methods
  const {
    gameState,
    startGame,
    startNextLevel,
    resetGame,
    toggleHook,
    collectItem,
    calculateHookSpeed,
    updateHookPosition,
    setHookState  

  } = useGameEngine();
  // 1. Thêm state theo dõi trạng thái trong component
const [hookStateDebug, setHookStateDebug] = useState('swinging');

// 2. Thêm useEffect để theo dõi thay đổi trạng thái hook
useEffect(() => {
  console.log('[GoldMinerGameScreen] Hook state changed:', gameState.hookState);
  setHookStateDebug(gameState.hookState);
  
  // Đảm bảo hook đung đưa sau khi retract
  if (gameState.hookState === 'retracting' && gameState.caughtItem === null) {
    console.log('[GoldMinerGameScreen] No item caught, preparing to swing after retract');
  }
}, [gameState.hookState, gameState.caughtItem]);
  // Setup landscape orientation
  useEffect(() => {
    // Lock to landscape
    Orientation.lockToLandscape();
    // Hide status bar
    StatusBar.setHidden(true);
    // Enable immersive mode
    ImmersiveMode.fullLayout(true);
    ImmersiveMode.setBarMode('Bottom');
    
    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Show confirmation dialog
      Alert.alert(
        'Exit Game',
        'Are you sure you want to exit the game?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { 
            text: 'Exit', 
            style: 'destructive', 
            onPress: () => {
              // Clean up and navigate back
              Orientation.unlockAllOrientations();
              StatusBar.setHidden(false);
              ImmersiveMode.fullLayout(false);
              
              // Go back to previous screen
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            } 
          },
        ]
      );
      return true; // Prevent default back behavior
    });
    
    // Clean up
    return () => {
      backHandler.remove();
      Orientation.unlockAllOrientations();
      StatusBar.setHidden(false);
      ImmersiveMode.fullLayout(false);
    };
  }, [navigation]);
  
  // Handle hook extension completion
// Sau đó, sửa hàm handleExtendComplete
const handleExtendComplete = useCallback(() => {
  console.log('Hook extension complete, hook state:', gameState.hookState);
  if (gameState.hookState === 'extending' && !gameState.caughtItem) {
    console.log('No item caught, retracting...');
    setHookState('retracting');
  }
}, [gameState.hookState, gameState.caughtItem, setHookState]);
  
  // Handle hook retraction completion
  const handleRetractComplete = () => {
    console.log('[GoldMinerGameScreen] Hook retraction complete, current state:', gameState.hookState);
    
    // Nếu có vật phẩm được bắt, thu thập nó  
    if (gameState.caughtItem) {
      console.log('[GoldMinerGameScreen] Collecting item:', gameState.caughtItem.type);
      collectItem(gameState.caughtItem);
    } else {
      // Nếu không có vật nào được bắt, phải chuyển về swinging
      console.log('[GoldMinerGameScreen] No item caught, setting state to swinging');
      setHookState('swinging');
    }
  };
  
  // Handle item caught by hook
  const handleItemCaught = (item: GameItem) => {
    console.log('Item caught:', item.type, item.id);
    // Logic for catching items is handled in the game engine
  };
  
  // Render based on game status
  const renderGameStatus = () => {
    switch (gameState.gameStatus) {
      case 'ready':
        return <StartScreenOverlay onStart={startGame} />;
      
      case 'levelCompleted':
        return (
          <LevelCompleteOverlay 
            score={gameState.score} 
            targetScore={gameState.targetScore} 
            onNext={startNextLevel} 
          />
        );
      
      case 'gameOver':
        return (
          <GameOverOverlay 
            score={gameState.score} 
            targetScore={gameState.targetScore} 
            onRestart={resetGame} 
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <TouchableWithoutFeedback onPress={toggleHook}>
      <View style={styles.container}>
        {/* Game background */}
        <Image 
          source={R.images.bg} 
          style={styles.background} 
          resizeMode="cover" 
        />
        
        {/* Game header */}
        <GameHeader 
          score={gameState.score}
          targetScore={gameState.targetScore}
          timeRemaining={gameState.timeRemaining}
          level={gameState.level}
        />
        
        {/* Game items */}
        <GameItems items={gameState.items} />
        
        {/* Animated hook */}
        <AnimatedHook 
          hookState={gameState.hookState}
          caughtItem={gameState.caughtItem}
          onExtendComplete={handleExtendComplete}
          onRetractComplete={handleRetractComplete}
          onItemCaught={handleItemCaught}
          checkCollision={updateHookPosition}
          getRetractionSpeed={calculateHookSpeed}
        />
        
        {/* Game status overlays */}
        {renderGameStatus()}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width:Dimensions.get('screen').width,
    height:Dimensions.get('screen').height,
    backgroundColor: '#1A1A2E',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    justifyContent: 'space-between',
  },
  headerItem: {
    alignItems: 'center',
  },
  headerLabel: {
    color: '#F0A500',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemsContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  gameItem: {
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBox: {
    backgroundColor: '#16213E',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#F0A500',
    width: '70%',
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F0A500',
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  messageButton: {
    backgroundColor: '#F0A500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  messageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
});

export default GoldMinerGameScreen;