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

const {width, height} = Dimensions.get('screen');
const maxLength = Math.sqrt((width * width) / 4 + Math.pow(height - 30, 2));
console.log(maxLength+"::::::::::::::");

// Tăng hệ số lên tối thiểu là 1.0 hoặc cao hơn để đảm bảo đủ dài
const rope = Math.min(500, maxLength * 1.0);

// Game configuration constants
export const GAME_CONFIG = {
  ROPE_MIN_LENGTH: 50,
  ROPE_MAX_LENGTH: rope,
  ROPE_WIDTH: 3,
  HOOK_SIZE: 30,
  SWING_ANGLE_MAX: 80,
  SWING_DURATION: 1500, 
  EXTEND_SPEED: 3, 
  BASE_RETRACT_SPEED: 3, 
  ITEM_PROXIMITY_THRESHOLD: 70, // detection distance
  HOOK_PREDICTION_STEP: 15, // future path check step size
  HOOK_MAX_PREDICTION_STEPS: 10, // future positions to check
};

// Animation configuration
const easing = Easing.inOut(Easing.sin);
// Global animation configuration
const ga = {
  targetRopeLength: null as number | null,
  extensionAnimationRef: null as Animated.CompositeAnimation | null,
  shouldAutoRetract: false,
  nearestItemInfo: null as { item: GameItem, distance: number } | null
};
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

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
  // Add new prop for angle reporting
  onAngleChange?: (angle: number) => void;
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
  onAngleChange, // New prop
}) => {
  // Animation values
  const swingAngle = useRef(new Animated.Value(0)).current;
  const ropeLength = useRef(new Animated.Value(GAME_CONFIG.ROPE_MIN_LENGTH)).current;
  const swingAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const caughtItemOpacity = useRef(new Animated.Value(1)).current;

  // Track current animation values
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentLength, setCurrentLength] = useState(GAME_CONFIG.ROPE_MIN_LENGTH);
  const [isProcessingCollision, setIsProcessingCollision] = useState(false);

  // Add listeners to track current values
  useEffect(() => {
    const angleListener = swingAngle.addListener(({ value }) => {
      // Convert interpolated value (-1 to 1) to degrees
      const newAngle = value * GAME_CONFIG.SWING_ANGLE_MAX;
      setCurrentAngle(newAngle);
      
      // Report angle to parent component for autoplay
      if (onAngleChange) {
        onAngleChange(newAngle);
      }
    });

    const lengthListener = ropeLength.addListener(({ value }) => {
      setCurrentLength(value);
    });

    return () => {
      swingAngle.removeListener(angleListener);
      ropeLength.removeListener(lengthListener);

      // Stop any ongoing animations
      if (swingAnimation.current) {
        swingAnimation.current.stop();
      }
      if (ga.extensionAnimationRef) {
        ga.extensionAnimationRef.stop();
        ga.extensionAnimationRef = null;
      }
      
      // Reset global state
      ga.shouldAutoRetract = false;
      ga.nearestItemInfo = null;
    };
  }, []);

  // Handle hook state changes
  useEffect(() => {
    if (hookState === 'retracting' && isProcessingCollision) {
      setIsProcessingCollision(false);
    }

    // Reset auto-retract flag when state changes
    if (hookState !== 'extending') {
      ga.shouldAutoRetract = false;
    }

    // Ensure retraction even without caught item
    if (hookState === 'retracting' && caughtItem === null) {
      retract();
    }
  }, [hookState, caughtItem]);

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
        // When in 'pulling' state, pause temporarily
        
        // Stop swinging animation if running
        if (swingAnimation.current) {
          swingAnimation.current.stop();
        }
        
        // Stop extension animation if running
        if (ga.extensionAnimationRef) {
          ga.extensionAnimationRef.stop();
          ga.extensionAnimationRef = null;
        }
      } else {
        // Invalid state, revert to swinging
        console.warn('Invalid hook state:', hookState);
        startSwinging();
      }
    } catch (error) {
      console.error('Error in hook state effect:', error);
      // Revert to safe state
      startSwinging();
    }
  }, [hookState]);

  // Check for collisions while extending
  useEffect(() => {
    if (hookState === 'extending' && !isProcessingCollision) {
      // Check for direct collisions
      const collision = checkCollision(currentAngle, currentLength, item => {
        // Callback when collision is detected
        setIsProcessingCollision(true);
        
        // Hide the item in the parent component
        if (onItemVisibilityChange && item.id !== undefined) {
          console.log('Hiding original item:', item.id);
          onItemVisibilityChange(item.id, false);
        }
        
        // Call the original onItemCaught callback
        onItemCaught(item);
      });

      // If collision found, stop checking
      if (collision) {
        setIsProcessingCollision(true);
        
        // Also hide the item returned directly if not handled by callback
        if (onItemVisibilityChange && collision.id !== undefined) {
          console.log('Hiding original item (direct):', collision.id);
          onItemVisibilityChange(collision.id, false);
        }
      } else {
        // Check for items in the future path of the hook
        checkItemsInFuturePath();
      }
    }
  }, [currentLength, currentAngle, hookState]);

  // Check for items in the future path of the hook
  const checkItemsInFuturePath = () => {
    if (ga.shouldAutoRetract) return; // Skip if already decided to retract
    
    // Calculate hook origin position
    const hookOriginX = SCREEN_WIDTH / 2;
    const hookOriginY = SCREEN_HEIGHT * 0.15;
    
    // Calculate current hook endpoint
    const angleRad = -currentAngle * (Math.PI / 180);
    const hookX = Math.sin(angleRad) * currentLength;
    const hookY = Math.cos(angleRad) * currentLength;
    const currentHookEndX = hookOriginX + hookX;
    const currentHookEndY = hookOriginY + hookY;
    
    // Check several positions ahead in the hook's path
    let nearestItem: GameItem | null = null;
    let nearestDistance = Infinity;
    
    // Check future positions, increasing length each time
    for (let step = 1; step <= GAME_CONFIG.HOOK_MAX_PREDICTION_STEPS; step++) {
      // Calculate future hook length
      const futureLength = currentLength + (step * GAME_CONFIG.HOOK_PREDICTION_STEP);
      
      // Don't check beyond maximum rope length
      if (futureLength > GAME_CONFIG.ROPE_MAX_LENGTH) break;
      
      // Calculate future hook position
      const futureHookX = Math.sin(angleRad) * futureLength;
      const futureHookY = Math.cos(angleRad) * futureLength;
      const futureHookEndX = hookOriginX + futureHookX;
      const futureHookEndY = hookOriginY + futureHookY;
      
      // Custom callback to detect items without triggering catching
      const detectCallback = (item: GameItem) => {
        // Calculate distance from current hook to item center
        const itemCenterX = item.x + item.width / 2;
        const itemCenterY = item.y + item.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(currentHookEndX - itemCenterX, 2) + 
          Math.pow(currentHookEndY - itemCenterY, 2)
        );
        
        // Store nearest item
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestItem = item;
        }
      };
      
      // Check for items at this future position
      const result = checkCollision(currentAngle, futureLength, detectCallback);
      
      // Also consider items returned directly
      if (result) {
        const itemCenterX = result.x + result.width / 2;
        const itemCenterY = result.y + result.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(currentHookEndX - itemCenterX, 2) + 
          Math.pow(currentHookEndY - itemCenterY, 2)
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestItem = result;
        }
      }
    }
    
    // Update global state with nearest item info
    ga.nearestItemInfo = nearestItem ? { item: nearestItem, distance: nearestDistance } : null;
    
    // Auto-retract if item is within proximity threshold
    if (nearestItem && nearestDistance <= GAME_CONFIG.ITEM_PROXIMITY_THRESHOLD) {
      console.log(`Item ${nearestItem.type} detected nearby at ${nearestDistance.toFixed(2)}px - auto-retracting`);
      
      // Mark for auto-retract
      ga.shouldAutoRetract = true;
      
      // Stop extension animation
      if (ga.extensionAnimationRef) {
        ga.extensionAnimationRef.stop();
        ga.extensionAnimationRef = null;
      }
      
      // Signal extension complete to trigger retraction
      onExtendComplete();
    }
  };

  // Start the swinging animation
  const startSwinging = () => {
    // Reset rope length
    ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
    
    // Reset auto-retract flags
    ga.shouldAutoRetract = false;
    ga.nearestItemInfo = null;

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
          easing: Easing.inOut(Easing.sin),
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
      // Stop the swinging animation
      if (swingAnimation.current) {
        swingAnimation.current.stop();
      }
  
      // Reset auto-retract flags
      ga.shouldAutoRetract = false;
      ga.nearestItemInfo = null;
  
      // Get current screen height
      const { height: CURRENT_SCREEN_HEIGHT } = Dimensions.get('screen');
      
      // Calculate target length based on screen size (75% of screen height)
      const targetLength = ga.targetRopeLength || Math.min(
        GAME_CONFIG.ROPE_MAX_LENGTH,
        CURRENT_SCREEN_HEIGHT * 0.75
      );
      
      console.log(`Extending rope to ${targetLength}px (screen height: ${CURRENT_SCREEN_HEIGHT}px)`);
  
      // Animate the rope extension
      ga.extensionAnimationRef = Animated.timing(ropeLength, {
        toValue: targetLength,
        duration: (targetLength - GAME_CONFIG.ROPE_MIN_LENGTH) / GAME_CONFIG.EXTEND_SPEED,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      
      ga.extensionAnimationRef.start(({finished}) => {
        ga.extensionAnimationRef = null;
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
      // Stop extension animation if still running
      if (ga.extensionAnimationRef) {
        ga.extensionAnimationRef.stop();
        ga.extensionAnimationRef = null;
      }
      
      // Handle case where currentLength is not initialized
      if (typeof currentLength !== 'number') {
        ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
        onRetractComplete();
        return;
      }

      // Calculate retraction speed based on item weight
      const retractionSpeed = caughtItem
        ? getRetractionSpeed(caughtItem.weight)
        : GAME_CONFIG.BASE_RETRACT_SPEED;

      // Calculate retraction distance
      const retractDistance = Math.max(0, currentLength - GAME_CONFIG.ROPE_MIN_LENGTH);
      
      // Adjust retraction duration based on item weight
      // Heavier items retract slower
      let retractDuration = Math.max(100, retractDistance / retractionSpeed);
      
      if (caughtItem) {
        // Increase duration for caught items with smooth animation
        retractDuration = Math.max(1000, retractDuration * (1 + caughtItem.weight / 10));
        console.log(`Retracting with item of weight ${caughtItem.weight}, duration: ${retractDuration}ms`);
      } else if (ga.shouldAutoRetract && ga.nearestItemInfo) {
        // Faster auto-retract for proximity detection
        console.log(`Auto-retracting: detected item nearby at ${ga.nearestItemInfo.distance.toFixed(2)}px`);
        retractDuration = Math.max(300, retractDuration * 0.6);
        ga.shouldAutoRetract = false;
      }

      // Animate rope retraction
      Animated.timing(ropeLength, {
        toValue: GAME_CONFIG.ROPE_MIN_LENGTH,
        duration: retractDuration,
        // More natural retraction easing
        easing: caughtItem ? Easing.out(Easing.cubic) : Easing.linear,
        useNativeDriver: false,
      }).start(({finished}) => {
        if (finished) {
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
            // Reset auto-retract state
            ga.shouldAutoRetract = false;
            ga.nearestItemInfo = null;
            onRetractComplete();
          }
        } else {
          // Ensure callback is called even if animation doesn't finish
          ga.shouldAutoRetract = false;
          ga.nearestItemInfo = null;
          onRetractComplete();
        }
      });
    } catch (error) {
      console.error('Error in retract function:', error);
      // Return to safe state
      ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
      ga.shouldAutoRetract = false;
      ga.nearestItemInfo = null;
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
                  // marginLeft: -((caughtItem.width || 30) / 2),
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
    top: SCREEN_HEIGHT * 0.15,
    left: SCREEN_WIDTH / 2,
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

