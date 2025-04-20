  import React, { useCallback, useEffect } from 'react';
  import { View, TouchableWithoutFeedback, Image, Dimensions, StyleSheet } from 'react-native';
  import { R } from '../../assets';
  import AnimatedHook from '../../component/hooks';
  import { useGameEngine } from '../../component/engine';
  import { GameHeader } from './Item/Header';
  import { GameItems } from './Item/GameItems';
  import { GameStatusRenderer } from './Item/RenderGameSatus';
  import { useGameOrientation } from './Item/useEngine';
  import { GameItem } from '../../component/engine/type';
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
    const {
      autoPlayerState,
      toggleAutoPlayer,
      setConfig,
      startDecisionProcess,
      stopDecisionProcess,
    } = useAutoPlayer({
      enabled: true, // Bật auto ngay từ đầu
      intelligenceLevel: 'expert',
      riskTolerance: 0.8,
      preferHighValue: true,
      avoidTNT: true,
    });
    useEffect(() => {
      if (gameState.timeRemaining < 10) {
        setConfig({ riskTolerance: 1.0, preferHighValue: false });
      }
    }, [gameState.timeRemaining]);
    
    React.useEffect(() => {
      if (gameState.gameStatus === 'levelCompleted' && autoPlayerState.enabled) {
        if (!hasHookedRef.current) {
          toggleAutoPlayer(); // Tắt auto player sau khi hoàn thành level
        }
      }
    }, [gameState.gameStatus, autoPlayerState.enabled]);
    
    
    const hasHookedRef = React.useRef(false);

    React.useEffect(() => {
      if (
        autoPlayerState.enabled &&
        gameState.hookState === 'swinging' &&
        gameState.gameStatus === 'playing' &&
        !hasHookedRef.current
      ) {
        const decision = ({
          hookAngle: gameState.hookAngle,
          items: gameState.items,
          targetScore: gameState.targetScore,
          timeRemaining: gameState.timeRemaining,
        });
    
        // Đảm bảo decision có đủ điều kiện để gọi toggleHook
        if (decision.hookAngle) {
          toggleHook();
          hasHookedRef.current = true;
        }
      }
    
      if (gameState.hookState !== 'swinging') {
        hasHookedRef.current = false;
      }
    }, [
      autoPlayerState.enabled,
      gameState.hookState,
      gameState.hookAngle,
      gameState.gameStatus,
      gameState.items,
      gameState.timeRemaining,
      gameState.targetScore,
    ]);
    
    
    
    
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
  isAutoPlayActive={autoPlayerState.enabled} // ✅ Sửa chỗ này
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
