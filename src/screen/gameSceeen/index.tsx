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

  // Chỉ sử dụng một instance của autoPlayer
  const autoPlayer = useAutoPlayer({
    enabled: true, // Bật auto ngay từ đầu
    intelligenceLevel: 'expert',
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
    deployHookToItems
  } = autoPlayer;

  const hasHookedRef = React.useRef(false);
  const [collectionStarted, setCollectionStarted] = useState(false);

  const handleAngleChange = (angle: number) => {
    console.log(`[Angle] ${angle.toFixed(2)}, Auto: ${autoPlayerState.enabled}, Collection: ${collectionStarted}`);
    
    if (gameState.gameStatus !== 'playing' || !autoPlayerState.enabled) {
      console.log('[Auto] Not playing or auto disabled');
      return;
    }
    
    if (!collectionStarted && gameState.hookState === 'swinging') {
      const uncollectedItems = gameState.items.filter(item => !item.collected);
      console.log(`[Auto] Found ${uncollectedItems.length} uncollected items`);
      
      if (uncollectedItems.length > 0) {
        // ...logic chọn vật phẩm...
        
        console.log(`[Auto] Deploying hook to collect items: ${itemIds.join(', ')}`);
        setCollectionStarted(true);
        deployHookToItems(itemIds);
      }
    }
  };
  
  // Reset trạng thái khi hook quay về vị trí swinging
  useEffect(() => {
    if (gameState.hookState === 'swinging') {
      hasHookedRef.current = false;

      // Tiếp tục thu thập nếu vẫn còn vật phẩm và chưa hết thời gian
      if (!gameState.items.every(item => item.collected) && gameState.timeRemaining > 0 && autoPlayerState.enabled) {
        setCollectionStarted(false); // Reset để bắt đầu lại chu trình thu thập
      }
    }
  }, [gameState.hookState]);

  // Khi chuyển level hoặc game kết thúc, reset trạng thái
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') {
      setCollectionStarted(false);
    }
  }, [gameState.gameStatus]);
  useEffect(() => {
    if (gameState.timeRemaining < 10) {
      setConfig({ riskTolerance: 1.0, preferHighValue: false });
    }
  }, [gameState.timeRemaining]);

  // Reset trạng thái khi hook quay về vị trí swinging
  useEffect(() => {
    if (gameState.hookState === 'swinging') {
      hasHookedRef.current = false;
      // Nếu tất cả vật phẩm đã thu thập hoặc thời gian kết thúc, không thu thập nữa
      if (gameState.items.every(item => item.collected) || gameState.timeRemaining <= 0) {
        setCollectionStarted(false);
      }
    }
  }, [gameState.hookState]);

  useEffect(() => {
    if (gameState.gameStatus !== 'playing') {
      setCollectionStarted(false);
    }
  }, [gameState.gameStatus]);

  const handleExtendComplete = useCallback(() => {
    if (gameState.hookState === 'extending' && !gameState.caughtItem) {
      setHookState('retracting');
    }
  }, [gameState.hookState, gameState.caughtItem]);

  const handleRetractComplete = () => {
    gameState.caughtItem
      ? collectItem(gameState.caughtItem)
      : setHookState('swinging');
  };

  const handleItemCaught = (item: GameItem) => {
    console.log('Item caught:', item.type, item.id);
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
          onAngleChange={handleAngleChange} // Thêm callback này
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