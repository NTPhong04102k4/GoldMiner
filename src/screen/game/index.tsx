import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';

// Target object dimensions and position
const TARGET_WIDTH = 70;
const TARGET_HEIGHT = 50;
const TARGET_X = 150;
const TARGET_Y = 250;

const MAX_ROPE_LENGTH = 400; // Maximum length the rope can extend

// Item types and their pull durations
const ITEM_TYPES = {
  GOLD: 'gold',
  STONE: 'stone',
  DIAMOND: 'diamond',
};

const PULL_DURATIONS = {
  [ITEM_TYPES.GOLD]: 1200,
  [ITEM_TYPES.STONE]: 3600, // 3x longer than gold
  [ITEM_TYPES.DIAMOND]: 400,  // Instant pull
};

export default function GameStart() {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const [ropeLength, setRopeLength] = useState(80); // Initial rope length as state
  const [isPulling, setIsPulling] = useState(false);
  const [isPullingItem, setIsPullingItem] = useState(false);
  const [hitTarget, setHitTarget] = useState(false);
  const [currentRotationDeg, setCurrentRotationDeg] = useState("0deg");
  const [itemType, setItemType] = useState(ITEM_TYPES.GOLD);
  const ropeLengthAnim = useRef(new Animated.Value(0)).current; // For animation tracking only
  const lastRotationValue = useRef(0); // Store last rotation value

  // Swing animation for the rope
  useEffect(() => {
    const swingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rotationAnim, {
            toValue: 0,  // Changed from -0.1 to 0 to prevent unwanted reset
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        Animated.timing(rotationAnim, {
          toValue: -1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rotationAnim, {
          toValue: 0,  // Changed from -0.1 to 0 to prevent unwanted reset
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    if (!isPulling && !isPullingItem) {
      // Start from the last known position
      if (lastRotationValue.current !== 0) {
        rotationAnim.setValue(lastRotationValue.current);
      }
      
      swingAnimation.start();
      
      // Add listener to update the rotation degree string
      const rotationListener = rotationAnim.addListener(({ value }) => {
        const degrees = Math.round(value * 80);
        lastRotationValue.current = value; // Store the current value
        setCurrentRotationDeg(`${degrees}deg`);
      });
      
      return () => {
        swingAnimation.stop();
        rotationAnim.removeListener(rotationListener);
      };
    }
  }, [isPulling, isPullingItem, rotationAnim]);

  // Listen to rope length animation and update the state
  useEffect(() => {
    const listener = ropeLengthAnim.addListener(({ value }) => {
      setRopeLength(80 + value * (MAX_ROPE_LENGTH - 80));
    });
    
    return () => {
      ropeLengthAnim.removeListener(listener);
    };
  }, [ropeLengthAnim]);

  // Handle pull action
  const handlePull = useCallback(() => {
    if (isPulling || isPullingItem) {return;}
    setIsPulling(true);
    setHitTarget(false);

    // Randomly select item type for this pull (for demonstration)
    const itemTypes = Object.values(ITEM_TYPES);
    const randomItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    setItemType(randomItem);

    // Get current rotation
    rotationAnim.stopAnimation((currentAngle) => {
      // Store current angle for collision detection
      lastRotationValue.current = currentAngle;
      const angleDegrees = currentAngle * 80; // -80 to 80 degrees range
      
      // Fix the rotation to current angle
      setCurrentRotationDeg(`${angleDegrees}deg`);
      
      // Extend the rope using animation value (0 to 1)
      Animated.timing(ropeLengthAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        checkCollision(currentAngle);
      });
    });
  }, [ isPulling, isPullingItem, ropeLengthAnim, rotationAnim]);

  // Calculate if rope hits target
  const checkCollision = (angleValue) => {
    // Convert normalized angle value to degrees
    const angleDegrees = angleValue * 80; // -80 to 80 degrees range
    const angleRadians = (angleDegrees * Math.PI) / 180;
    
    // Calculate the end position of the rope
    const endX = Math.sin(angleRadians) * ropeLength;
    const endY = Math.cos(angleRadians) * ropeLength;
    
    // Check if rope end is within target boundaries
    const ropeEndX = 200 + endX; // Adjust 200 to your rope's anchor point X
    const ropeEndY = 160 + endY; // Adjust 160 to your rope's anchor point Y
    
    const hit = 
      ropeEndX >= TARGET_X && 
      ropeEndX <= TARGET_X + TARGET_WIDTH &&
      ropeEndY >= TARGET_Y && 
      ropeEndY <= TARGET_Y + TARGET_HEIGHT;
    
    console.log(hit ? 'Trúng vật phẩm!' : 'Không trúng!', {
      ropeEndX, ropeEndY, angleValue, ropeLength, itemType,
    });
    
    setHitTarget(hit);
    
    // If hit, simulate pulling item with appropriate duration
    if (hit) {
      setIsPullingItem(true);
      // Simulate pulling item (delay retraction)
      setTimeout(() => {
        retractRope();
      }, PULL_DURATIONS[itemType]);
    } else {
      // Retract immediately if no hit
      retractRope();
    }
  };

  const retractRope = () => {
    Animated.timing(ropeLengthAnim, {
      toValue: 0, // Thu dây về vị trí gốc
      duration: 1200, 
      easing: Easing.out(Easing.exp), // Chậm dần khi về 0
      useNativeDriver: true,
    }).start(() => {
      setIsPulling(false);
      setIsPullingItem(false);
    });
}

  // Get color based on item type for demonstration
  const getItemColor = () => {
    switch(itemType) {
      case ITEM_TYPES.GOLD: return 'gold';
      case ITEM_TYPES.STONE: return 'gray';
      case ITEM_TYPES.DIAMOND: return 'lightblue';
      default: return 'gold';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.scoreSection}>
          <Text style={styles.moneyText}>$77</Text>
          <Text style={styles.scoreText}>20685</Text>
        </View>
        <View style={styles.minerContainer}>
          <Image source={require('../../assets/image/miner.png')} style={styles.miner} />
        </View>
        <View>
          <Text style={styles.levelText}>Level 12</Text>
          <Pressable style={styles.pauseButton}>
            <Text style={styles.pauseText}>TG :</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={handlePull} style={styles.gameArea}>
        {/* Target object */}
        <View 
          style={[
            styles.targetObject, 
            { 
              left: TARGET_X, 
              top: TARGET_Y, 
              width: TARGET_WIDTH, 
              height: TARGET_HEIGHT,
              opacity: hitTarget && isPullingItem ? 
                isPullingItem ? 0.5 : 1 : 1, // Fade when being pulled
              transform: [
                { 
                  translateX: hitTarget && isPullingItem ? 5 : 0, // Move up when being pulled
                }
              ],
            }
          ]} 
        />
        
        <View style={styles.ropeContainer}>
          <Animated.View
            style={[
              styles.rope,
              {
                height: ropeLength,
                transform: [
                  { 
                    rotate: isPulling || isPullingItem ? 
                      currentRotationDeg : 
                      rotationAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-80deg', '80deg'],
                      }),
                  }
                ],
              },
            ]}
          />
        </View>

        {/* Display the current state for debugging */}
        <View style={styles.debugInfo}>
          <Text>Item: {itemType}</Text>
          <Text>Pulling: {isPulling ? 'Yes' : 'No'}</Text>
          <Text>Pulling Item: {isPullingItem ? 'Yes' : 'No'}</Text>
          <Text>Hit: {hitTarget ? 'Yes' : 'No'}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7e7a1',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#ff9900',
  },
  scoreSection: {
    flexDirection: 'column',
  },
  moneyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
  },
  scoreText: {
    fontSize: 16,
    color: 'white',
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  pauseButton: {
    padding: 5,
    backgroundColor: 'green',
    borderRadius: 5,
  },
  pauseText: {
    color: 'white',
    fontSize: 16,
  },
  minerContainer: {
    alignItems: 'center',
  },
  miner: {
    width: 70,
    height: 70,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  ropeContainer: {
    position: 'absolute',
    top: 0,
    left: Dimensions.get('screen').height , // Center of screen (adjust based on your layout)
    alignItems: 'center',
    marginTop: 10,
    height: 150,
    justifyContent: 'flex-start',
  },
  rope: {
    width: 5,
    backgroundColor: 'brown',
    borderRadius: 100,
    transformOrigin: 'top center',
  },
  targetObject: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'brown',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
});