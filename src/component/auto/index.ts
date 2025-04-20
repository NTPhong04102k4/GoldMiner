import { useState, useEffect, useRef } from 'react';
import { GameItem } from '../engine/type';
import { useGameEngine } from '../engine';
import { Dimensions } from 'react-native';

// Define value priorities for different item types
const ITEM_PRIORITIES = {
  gold4: 10, // Diamond (highest priority)
  gold3: 8, // Large gold nugget
  gold2: 6, // Medium gold nugget
  gold1: 4, // Small gold nugget
  rock2: 2, // Large rock
  rock1: 1, // Small rock
  tnt: -5, // TNT (avoid)
};
const { width, height } = Dimensions.get('screen');
// Calculate value-to-weight ratio with priority multiplier
const calculateItemScore = (item: GameItem): number => {
  const priorityMultiplier = ITEM_PRIORITIES[item.type] || 0;
  const valueToWeightRatio = item.value / (item.weight || 1);

  // Score formula: priority * value-to-weight ratio
  return priorityMultiplier * valueToWeightRatio;
};

// Interface for auto player configuration
interface AutoPlayerConfig {
  enabled: boolean;
  intelligenceLevel: 'basic' | 'advanced' | 'expert';
  riskTolerance: number; // 0-1, higher means more willing to go for risky items
  preferHighValue: boolean; // Prioritize high value items over easy catches
  avoidTNT: boolean; // Whether to completely avoid TNT
}

// Default configuration
const DEFAULT_CONFIG: AutoPlayerConfig = {
  enabled: true,
  intelligenceLevel: 'advanced',
  riskTolerance: 0.6,
  preferHighValue: true,
  avoidTNT: true,
};

export const useAutoPlayer = (config: Partial<AutoPlayerConfig> = {}) => {
  // Merge provided config with defaults
  const playerConfig = { ...DEFAULT_CONFIG, ...config };

  // Reference to game engine
  const gameEngine = useGameEngine();
  const { gameState, toggleHook } = gameEngine;

  // Auto player state
  const [autoPlayerState, setAutoPlayerState] = useState({
    enabled: playerConfig.enabled,
    thinking: false,
    targetItem: null as GameItem | null,
    lastActionTime: 0,
    decisionLog: [] as string[],
  });

  // Timers and refs
  const decisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayActiveRef = useRef(playerConfig.enabled);

  // Log decisions for debugging
  const logDecision = (message: string) => {
    setAutoPlayerState(prev => ({
      ...prev,
      decisionLog: [...prev.decisionLog.slice(-9), message],
    }));
    console.log(`[AutoPlayer] ${message}`);
  };

  // Toggle auto player on/off
  const toggleAutoPlayer = () => {
    setAutoPlayerState(prev => {
      const newEnabled = !prev.enabled;
      autoplayActiveRef.current = newEnabled;

      if (newEnabled) {
        logDecision('Auto player enabled');
        startDecisionProcess();
      } else {
        logDecision('Auto player disabled');
        stopDecisionProcess();
      }

      return {
        ...prev,
        enabled: newEnabled,
      };
    });
  };

  // Set configuration
  const setConfig = (newConfig: Partial<AutoPlayerConfig>) => {
    const updatedConfig = { ...playerConfig, ...newConfig };

    // Update state and refs
    autoplayActiveRef.current = updatedConfig.enabled;
    setAutoPlayerState(prev => ({
      ...prev,
      enabled: updatedConfig.enabled,
    }));

    logDecision(`Config updated: ${JSON.stringify(newConfig)}`);

    // Restart decision process if needed
    if (updatedConfig.enabled && !decisionTimerRef.current) {
      startDecisionProcess();
    } else if (!updatedConfig.enabled && decisionTimerRef.current) {
      stopDecisionProcess();
    }

    return updatedConfig;
  };

  // Start the decision-making process
  const startDecisionProcess = () => {
    if (decisionTimerRef.current) {
      clearInterval(decisionTimerRef.current);
    }

    // Make decisions every 100ms
    decisionTimerRef.current = setInterval(() => {
      if (!autoplayActiveRef.current || gameState.gameStatus !== 'playing') {
        return;
      }

      makeDecision();
    }, 100);

    logDecision('Decision process started');
  };

  // Stop the decision-making process
  const stopDecisionProcess = () => {
    if (decisionTimerRef.current) {
      clearInterval(decisionTimerRef.current);
      decisionTimerRef.current = null;
    }

    logDecision('Decision process stopped');
  };

  // Calculate the angle needed to hit a target item
  const calculateTargetAngle = (item: GameItem): number => {
    // Get screen dimensions from gameState
    const { width: screenWidth, height: screenHeight } = {
      width: width,
      height: height,
    };

    // Hook origin (assuming top center of screen)
    const hookOriginX = screenWidth / 2;
    const hookOriginY = screenHeight * 0.15;

    // Item center coordinates
    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    // Calculate relative position
    const relativeX = itemCenterX - hookOriginX;
    const relativeY = itemCenterY - hookOriginY;

    // Calculate angle in radians, then convert to degrees
    // Using atan2 for correct quadrant handling
    let angle = Math.atan2(relativeX, relativeY) * (180 / Math.PI);

    // Invert angle to match game's angle system
    angle = -angle;

    // Clamp to game's angle limits (-80 to 80 degrees)
    angle = Math.max(-80, Math.min(80, angle));

    return angle;
  };

  // Calculate the distance to a target item
  const calculateDistance = (item: GameItem): number => {
    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = {
      width: width,
      height: height,
    };

    // Hook origin
    const hookOriginX = screenWidth / 2;
    const hookOriginY = screenHeight * 0.15;

    // Item center
    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    // Calculate Euclidean distance
    return Math.sqrt(
      Math.pow(itemCenterX - hookOriginX, 2) + Math.pow(itemCenterY - hookOriginY, 2)
    );
  };

  // Check if an item is reachable by the hook at current angle
  const isItemReachableAtAngle = (
    item: GameItem,
    currentAngle: number,
    angleTolerance: number = 5
  ): boolean => {
    const targetAngle = calculateTargetAngle(item);
    return Math.abs(currentAngle - targetAngle) <= angleTolerance;
  };

  // Check if there are any obstacles between the hook and target
  const hasObstaclesInPath = (targetItem: GameItem, items: GameItem[]): boolean => {
    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = {
      width: width,
      height: height,
    };

    // Hook origin
    const hookOriginX = screenWidth / 2;
    const hookOriginY = screenHeight * 0.15;

    // Target center
    const targetCenterX = targetItem.x + targetItem.width / 2;
    const targetCenterY = targetItem.y + targetItem.height / 2;

    // Calculate path vector
    const pathVectorX = targetCenterX - hookOriginX;
    const pathVectorY = targetCenterY - hookOriginY;
    const pathLength = Math.sqrt(pathVectorX * pathVectorX + pathVectorY * pathVectorY);

    // Normalize path vector
    const normalizedPathX = pathVectorX / pathLength;
    const normalizedPathY = pathVectorY / pathLength;

    // Target distance
    const targetDistance = calculateDistance(targetItem);

    // Check each item
    for (const item of items) {
      // Skip the target item itself and collected items
      if (item.id === targetItem.id || item.collected) {
        continue;
      }

      // Skip TNT if we're willing to hit it
      if (item.type === 'tnt' && !playerConfig.avoidTNT) {
        continue;
      }

      // Item center
      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;

      // Vector from hook origin to item center
      const itemVectorX = itemCenterX - hookOriginX;
      const itemVectorY = itemCenterY - hookOriginY;

      // Distance to item
      const itemDistance = Math.sqrt(itemVectorX * itemVectorX + itemVectorY * itemVectorY);

      // Skip items that are further away than the target
      if (itemDistance > targetDistance) {
        continue;
      }

      // Project the item vector onto the path vector
      const projection = itemVectorX * normalizedPathX + itemVectorY * normalizedPathY;

      // Skip items behind us or beyond the target
      if (projection < 0 || projection > pathLength) {
        continue;
      }

      // Calculate closest point on path to the item
      const closestPointX = hookOriginX + normalizedPathX * projection;
      const closestPointY = hookOriginY + normalizedPathY * projection;

      // Distance from item center to path
      const distanceToPath = Math.sqrt(
        Math.pow(itemCenterX - closestPointX, 2) + Math.pow(itemCenterY - closestPointY, 2)
      );

      // If distance is less than item's radius plus some margin, it's an obstacle
      const obstacleThreshold = Math.max(item.width, item.height) / 2 + 5;
      if (distanceToPath < obstacleThreshold) {
        // More valuable obstacles are sometimes worth hitting
        if (playerConfig.intelligenceLevel === 'expert') {
          const targetScore = calculateItemScore(targetItem);
          const obstacleScore = calculateItemScore(item);

          // If target is much more valuable than obstacle, we might risk it
          if (targetScore > obstacleScore * 2 && playerConfig.riskTolerance > 0.7) {
            continue;
          }
        }

        return true;
      }
    }

    return false;
  };

  // Rate each item based on value, weight, angle, distance, and obstacles
  const rateItems = (
    items: GameItem[],
    currentAngle: number
  ): { item: GameItem; score: number }[] => {
    if (!items.length) return [];

    const ratedItems = items
      .filter(item => !item.collected)
      .map(item => {
        let score = calculateItemScore(item);
        const targetAngle = calculateTargetAngle(item);
        const angleDifference = Math.abs(currentAngle - targetAngle);
        const distance = calculateDistance(item);
        const maxDistance = Math.sqrt(width * width + height * height);
        const hasObstacles = hasObstaclesInPath(item, items);

        // Decrease score based on angle difference
        score *= 1 - (angleDifference / 90) * 0.8;

        // Decrease score based on distance
        score *= 1 - (distance / maxDistance) * 0.5;

        // Drastically reduce score if there are obstacles
        if (hasObstacles) {
          score *= playerConfig.riskTolerance * 0.3;
        }

        // Avoid TNT unless we're specifically allowed to hit it
        if (item.type === 'tnt' && playerConfig.avoidTNT) {
          score = -1000;
        }

        return { item, score };
      });

    // Sort by score in descending order
    return ratedItems.sort((a, b) => b.score - a.score);
  };

  // Make a decision based on current game state
  const makeDecision = () => {
    // Skip if already thinking or hook is not in swinging state
    if (autoPlayerState.thinking || gameState.hookState !== 'swinging') {
      return;
    }

    setAutoPlayerState(prev => ({ ...prev, thinking: true }));

    // Get available items
    const availableItems = gameState.items.filter(item => !item.collected);

    if (!availableItems.length) {
      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
      return;
    }

    // Rate all items
    const ratedItems = rateItems(availableItems, gameState.hookAngle);

    if (!ratedItems.length) {
      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
      return;
    }

    // Get best item
    const bestTarget = ratedItems[0];

    // If best item has a negative score, wait for a better opportunity
    if (bestTarget.score <= 0) {
      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
      return;
    }

    // Calculate target angle
    const targetAngle = calculateTargetAngle(bestTarget.item);

    // Determine tolerance based on intelligence level
    let angleTolerance: number;
    switch (playerConfig.intelligenceLevel) {
      case 'basic':
        angleTolerance = 10;
        break;
      case 'advanced':
        angleTolerance = 5;
        break;
      case 'expert':
        angleTolerance = 2;
        break;
      default:
        angleTolerance = 5;
    }

    // Check if we're at the right angle to catch the item
    if (isItemReachableAtAngle(bestTarget.item, gameState.hookAngle, angleTolerance)) {
      // Deploy hook!
      toggleHook();

      logDecision(
        `Deploying hook at angle ${gameState.hookAngle.toFixed(1)}° to catch ${
          bestTarget.item.type
        } (value: ${bestTarget.item.value}, score: ${bestTarget.score.toFixed(2)})`
      );

      setAutoPlayerState(prev => ({
        ...prev,
        thinking: false,
        targetItem: bestTarget.item,
        lastActionTime: Date.now(),
      }));
    } else {
      // Wait for the right angle
      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
    }
  };

  // Start and clean up auto player on mount/unmount
  useEffect(() => {
    if (playerConfig.enabled) {
      startDecisionProcess();
    }

    return () => {
      stopDecisionProcess();
    };
  }, []);

  // Watch for game state changes to handle level transitions
  useEffect(() => {
    // Restart decision process when a new level starts
    if (gameState.gameStatus === 'playing' && autoPlayerState.enabled) {
      startDecisionProcess();
    }
    // Stop decision process when level completes or game ends
    else if (gameState.gameStatus !== 'playing') {
      stopDecisionProcess();
    }
  }, [gameState.gameStatus]);

  return {
    autoPlayerState,
    toggleAutoPlayer,
    setConfig,
    startDecisionProcess,
    stopDecisionProcess,
    logDecision,
  };
};

// Example usage:
// const { autoPlayerState, toggleAutoPlayer, setConfig } = useAutoPlayer({
//   enabled: true,
//   intelligenceLevel: 'expert',
//   riskTolerance: 0.8,
//   preferHighValue: true,
//   avoidTNT: true
// });
