// src/component/hooks.tsx
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
// Giả định rằng trong chế độ ngang: width > height
const maxLength = Math.sqrt((width * width) / 4 + Math.pow(height - 30, 2));
const rope=Math.min(500, maxLength * 0.9)
// Cập nhật GAME_CONFIG
// Define game configuration constants
export const GAME_CONFIG = {
  ROPE_MIN_LENGTH: 50,
  ROPE_MAX_LENGTH:rope , // Giảm từ 400 xuống 300 để không kéo quá dài
  ROPE_WIDTH: 3,
  HOOK_SIZE: 30,
  SWING_ANGLE_MAX: 80,
  SWING_DURATION: 1500, // ms for a full swing
  EXTEND_SPEED: 3, // pixels per ms
  BASE_RETRACT_SPEED: 3, // pixels per ms
};


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
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

const AnimatedHook: React.FC<AnimatedHookProps> = ({
  hookState,
  caughtItem,
  onExtendComplete,
  onRetractComplete,
  onItemCaught,
  checkCollision,
  getRetractionSpeed,
}) => {
  // Refs to store animation values
  const swingAngle = useRef(new Animated.Value(0)).current;
  const ropeLength = useRef(
    new Animated.Value(GAME_CONFIG.ROPE_MIN_LENGTH),
  ).current;
  const swingAnimation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (hookState === 'retracting' && isProcessingCollision) {
      setIsProcessingCollision(false);
    }

    // Thêm xử lý đối tượng null/undefined
    if (hookState === 'retracting' && caughtItem === null) {
      // Đảm bảo rút về ngay cả khi không có đối tượng bị bắt
      retract();
    }
  }, [hookState, caughtItem]);
  // Ref to store caught item opacity animation
  const caughtItemOpacity = useRef(new Animated.Value(1)).current;

  // Rotation interpolation for the hook's swinging motion
  const rotation = swingAngle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [
      `-${GAME_CONFIG.SWING_ANGLE_MAX}deg`,
      '0deg',
      `${GAME_CONFIG.SWING_ANGLE_MAX}deg`,
    ],
  });

  // Track last known values of the animations
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentLength, setCurrentLength] = useState(
    GAME_CONFIG.ROPE_MIN_LENGTH,
  );
  const [isProcessingCollision, setIsProcessingCollision] = useState(false);

  // Add listeners to track current values
  useEffect(() => {
    const angleListener = swingAngle.addListener(({ value }) => {
      // Convert interpolated value (-1 to 1) to degrees
      setCurrentAngle(value * GAME_CONFIG.SWING_ANGLE_MAX);
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
    };
  }, []);

  // Handle hook state changes
// Cập nhật useEffect xử lý trạng thái hook trong AnimatedHook
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
      // Khi ở trạng thái 'pulling', chúng ta chỉ dừng lại
      // và không thực hiện animation nào, đợi engine chuyển sang 'retracting'
      
      // Dừng animation đung đưa nếu có
      if (swingAnimation.current) {
        swingAnimation.current.stop();
      }
      
      // Không gọi hàm extend hoặc retract để giữ nguyên vị trí hiện tại
    } else {
      // Nếu trạng thái không hợp lệ, trở về swinging
      console.warn('Invalid hook state:', hookState);
      startSwinging();
    }
  } catch (error) {
    console.error('Error in hook state effect:', error);
    // Trở về trạng thái an toàn
    startSwinging();
  }
}, [hookState]);

  // Check for collisions while extending
  useEffect(() => {
    if (hookState === 'extending' && !isProcessingCollision) {
      const collision = checkCollision(currentAngle, currentLength, item => {
        // This callback will be invoked if collision is detected
        setIsProcessingCollision(true);
        onItemCaught(item);
      });

      // If we found a collision, stop checking for more
      if (collision) {
        setIsProcessingCollision(true);
      }
    }
  }, [currentLength, currentAngle, hookState]);

  // Reset the collision processing flag when state changes from extending to retracting
  useEffect(() => {
    if (hookState === 'retracting' && isProcessingCollision) {
      setIsProcessingCollision(false);
    }
  }, [hookState]);

  // Start the swinging animation
  const startSwinging = () => {
    // Reset the rope length
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
  
      // Lấy kích thước màn hình hiện tại
      const { height: CURRENT_SCREEN_HEIGHT } = Dimensions.get('screen');
      
      // Tính toán độ dài tối đa dựa trên kích thước màn hình
      // Thường là khoảng 70-75% chiều cao màn hình để không kéo quá xa
      const dynamicMaxLength = Math.min(
        GAME_CONFIG.ROPE_MAX_LENGTH,
        CURRENT_SCREEN_HEIGHT * 0.85
      );
      
      console.log(`Extending rope to ${dynamicMaxLength}px (screen height: ${CURRENT_SCREEN_HEIGHT}px)`);
  
      // Animate the rope extension
      Animated.timing(ropeLength, {
        toValue: dynamicMaxLength,
        duration:
          (dynamicMaxLength - GAME_CONFIG.ROPE_MIN_LENGTH) /
          GAME_CONFIG.EXTEND_SPEED,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({finished}) => {
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
 // 1. Thêm xử lý lỗi cho hàm retract
 // Thay thế hàm retract trong component AnimatedHook để tạo hiệu ứng kéo từ từ
 const retract = () => {
  try {
    // Tránh lỗi khi currentLength chưa được khởi tạo
    if (typeof currentLength !== 'number') {
      ropeLength.setValue(GAME_CONFIG.ROPE_MIN_LENGTH);
      onRetractComplete();
      return;
    }

    // Calculate retraction speed based on caught item
    const retractionSpeed = caughtItem
      ? getRetractionSpeed(caughtItem.weight)
      : GAME_CONFIG.BASE_RETRACT_SPEED;

    // Calculate retraction duration - Tăng thời gian kéo lên để tạo hiệu ứng kéo chậm
    const retractDistance = Math.max(0, currentLength - GAME_CONFIG.ROPE_MIN_LENGTH);
    
    // Điều chỉnh thời gian kéo dựa trên khối lượng của vật phẩm
    // Vật phẩm càng nặng, kéo càng chậm
    let retractDuration = Math.max(100, retractDistance / retractionSpeed);
    
    // Điều chỉnh thời gian dựa trên vật phẩm
    if (caughtItem) {
      // Tăng thời gian lên tối thiểu 1000ms cho hiệu ứng mượt mà,
      // và thêm thời gian dựa trên weight để vật nặng kéo chậm hơn
      retractDuration = Math.max(1000, retractDuration * (1 + caughtItem.weight / 10));
      console.log(`Retracting with item of weight ${caughtItem.weight}, duration: ${retractDuration}ms`);
    }

    // Animate the rope retraction với thời gian đã điều chỉnh
    Animated.timing(ropeLength, {
      toValue: GAME_CONFIG.ROPE_MIN_LENGTH,
      duration: retractDuration,
      // Thay đổi easing để tạo hiệu ứng kéo tự nhiên hơn
      // Ban đầu kéo nhanh sau đó chậm dần
      easing: caughtItem ? Easing.out(Easing.cubic) : Easing.linear,
      useNativeDriver: false, // Layout properties không thể sử dụng native driver
    }).start(({finished}) => {
      if (finished) {
        // If an item was caught, animate its disappearance
        if (caughtItem) {
          try {
            // Tăng thời gian biến mất của vật phẩm
            Animated.timing(caughtItemOpacity, {
              toValue: 0,
              duration: 500, // Tăng từ 300ms lên 500ms
              easing: Easing.out(Easing.ease),
              useNativeDriver: true, // Opacity có thể sử dụng native driver
            }).start(() => {
              // Reset opacity for next time
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
        // Đảm bảo callback vẫn được gọi ngay cả khi animation không kết thúc
        onRetractComplete();
      }
    });
  } catch (error) {
    console.error('Error in retract function:', error);
    // Đảm bảo về trạng thái an toàn
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
                // marginLeft: -GAME_CONFIG.HOOK_SIZE / 2,
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
                  top: currentLength + GAME_CONFIG.HOOK_SIZE / 2, // Using the tracked state value instead
                  marginLeft: -((caughtItem.width || 30) / 2),
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

export default AnimatedHook;