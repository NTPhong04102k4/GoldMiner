import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { R } from '../../assets';
import { GameItem, HookState } from '../engine/type';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
export const GAME_CONFIG = {
  ROPE_MIN_LENGTH: 50,
  ROPE_MAX_LENGTH: 2000,
  ROPE_WIDTH: 3,
  HOOK_SIZE: 30,
  SWING_ANGLE_MAX: 80,
  SWING_DURATION: 1500, 
  EXTEND_SPEED: 3, 
  BASE_RETRACT_SPEED: 3, 
  HOOK_ORIGIN_X: SCREEN_WIDTH / 2,
  HOOK_ORIGIN_Y: SCREEN_HEIGHT * 0.15,
};

// Animation configuration
const easing = Easing.inOut(Easing.sin);

interface AnimatedHookProps {
  hookState: HookState;
  caughtItem: GameItem | null;
  onExtendComplete: () => void;
  onRetractComplete: () => void;
  onItemCaught: (item: GameItem) => void;
  checkCollision: (
    angle: number,
    length: number,
    callback: (item: GameItem) => void,
  ) => GameItem | null;
  getRetractionSpeed: (weight: number) => number;
  onItemVisibilityChange?: (itemId: string | number, visible: boolean) => void;
  onAngleChange?: (angle: number) => void; // Report current angle
}

export const AnimatedHook: React.FC<AnimatedHookProps> = ({
  hookState,
  caughtItem,
  onExtendComplete,
  onRetractComplete,
  onItemCaught,
  checkCollision,
  getRetractionSpeed,
  onItemVisibilityChange,
  onAngleChange,
}) => {
  // Animation values
  const swingAngle = useRef(new Animated.Value(0)).current;
  const ropeLength = useRef(new Animated.Value(GAME_CONFIG.ROPE_MIN_LENGTH)).current;
  const swingAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const caughtItemOpacity = useRef(new Animated.Value(1)).current;
  const extensionAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const retractionAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Track current animation values
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentLength, setCurrentLength] = useState(GAME_CONFIG.ROPE_MIN_LENGTH);
  const [isProcessingCollision, setIsProcessingCollision] = useState(false);

  // Add listeners to track current values
  useEffect(() => {
    const angleListener = swingAngle.addListener(({ value }) => {
      const newAngle = value * GAME_CONFIG.SWING_ANGLE_MAX;
      setCurrentAngle(newAngle);
      
      if (onAngleChange) {
        onAngleChange(newAngle);
      }
    });

    const lengthListener = ropeLength.addListener(({ value }) => {
      setCurrentLength(value);
    });

    return () => {
      // Clean up all animations and listeners
      swingAngle.removeListener(angleListener);
      ropeLength.removeListener(lengthListener);

      if (swingAnimation.current) {
        swingAnimation.current.stop();
      }
      if (extensionAnimation.current) {
        extensionAnimation.current.stop();
      }
      if (retractionAnimation.current) {
        retractionAnimation.current.stop();
      }
    };
  }, []);

  // Reset collision processing when state changes to retracting
  useEffect(() => {
    if (hookState === 'retracting') {
      setIsProcessingCollision(false);
    }
    
    // Ensure retraction happens with or without caught item
    if (hookState === 'retracting') {
      retract();
    }
  }, [hookState]);

  // Rotation interpolation for the hook's swinging motion
  const rotation = swingAngle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [
      `-${GAME_CONFIG.SWING_ANGLE_MAX}deg`,
      '0deg',
      `${GAME_CONFIG.SWING_ANGLE_MAX}deg`,
    ],
  });

  // Handle hook state changes
  useEffect(() => {
    try {
      // Stop all ongoing animations first
      stopAllAnimations();
      
      if (hookState === 'swinging') {
        console.log('Starting swinging animation');
        startSwinging();
      } else if (hookState === 'extending') {
        console.log('Starting extending animation');
        extend();
      } else if (hookState === 'retracting') {
        console.log('Starting retracting animation');
        retract();
      } else if (hookState === 'pulling') {
        console.log('Hook is pulling - paused momentarily with item');
      } else {
        console.warn('Invalid hook state:', hookState);
        startSwinging();
      }
    } catch (error) {
      console.error('Error in hook state effect:', error);
      startSwinging();
    }
  }, [hookState]);

  // Stop all animations helper
  const stopAllAnimations = () => {
    if (swingAnimation.current) {
      swingAnimation.current.stop();
      swingAnimation.current = null;
    }
    
    if (extensionAnimation.current) {
      extensionAnimation.current.stop();
      extensionAnimation.current = null;
    }
    
    if (retractionAnimation.current) {
      retractionAnimation.current.stop();
      retractionAnimation.current = null;
    }
  };

  // Check for collisions while extending
  useEffect(() => {
    if (hookState === 'extending' && !isProcessingCollision && !caughtItem) {
      const collision = checkCollision(currentAngle, currentLength, item => {
        // Mark that we're handling a collision
        setIsProcessingCollision(true);
        
        // Hide the item in the parent component
        if (onItemVisibilityChange && item.id !== undefined) {
          console.log('Hiding original item:', item.id);
          onItemVisibilityChange(item.id, false);
        }
        
        // Notify parent about the caught item
        onItemCaught(item);
      });

      // If a collision was detected directly
      if (collision && !isProcessingCollision) {
        setIsProcessingCollision(true);
        
        // Hide the item
        if (onItemVisibilityChange && collision.id !== undefined) {
          console.log('Hiding original item (direct):', collision.id);
          onItemVisibilityChange(collision.id, false);
        }
      }
    }
  }, [currentLength, currentAngle, hookState, caughtItem, isProcessingCollision]);

  // Start the swinging animation
  const startSwinging = () => {
    // Reset rope length
    ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
    
    // Create swinging animation sequence
    swingAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(swingAngle, {
          toValue: 1,
          duration: GAME_CONFIG.SWING_DURATION / 2,
          easing: easing,
          useNativeDriver: true,
        }),
        Animated.timing(swingAngle, {
          toValue: -1,
          duration: GAME_CONFIG.SWING_DURATION,
          easing: easing,
          useNativeDriver: true,
        }),
        Animated.timing(swingAngle, {
          toValue: 0,
          duration: GAME_CONFIG.SWING_DURATION / 2,
          easing: easing,
          useNativeDriver: true,
        }),
      ]),
    );

    // Start the swinging animation
    swingAnimation.current.start();
  };

  // Extend the hook
  const extend = () => {
    try {
      const targetLength = Math.min(
        GAME_CONFIG.ROPE_MAX_LENGTH, 
        Math.max(SCREEN_HEIGHT * 0.75, 500)
      );
      
      console.log(`Extending rope to ${targetLength}px`);
  
      extensionAnimation.current = Animated.timing(ropeLength, {
        toValue: targetLength,
        duration: (targetLength - GAME_CONFIG.ROPE_MIN_LENGTH) / GAME_CONFIG.EXTEND_SPEED,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      
      extensionAnimation.current.start(({finished}) => {
        extensionAnimation.current = null;
        if (finished) {
          onExtendComplete();
        } else {
          console.warn('Extension animation did not finish properly');
          onExtendComplete();
        }
      });
    } catch (error) {
      console.error('Error in extend function:', error);
      onExtendComplete();
    }
  };

  // Retract the hook
  const retract = () => {
    try {
      // Ensure we don't have multiple retraction animations running
      if (retractionAnimation.current) {
        retractionAnimation.current.stop();
      }
      
      // Handle case where currentLength is not initialized
      if (typeof currentLength !== 'number' || isNaN(currentLength)) {
        ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
        onRetractComplete();
        return;
      }

      // Calculate retraction speed based on item weight
      const retractionSpeed = caughtItem
        ? getRetractionSpeed(caughtItem.weight)
        : GAME_CONFIG.BASE_RETRACT_SPEED;

      // Make sure we're retracting from the current position
      const retractDistance = Math.max(0, currentLength - GAME_CONFIG.ROPE_MIN_LENGTH);
      
      // Make sure duration is reasonable - not too fast, not too slow
      let retractDuration = Math.max(500, retractDistance / retractionSpeed);
      
      if (caughtItem) {
        // Increase duration for caught items but cap it to prevent too slow movement
        retractDuration = Math.min(3000, Math.max(1000, retractDuration * (1 + caughtItem.weight / 10)));
        console.log(`Retracting with item of weight ${caughtItem.weight}, duration: ${retractDuration}ms`);
      }

      // Animate rope retraction
      retractionAnimation.current = Animated.timing(ropeLength, {
        toValue: GAME_CONFIG.ROPE_MIN_LENGTH,
        duration: retractDuration,
        // More natural retraction easing
        easing: caughtItem ? Easing.out(Easing.sin) : Easing.linear,
        useNativeDriver: false,
      });
      
      retractionAnimation.current.start(({finished}) => {
        retractionAnimation.current = null;
        
        if (finished) {
          // Make sure we actually reached the target position
          ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
          
          // If item was caught, animate its disappearance
          if (caughtItem) {
            try {
              // Fade out caught item
              Animated.timing(caughtItemOpacity, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }).start(() => {
                // Reset opacity for next item
                caughtItemOpacity.setValue(1);
                // Signal completion
                onRetractComplete();
              });
            } catch (error) {
              console.error('Error animating caught item:', error);
              caughtItemOpacity.setValue(1);
              onRetractComplete();
            }
          } else {
            onRetractComplete();
          }
        } else {
          // Ensure we get to a safe state
          ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
          onRetractComplete();
        }
      });
    } catch (error) {
      console.error('Error in retract function:', error);
      // Return to safe state
      ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
      onRetractComplete();
    }
  };

  // Get the image source for a caught item
  const getItemSource = (item: GameItem) => {
    if (!item || !item.type) {
      console.warn('Invalid item or item type in getItemSource');
      return R.images.vang_1;
    }
  
    switch (item.type) {
      case 'gold1':
        return R.images.vang_1;
      case 'gold2':
        return R.images.vang_2;
      case 'gold3':
        return R.images.vang_3;
      case 'gold4':
        return R.images.vang_4;
      case 'rock1':
        return R.images.stone_1;
      case 'rock2':
        return R.images.stone_2;
      case 'tnt':
        return R.images.tnt1;
      default:
        return R.images.vang_1;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.ropeOrigin}>
        {/* Rotating container for the rope and hook */}
        <Animated.View
          style={[styles.ropeContainer, {transform: [{rotate: rotation}]}]}>
          {/* The rope */}
          <Animated.View 
            style={[
              styles.rope, 
              {height: ropeLength}
            ]} 
          />
  
          {/* The hook */}
          <Animated.View
            style={[
              styles.hook,
              {
                position: 'absolute',
                top: ropeLength,
              },
            ]}>
            <Image
              source={R.images.moc}
              style={{
                width: GAME_CONFIG.HOOK_SIZE,
                height: GAME_CONFIG.HOOK_SIZE,
              }}
            />
          </Animated.View>
  
          {/* Caught item (if any) */}
          {caughtItem && caughtItem.type && (
            <Animated.View
              style={[
                styles.caughtItem,
                {
                  position: 'absolute',
                  top: currentLength + GAME_CONFIG.HOOK_SIZE / 2,
                  opacity: caughtItemOpacity,
                },
              ]}>
              <Image
                source={getItemSource(caughtItem)}
                style={{
                  width: caughtItem.width || 30,
                  height: caughtItem.height || 30,
                }}
              />
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  ropeOrigin: {
    position: 'absolute',
    top: GAME_CONFIG.HOOK_ORIGIN_Y,
    left: GAME_CONFIG.HOOK_ORIGIN_X,
    alignItems: 'center',
  },
  ropeContainer: {
    alignItems: 'center',
    transformOrigin: 'top',
  },
  rope: {
    width: GAME_CONFIG.ROPE_WIDTH,
    backgroundColor: '#C8C6C6',
    position: 'absolute',
    top: 0,
  },
  hook: {
    width: GAME_CONFIG.HOOK_SIZE,
    height: GAME_CONFIG.HOOK_SIZE,
    position: 'absolute',
  },
  caughtItem: {
    position: 'absolute',
  },
});