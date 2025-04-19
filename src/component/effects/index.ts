// Example of how to integrate the components into your game

// Import necessary components and game engine
import React, {useState, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {useGameEngine, GameItem} from './src/engine/GameEngine';
import AnimatedHook from './src/components/AnimatedHook';
import GoldMinerGameScreen from './src/screens/GoldMinerGameScreen';
import {
  Explosion,
  GoldSparkle,
  SplashEffect,
} from './src/components/SpecialEffects';

// Example effects management component
const EffectsManager = ({gameState}) => {
  const [effects, setEffects] = useState([]);

  // Track changes to the game state to create effects
  useEffect(() => {
    // Check if an item was just collected
    if (gameState.caughtItem && gameState.hookState === 'retracting') {
      // Add appropriate effect based on item type
      const item = gameState.caughtItem;
      const newEffect = {
        id: `effect-${Date.now()}`,
        type: item.type.includes('gold')
          ? 'sparkle'
          : item.type === 'tnt'
          ? 'explosion'
          : 'splash',
        x: item.x + item.width / 2,
        y: item.y + item.height / 2,
        radius: item.type === 'tnt' ? item.explosionRadius || 100 : 20,
      };

      setEffects(prev => [...prev, newEffect]);
    }
  }, [gameState.caughtItem, gameState.hookState]);

  // Remove effect when animation completes
  const handleEffectComplete = effectId => {
    setEffects(prev => prev.filter(effect => effect.id !== effectId));
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {effects.map(effect => {
        if (effect.type === 'explosion') {
          return (
            <Explosion
              key={effect.id}
              x={effect.x}
              y={effect.y}
              radius={effect.radius}
              onComplete={() => handleEffectComplete(effect.id)}
            />
          );
        } else if (effect.type === 'sparkle') {
          return (
            <GoldSparkle
              key={effect.id}
              x={effect.x}
              y={effect.y}
              onComplete={() => handleEffectComplete(effect.id)}
            />
          );
        } else if (effect.type === 'splash') {
          return (
            <SplashEffect
              key={effect.id}
              x={effect.x}
              y={effect.y}
              onComplete={() => handleEffectComplete(effect.id)}
            />
          );
        }
        return null;
      })}
    </View>
  );
};

// How to use in App.js or your main component

// Example of implementing hook animation in your AnimatedHook component
// This shows how to handle the state transition between extending and retracting

const handleExtendingState = () => {
  // Current rope length from Animated.Value
  const currentLength = ropeLength.__getValue();

  // Check if at maximum length
  if (currentLength >= GAME_CONFIG.ROPE_MAX_LENGTH) {
    // Start retracting if no collision yet
    if (!caughtItem) {
      // Create splash effect at end of rope
      const hookAngleRad = (currentAngle * Math.PI) / 180;
      const hookX = originX + Math.sin(hookAngleRad) * currentLength;
      const hookY = originY + Math.cos(hookAngleRad) * currentLength;

      // Create splash effect
      createSplashEffect(hookX, hookY);

      // Start retracting
      startRetracting();
    }
  } else {
    // Continue checking for collisions
    const collisionItem = checkCollisions(currentAngle, currentLength);

    if (collisionItem) {
      // Create appropriate effect based on item type
      const itemX = collisionItem.x + collisionItem.width / 2;
      const itemY = collisionItem.y + collisionItem.height / 2;

      if (collisionItem.type === 'tnt') {
        createExplosionEffect(
          itemX,
          itemY,
          collisionItem.explosionRadius || 100,
        );
      } else if (collisionItem.type.includes('gold')) {
        createSparkleEffect(itemX, itemY);
      }

      // Set caught item and start retracting
      setCaughtItem(collisionItem);
      startRetracting();
    }
  }
};

// Example of how to integrate sound effects
const playSoundEffect = type => {
  switch (type) {
    case 'swing':
      // Play rope swing sound
      Audio.Sound.createAsync(require('./assets/sounds/swing.mp3'), {
        volume: 0.5,
      }).then(({sound}) => sound.playAsync());
      break;

    case 'gold':
      // Play gold collection sound
      Audio.Sound.createAsync(require('./assets/sounds/gold.mp3'), {
        volume: 0.8,
      }).then(({sound}) => sound.playAsync());
      break;

    case 'explosion':
      // Play TNT explosion sound
      Audio.Sound.createAsync(require('./assets/sounds/explosion.mp3'), {
        volume: 1.0,
      }).then(({sound}) => sound.playAsync());
      break;

    case 'rock':
      // Play rock hit sound
      Audio.Sound.createAsync(require('./assets/sounds/rock.mp3'), {
        volume: 0.7,
      }).then(({sound}) => sound.playAsync());
      break;

    default:
      break;
  }
};
