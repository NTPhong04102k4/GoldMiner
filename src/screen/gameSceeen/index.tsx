import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, Image, Dimensions, StyleSheet } from 'react-native';
import { R } from '../../assets';
import { GameItem } from '../../component/engine/type';
import { GameStatusRenderer } from './Item/RenderGameSatus';
import { GameItems } from './Item/GameItems';
import { GameHeader } from './Item/Header';
import { AnimatedHook } from '../../component/hooks';
import { useGameEngine } from '../../component/engine';
import { useAutoPlayer } from '../../component/auto';

const GoldMinerGameScreen: React.FC = () => {
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

  const autoPlayer = useAutoPlayer({
    enabled: true, 
    intelligenceLevel: "advanced",
    riskTolerance: 0.8,
    preferHighValue: true,
    avoidTNT: true,
  });

  const {
    autoPlayerState,
    toggleAutoPlayer,
    setConfig,
    startDecisionProcess,
    stopDecisionProcess,
    calculateTargetAngle,
    deployHookToItems,
    deployHookToAngles
  } = autoPlayer;

  const hasHookedRef = React.useRef(false);
  const [collectionStarted, setCollectionStarted] = useState(false);
  // Thêm state để theo dõi trạng thái hiệu ứng
  const [isCollecting, setIsCollecting] = useState(false);
  
  const [targetHookAngle, setTargetHookAngle] = useState<number|null>();

  useEffect(() => {
    if (
      gameState.gameStatus === 'playing' && 
      autoPlayerState.enabled && 
      gameState.hookState === 'swinging' && 
      !collectionStarted
    ) {
      const uncollectedItems = gameState.items.filter(item => !item.collected);
      
      if (uncollectedItems.length > 0) {
        // Sắp xếp vật phẩm theo giá trị (từ cao đến thấp)
        const sortedItems = [...uncollectedItems].sort((a, b) => b.value - a.value);
        
        // Lấy vật phẩm có giá trị cao nhất
        const targetItem = sortedItems[0];
        
        // Tính góc đến vật phẩm mục tiêu
        const targetAngle = calculateTargetAngle(targetItem);
        
        console.log(`[Auto] Setting target angle to ${targetAngle.toFixed(1)}° for item ${targetItem.type}`);
        
        // Đặt góc mục tiêu
        setTargetHookAngle(targetAngle);
        setCollectionStarted(true);
      }
    }
  }, [gameState.gameStatus, autoPlayerState.enabled, gameState.hookState, collectionStarted]);
  
  useEffect(() => {
    if (gameState.hookState === 'swinging') {
      hasHookedRef.current = false;
      setIsCollecting(false); // Reset trạng thái collecting khi về trạng thái swinging

      if (!gameState.items.every(item => item.collected) && gameState.timeRemaining > 0 && autoPlayerState.enabled) {
        setCollectionStarted(false);
      }
    }
  }, [gameState.hookState]);

  useEffect(() => {
    if (gameState.gameStatus !== 'playing') {
      setCollectionStarted(false);
      setTargetHookAngle(null); 
      setIsCollecting(false); // Reset trạng thái collecting khi game không ở trạng thái playing
    }
  }, [gameState.gameStatus]);
  
  useEffect(() => {
    if (gameState.timeRemaining < 10) {
      setConfig({ riskTolerance: 1.0, preferHighValue: false });
    }
  }, [gameState.timeRemaining]);

  useEffect(() => {
    if (gameState.hookState === 'swinging') {
      hasHookedRef.current = false;
      if (gameState.items.every(item => item.collected) || gameState.timeRemaining <= 0) {
        setCollectionStarted(false);
        setTargetHookAngle(null); 
      }
    }
  }, [gameState.hookState]);
  
  useEffect(() => {
    if (targetHookAngle !== null && gameState.hookState === 'swinging') {
      let temp = targetHookAngle === undefined ? 0 : targetHookAngle;
      if (Math.abs(gameState.hookAngle - temp) <= 3) {
        console.log(`Deploying hook at ${gameState.hookAngle.toFixed(1)}° (target: ${targetHookAngle}°)`);
        toggleHook();
        setTargetHookAngle(null);
      }
    }
  }, [gameState.hookAngle, gameState.hookState, targetHookAngle]);
  
  const handleExtendComplete = useCallback(() => {
    if (gameState.hookState === 'extending' && !gameState.caughtItem) {
      setHookState('retracting');
    }
  }, [gameState.hookState, gameState.caughtItem]);

  // Sửa đổi hàm handleRetractComplete để kiểm soát việc hoàn thành hiệu ứng
  const handleRetractComplete = () => {
    if (gameState.caughtItem) {
      console.log('Animation completed, collecting item: ', gameState.caughtItem.type);
      collectItem(gameState.caughtItem);
    } else {
      setHookState('swinging');
    }
  };

  const handleItemCaught = (item: GameItem) => {
    console.log('Item caught:', item.type, item.id);
    setIsCollecting(true); // Đánh dấu rằng đang trong quá trình thu thập vật phẩm
  };
  
  const handleAngleChange = (angle: number) => {
    // Không cần thay đổi
  };
  
  return (
    <TouchableWithoutFeedback onPress={toggleHook}>
      <View style={styles.container}>
        <Image source={R.images.bg} style={styles.background} resizeMode="cover" />
        <GameHeader
          score={gameState.score}
          targetScore={gameState.targetScore}
          timeRemaining={gameState.timeRemaining}
          level={gameState.level}
          isAutoPlayActive={autoPlayerState.enabled}
          onToggleAutoPlay={toggleAutoPlayer}
        />

        <GameItems items={gameState.items} />
        <AnimatedHook
          hookState={gameState.hookState}
          caughtItem={gameState.caughtItem}
          onExtendComplete={handleExtendComplete}
          onRetractComplete={handleRetractComplete}
          checkCollision={updateHookPosition}
          getRetractionSpeed={calculateHookSpeed}
          onItemCaught={handleItemCaught}
          onAngleChange={handleAngleChange} 
        />
        <GameStatusRenderer
          gameStatus={gameState.gameStatus}
          score={gameState.score}
          targetScore={gameState.targetScore}
          onStart={startGame}
          onNextLevel={startNextLevel}
          onRestart={resetGame}
        />
      </View>
    </TouchableWithoutFeedback>);
};

const styles = StyleSheet.create({
  container: {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
    backgroundColor: '#1A1A2E',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default GoldMinerGameScreen;