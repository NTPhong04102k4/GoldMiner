// src/components/SpecialEffects.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExplosionProps {
  x: number;
  y: number;
  radius: number;
  duration?: number;
  onComplete?: () => void;
}

// Explosion component for TNT effect
export const Explosion: React.FC<ExplosionProps> = ({
  x,
  y,
  radius,
  duration = 800,
  onComplete,
}) => {
  // Animation values
  const explosionSize = useRef(new Animated.Value(0)).current;
  const explosionOpacity = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Create the explosion animation sequence
    const animation = Animated.parallel([
      // Expand from center
      Animated.timing(explosionSize, {
        toValue: radius,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Fade out gradually
      Animated.timing(explosionOpacity, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    
    // Start the animation
    animation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
    
    return () => {
      animation.stop();
    };
  }, [duration, explosionOpacity, explosionSize, onComplete, radius]);
  
  return (
    <Animated.View
      style={[
        styles.explosion,
        {
          left: x - radius,
          top: y - radius,
          width: explosionSize.interpolate({
            inputRange: [0, radius],
            outputRange: [0, radius * 2],
          }),
          height: explosionSize.interpolate({
            inputRange: [0, radius],
            outputRange: [0, radius * 2],
          }),
          borderRadius: explosionSize.interpolate({
            inputRange: [0, radius],
            outputRange: [0, radius],
          }),
          opacity: explosionOpacity,
        },
      ]}
    />
  );
};

interface GoldSparkleProps {
  x: number;
  y: number;
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

// Sparkle effect for collecting gold
export const GoldSparkle: React.FC<GoldSparkleProps> = ({
  x,
  y,
  count = 8,
  duration = 1000,
  onComplete,
}) => {
  // Create an array of animated particles using useState for initialization
  const [particles, setParticles] = useState(() => {
    const distanceValues = Array.from({ length: count }, () => new Animated.Value(0));
    const sizeValues = Array.from({ length: count }, () => new Animated.Value(10));
    const opacityValues = Array.from({ length: count }, () => new Animated.Value(1));
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i * 360) / count,
      distance: distanceValues[i],
      size: sizeValues[i],
      opacity: opacityValues[i],
    }));
  });
  
  useEffect(() => {
    // Animate all particles
    const animations = particles.map(particle => {
      return Animated.parallel([
        // Move outward
        Animated.timing(particle.distance, {
          toValue: 50 + Math.random() * 30,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        // Shrink size
        Animated.timing(particle.size, {
          toValue: 2,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        // Fade out
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]);
    });
    
    // Run all animations together
    const masterAnimation = Animated.parallel(animations);
    masterAnimation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
    
    return () => {
      masterAnimation.stop();
    };
  }, [duration, onComplete, particles]);
  
  return (
    <View style={[styles.sparkleContainer, { left: x, top: y }]}>
      {particles.map(particle => {
        // Calculate position based on angle and distance
        const radians = (particle.angle * Math.PI) / 180;
        
        // Calculate transform values
        const translateX = particle.distance.interpolate({
          inputRange: [0, 100],
          outputRange: [0, 100 * Math.cos(radians)],
        });
        
        const translateY = particle.distance.interpolate({
          inputRange: [0, 100],
          outputRange: [0, 100 * Math.sin(radians)],
        });
        
        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.sparkleParticle,
              {
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
                transform: [
                  { translateX },
                  { translateY },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

interface RopeSwingEffectProps {
  isSwinging: boolean;
}

// Rope swinging air effect
export const RopeSwingEffect: React.FC<RopeSwingEffectProps> = ({
  isSwinging,
}) => {
  const swingOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isSwinging) {
      // Create pulsing effect during swinging
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(swingOpacity, {
            toValue: 0.2,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(swingOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      
      animation.start();
      
      return () => {
        animation.stop();
      };
    } else {
      // Reset opacity when not swinging
      swingOpacity.setValue(0);
    }
  }, [isSwinging, swingOpacity]);
  
  // Only render the effect when swinging
  if (!isSwinging) return null;
  
  return (
    <Animated.View
      style={[
        styles.swingEffect,
        {
          opacity: swingOpacity,
        },
      ]}
    />
  );
};

interface SplashEffectProps {
  x: number;
  y: number;
  duration?: number;
  onComplete?: () => void;
}

// Water splash effect when hook hits nothing
export const SplashEffect: React.FC<SplashEffectProps> = ({
  x,
  y,
  duration = 500,
  onComplete,
}) => {
  // Animation values
  const splashSize = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Animate the splash effect
    const animation = Animated.parallel([
      Animated.timing(splashSize, {
        toValue: 30,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]);
    
    animation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
    
    return () => {
      animation.stop();
    };
  }, [duration, splashSize, splashOpacity, onComplete]);
  
  // Create multiple splash droplets
  return (
    <View style={[styles.splashContainer, { left: x, top: y }]}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
        const radians = (angle * Math.PI) / 180;
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.splashDrop,
              {
                width: splashSize.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 10],
                }),
                height: splashSize.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 10],
                }),
                opacity: splashOpacity,
                transform: [
                  {
                    translateX: splashSize.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 20 * Math.cos(radians)],
                    }),
                  },
                  {
                    translateY: splashSize.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 20 * Math.sin(radians)],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Sparkle effect on hook when power item is collected
export const PowerSparkle: React.FC<GoldSparkleProps> = ({
  x,
  y,
  count = 12,
  duration = 1500,
  onComplete,
}) => {
  // Animation values for a circular pulsing effect
  const pulseSize = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;
  
  // Create sparkle animations using useState
  const [sparkles] = useState(() => 
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      angle: (i * 360) / count,
      size: new Animated.Value(0),
      opacity: new Animated.Value(0)
    }))
  );
  
  useEffect(() => {
    // Create animations
    const animations = [
      // Expand pulse
      Animated.timing(pulseSize, {
        toValue: 40,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Fade out pulse
      Animated.timing(pulseOpacity, {
        toValue: 0,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // Rotate
      Animated.timing(rotationValue, {
        toValue: 360,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ];
    
    // Run animations in parallel
    const masterAnimation = Animated.parallel(animations);
    masterAnimation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
    
    return () => {
      masterAnimation.stop();
    };
  }, [duration, pulseSize, pulseOpacity, rotationValue, onComplete]);
  
  // Start individual sparkle animations
  useEffect(() => {
    sparkles.forEach((sparkle, i) => {
      const delay = i * (duration / count / 2);
      
      const delayTimer = setTimeout(() => {
        Animated.sequence([
          // Appear
          Animated.timing(sparkle.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          // Parallel animations
          Animated.parallel([
            // Grow
            Animated.timing(sparkle.size, {
              toValue: 8,
              duration: 400,
              useNativeDriver: false,
            }),
            // Fade
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 400,
              delay: 200,
              useNativeDriver: false,
            }),
          ]),
        ]).start();
      }, delay);
      
      return () => clearTimeout(delayTimer);
    });
  }, [sparkles, duration, count]);
  
  // Convert rotation to string
  const rotation = rotationValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <View style={[styles.powerContainer, { left: x, top: y }]}>
      <Animated.View
        style={[
          styles.powerPulse,
          {
            width: pulseSize,
            height: pulseSize,
            borderRadius: Animated.divide(pulseSize, 2),
            opacity: pulseOpacity,
            transform: [{ rotate: rotation }],
          },
        ]}
      />
      
      {sparkles.map((sparkle) => {
        const radians = (sparkle.angle * Math.PI) / 180;
        
        return (
          <Animated.View
            key={sparkle.id}
            style={[
              styles.powerSparkle,
              {
                width: sparkle.size,
                height: sparkle.size,
                opacity: sparkle.opacity,
                left: 20 * Math.cos(radians),
                top: 20 * Math.sin(radians),
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  explosion: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 140, 0, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 0, 0.8)',
  },
  sparkleContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 10,
  },
  sparkleParticle: {
    position: 'absolute',
    backgroundColor: '#FFD700', // Gold color
    borderRadius: 5,
  },
  swingEffect: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1,
  },
  splashContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 5,
  },
  splashDrop: {
    position: 'absolute',
    backgroundColor: '#80C4DE', // Light blue water color
    borderRadius: 5,
  },
  powerContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 15,
  },
  powerPulse: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#00FFFF',
    backgroundColor: 'transparent',
    marginLeft: -20,
    marginTop: -20,
  },
  powerSparkle: {
    position: 'absolute',
    backgroundColor: '#00FFFF',
    borderRadius: 4,
  },
});

export default {
  Explosion,
  GoldSparkle,
  RopeSwingEffect,
  SplashEffect,
  PowerSparkle,
};