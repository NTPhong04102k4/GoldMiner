// src/components/EffectsManager.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

import { GameItem, GameState, HookState } from '../engine';
import { Explosion, GoldSparkle, PowerSparkle, SplashEffect } from '../specialEffect';

// Unique ID generator
const generateId = () => `effect-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Effect types
type EffectType = 'explosion' | 'sparkle' | 'splash' | 'power';

// Effect data structure
interface Effect {
  id: string;
  type: EffectType;
  x: number;
  y: number;
  radius?: number;
  duration?: number;
}

interface EffectsManagerProps {
  gameState: GameState;
  hookAngle: number;
  hookLength: number;
}

const EffectsManager: React.FC<EffectsManagerProps> = ({
  gameState,
  hookAngle,
  hookLength,
}) => {
  // State to track active effects
  const [effects, setEffects] = useState<Effect[]>([]);
  
  // Previous state refs to detect changes
  const [prevHookState, setPrevHookState] = useState<HookState>(gameState.hookState);
  const [prevCaughtItem, setPrevCaughtItem] = useState<GameItem | null>(gameState.caughtItem);
  
  // Handle changes to game state
  useEffect(() => {
    // Check for item collection (transition from extending to retracting with caught item)
    if (
      prevHookState === 'extending' && 
      gameState.hookState === 'retracting' && 
      gameState.caughtItem && 
      !prevCaughtItem
    ) {
      // Item just caught - create appropriate effect
      const item = gameState.caughtItem;
      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;
      
      // Determine effect type based on item
      let effectType: EffectType;
      let radius = 0;
      let duration = 800;
      
      if (item.type === 'tnt') {
        effectType = 'explosion';
        radius = item.explosionRadius || 100;
        duration = 1000;
      } else if (item.type.includes('gold') || item.type === 'barrel') {
        effectType = 'sparkle';
        duration = 800;
      } else {
        effectType = 'splash';
        duration = 500;
      }
      
      // Add new effect
      setEffects(prev => [
        ...prev,
        {
          id: generateId(),
          type: effectType,
          x: itemCenterX,
          y: itemCenterY,
          radius,
          duration,
        },
      ]);
    }
    
    // Check for missed hook (extends to max length and starts retracting without caught item)
    if (
      prevHookState === 'extending' &&
      gameState.hookState === 'retracting' &&
      !gameState.caughtItem
    ) {
      // Calculate hook position at maximum extension
      const radians = hookAngle * Math.PI / 180;
      const originX = Dimensions.get('window').width / 2;
      const originY = Dimensions.get('window').height * 0.15; // Assuming hook origin
      
      const hookX = originX + Math.sin(radians) * hookLength;
      const hookY = originY + Math.cos(radians) * hookLength;
      
      // Create splash effect at hook position
      setEffects(prev => [
        ...prev,
        {
          id: generateId(),
          type: 'splash',
          x: hookX,
          y: hookY,
          duration: 500,
        },
      ]);
    }
    
    // Update previous state refs
    setPrevHookState(gameState.hookState);
    setPrevCaughtItem(gameState.caughtItem);
  }, [gameState.hookState, gameState.caughtItem, prevHookState, prevCaughtItem, hookAngle, hookLength]);
  
  // Remove effect when animation completes
  const handleEffectComplete = (effectId: string) => {
    setEffects(prev => prev.filter(effect => effect.id !== effectId));
  };
  
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {effects.map(effect => {
        switch (effect.type) {
          case 'explosion':
            return (
              <Explosion
                key={effect.id}
                x={effect.x}
                y={effect.y}
                radius={effect.radius || 50}
                duration={effect.duration}
                onComplete={() => handleEffectComplete(effect.id)}
              />
            );
          
          case 'sparkle':
            return (
              <GoldSparkle
                key={effect.id}
                x={effect.x}
                y={effect.y}
                duration={effect.duration}
                onComplete={() => handleEffectComplete(effect.id)}
              />
            );
          
          case 'splash':
            return (
              <SplashEffect
                key={effect.id}
                x={effect.x}
                y={effect.y}
                duration={effect.duration}
                onComplete={() => handleEffectComplete(effect.id)}
              />
            );
          
          case 'power':
            return (
              <PowerSparkle
                key={effect.id}
                x={effect.x}
                y={effect.y}
                duration={effect.duration}
                onComplete={() => handleEffectComplete(effect.id)}
              />
            );
          
          default:
            return null;
        }
      })}
    </View>
  );
};

export default EffectsManager;