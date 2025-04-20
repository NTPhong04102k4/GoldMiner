import { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem, GameState, HookState, ItemType } from './type';
import { Dimensions } from 'react-native';
import { GAME_CONFIG } from '../hooks';
import { LEVEL_CONFIGS } from './data';

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

export const useGameEngine = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    gameStatus: 'ready',
    level: 1,
    score: 0,
    targetScore: LEVEL_CONFIGS[0].targetScore,
    timeRemaining: LEVEL_CONFIGS[0].timeLimit,
    hookState: 'swinging',
    hookAngle: 0,
    hookLength: 0,
    hookDirection: 1,
    caughtItem: null,
    items: [],
  });

  // Timers
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hookTimerRef = useRef<NodeJS.Timeout | null>(null);
  const generateItems = (levelIndex: number): GameItem[] => {
    const levelConfig = LEVEL_CONFIGS[levelIndex] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    const items: GameItem[] = [];

    // Playable area (excluding UI elements)
    const playableAreaTop = 100;
    const playableAreaBottom = screenHeight - 60;
    const playableAreaLeft = 60;
    const playableAreaRight = screenWidth - 60;

    // Minimum distance between items
    const MIN_DISTANCE = 40;

    // Group items by type for organized placement
    const goldItems = levelConfig.items.filter(config => config.type.startsWith('gold'));
    const rockItems = levelConfig.items.filter(config => config.type.startsWith('rock'));
    const tntItems = levelConfig.items.filter(config => config.type === 'tnt');

    // Sort gold items by value (highest to lowest)
    goldItems.sort((a, b) => b.valueRange[1] - a.valueRange[1]);

    // Create placement zones
    const zones = [
      {
        name: 'bottom',
        top: playableAreaTop + (playableAreaBottom - playableAreaTop) * 0.66,
        bottom: playableAreaBottom,
        itemTypes: goldItems.slice(0, 2), // Most valuable gold goes at bottom
      },
      {
        name: 'middle',
        top: playableAreaTop + (playableAreaBottom - playableAreaTop) * 0.33,
        bottom: playableAreaTop + (playableAreaBottom - playableAreaTop) * 0.66,
        itemTypes: [...goldItems.slice(2), ...rockItems.slice(0, 2)], // Mix of gold and rocks
      },
      {
        name: 'top',
        top: playableAreaTop,
        bottom: playableAreaTop + (playableAreaBottom - playableAreaTop) * 0.33,
        itemTypes: [...rockItems.slice(2), ...tntItems], // Rocks and TNT at top
      },
    ];

    // Function to check if a position is valid (not too close to other items)
    const isValidPosition = (x: number, y: number, width: number, height: number): boolean => {
      for (const item of items) {
        // Calculate centers
        const newItemCenterX = x + width / 2;
        const newItemCenterY = y + height / 2;
        const existingItemCenterX = item.x + item.width / 2;
        const existingItemCenterY = item.y + item.height / 2;

        // Calculate distance between centers
        const distance = Math.sqrt(
          Math.pow(newItemCenterX - existingItemCenterX, 2) +
            Math.pow(newItemCenterY - existingItemCenterY, 2)
        );

        // Check if items are too close
        const minRequiredDistance = (width + item.width) / 2 + MIN_DISTANCE;
        if (distance < minRequiredDistance) {
          return false;
        }
      }
      return true;
    };

    // Function to get size based on item type (more accurate sizes)
    const getItemSize = (type: string): { width: number; height: number } => {
      switch (type) {
        case 'gold1': // Small gold
          return { width: 30, height: 30 };
        case 'gold2': // Medium gold
          return { width: 40, height: 40 };
        case 'gold3': // Large gold
          return { width: 50, height: 50 };
        case 'gold4': // Diamond
          return { width: 45, height: 45 };
        case 'rock1': // Small rock
          return { width: 45, height: 45 };
        case 'rock2': // Large rock
          return { width: 55, height: 55 };
        case 'tnt': // TNT
          return { width: 40, height: 40 };
        default:
          return { width: 30, height: 30 };
      }
    };

    // Place items in each zone
    zones.forEach(zone => {
      zone.itemTypes.forEach(itemConfig => {
        for (let i = 0; i < itemConfig.count; i++) {
          const { width, height } = getItemSize(itemConfig.type);

          let positionFound = false;
          let attempts = 0;

          while (!positionFound && attempts < 50) {
            attempts++;

            const x =
              Math.random() * (playableAreaRight - playableAreaLeft - width) + playableAreaLeft;
            const y = Math.random() * (zone.bottom - zone.top - height) + zone.top;

            if (isValidPosition(x, y, width, height)) {
              const value = Math.floor(
                Math.random() * (itemConfig.valueRange[1] - itemConfig.valueRange[0] + 1) +
                  itemConfig.valueRange[0]
              );

              const weight = Math.floor(
                Math.random() * (itemConfig.weightRange[1] - itemConfig.weightRange[0] + 1) +
                  itemConfig.weightRange[0]
              );

              items.push({
                id: `${itemConfig.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: itemConfig.type as ItemType,
                x,
                y,
                width,
                height,
                value,
                weight,
                collected: false,
              });

              positionFound = true;
            }
          }

          if (!positionFound) {
            console.log(`Could not place ${itemConfig.type}, skipping`);
          }
        }
      });
    });

    console.log(`Generated ${items.length} items for level ${levelIndex + 1}`);
    return items;
  };

  const startGame = () => {
    const items = generateItems(0);

    setGameState(prev => ({
      ...prev,
      gameStatus: 'playing',
      level: 1,
      score: 0,
      targetScore: LEVEL_CONFIGS[0].targetScore,
      timeRemaining: LEVEL_CONFIGS[0].timeLimit,
      hookState: 'swinging',
      hookAngle: 0,
      hookLength: 0,
      hookDirection: 1,
      caughtItem: null,
      items,
    }));

    startGameTimer();
    startHookSwinging();
  };

  const startNextLevel = () => {
    const nextLevelIndex = Math.min(gameState.level, LEVEL_CONFIGS.length - 1);

    const items = generateItems(nextLevelIndex);

    setGameState(prev => ({
      ...prev,
      gameStatus: 'playing',
      level: prev.level + 1,
      targetScore: LEVEL_CONFIGS[nextLevelIndex].targetScore,
      timeRemaining: LEVEL_CONFIGS[nextLevelIndex].timeLimit,
      hookState: 'swinging',
      hookAngle: 0,
      hookLength: 0,
      hookDirection: 1,
      caughtItem: null,
      items,
    }));

    startGameTimer();
    startHookSwinging();
  };

  // Reset the game
  const resetGame = () => {
    // Generate items for level 1
    const items = generateItems(0);

    // Update game state
    setGameState(prev => ({
      ...prev,
      gameStatus: 'playing',
      level: 1,
      score: 0,
      targetScore: LEVEL_CONFIGS[0].targetScore,
      timeRemaining: LEVEL_CONFIGS[0].timeLimit,
      hookState: 'swinging',
      hookAngle: 0,
      hookLength: 0,
      hookDirection: 1,
      caughtItem: null,
      items,
    }));

    // Start the game timer
    startGameTimer();
    // Start the hook swinging
    startHookSwinging();
  };

  // Start the game timer
  const startGameTimer = () => {
    // Clear existing timer if any
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
    }

    // Start new timer
    gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newTimeRemaining = prev.timeRemaining - 1;

        // Check if time is up
        if (newTimeRemaining <= 0) {
          // Clear timer
          if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
            gameTimerRef.current = null;
          }

          // Clear hook timer
          if (hookTimerRef.current) {
            clearInterval(hookTimerRef.current);
            hookTimerRef.current = null;
          }

          // Check if level completed or game over
          if (prev.score >= prev.targetScore) {
            return {
              ...prev,
              timeRemaining: 0,
              gameStatus: 'levelCompleted',
            };
          } else {
            return {
              ...prev,
              timeRemaining: 0,
              gameStatus: 'gameOver',
            };
          }
        }

        return {
          ...prev,
          timeRemaining: newTimeRemaining,
        };
      });
    }, 1000);
  };

  const startHookSwinging = () => {
    console.log('[Engine] Starting hook swinging');

    // Clear existing timer if any
    if (hookTimerRef.current) {
      console.log('[Engine] Clearing existing hook timer');
      clearInterval(hookTimerRef.current);
      hookTimerRef.current = null;
    }

    setGameState(prev => {
      if (prev.hookState === 'swinging') {
        return prev;
      }

      console.log('[Engine] Changing hook state to swinging while preserving angle');
      return {
        ...prev,
        hookState: 'swinging',
      };
    });

    // Start new timer after a short delay to ensure state is updated
    setTimeout(() => {
      console.log('[Engine] Creating new hook timer');
      hookTimerRef.current = setInterval(() => {
        setGameState(prev => {
          // Skip if not in swinging state
          if (prev.hookState !== 'swinging') {
            return prev;
          }

          // Calculate new angle
          let newAngle = prev.hookAngle + prev.hookDirection * 2;
          let newDirection = prev.hookDirection;

          // Check if angle reached limits
          if (newAngle >= 80) {
            newAngle = 80;
            newDirection = -1;
          } else if (newAngle <= -80) {
            newAngle = -80;
            newDirection = 1;
          }

          return {
            ...prev,
            hookAngle: newAngle,
            hookDirection: newDirection,
          };
        });
      }, 50); // Update every 50ms for smoother animation
    }, 50);
  };

  // Toggle hook state (extend/retract)
  const toggleHook = () => {
    console.log('[Engine] Toggle hook called');
    setGameState(prev => {
      // Skip if game is not playing
      if (prev.gameStatus !== 'playing') {
        console.log('[Engine] Game not playing, skipping toggle');
        return prev;
      }

      // Toggle hook state
      switch (prev.hookState) {
        case 'swinging':
          // Start extending
          console.log('[Engine] Changing state from swinging to extending');
          return {
            ...prev,
            hookState: 'extending',
          };

        case 'extending':
        case 'retracting':
        case 'pulling':
          // Already in motion, do nothing
          console.log(`[Engine] Already in motion (${prev.hookState}), no change`);
          return prev;

        default:
          // If state is invalid, set to swinging
          console.log(`[Engine] Invalid state (${prev.hookState}), setting to swinging`);
          return {
            ...prev,
            hookState: 'swinging',
          };
      }
    });
  };

  // Collect item
  const collectItem = (item: GameItem) => {
    setGameState(prev => {
      // Mark item as collected
      const updatedItems = prev.items.map(i => {
        if (i.id === item.id) {
          return { ...i, collected: true };
        }
        return i;
      });

      // Update score
      const newScore = prev.score + item.value;

      // Check if all items are collected or target score is reached
      const allCollected = updatedItems.every(i => i.collected);
      const targetReached = newScore >= prev.targetScore;

      // Determine new game status
      let newGameStatus = prev.gameStatus;
      if (allCollected || targetReached) {
        // Clear timers
        if (gameTimerRef.current) {
          clearInterval(gameTimerRef.current);
          gameTimerRef.current = null;
        }

        if (hookTimerRef.current) {
          clearInterval(hookTimerRef.current);
          hookTimerRef.current = null;
        }

        newGameStatus = 'levelCompleted';
      }

      // Always set hookState back to 'swinging' unless game is over
      const newHookState = newGameStatus === 'levelCompleted' ? prev.hookState : 'swinging';

      return {
        ...prev,
        items: updatedItems,
        score: newScore,
        caughtItem: null,
        hookState: newHookState,
        gameStatus: newGameStatus,
      };
    });

    // If game is still playing, restart the swinging process
    if (gameState.gameStatus === 'playing') {
      startHookSwinging();
    }
  };

  // Calculate hook speed based on caught item weight
  const calculateHookSpeed = (weight?: number): number => {
    // Maximum rope length
    const maxHookLength = GAME_CONFIG.ROPE_MAX_LENGTH;

    // Desired retraction duration (base time)
    const baseRetractionTime = 2000; // 2 seconds in milliseconds

    // Updates per second (based on animation interval)
    const updatesPerSecond = 1000 / 50;

    // Base speed to complete retraction in baseRetractionTime
    const baseSpeed = maxHookLength / ((baseRetractionTime / 1000) * updatesPerSecond);

    // Use caught item weight or default to 0
    const itemWeight = weight ?? (gameState.caughtItem ? gameState.caughtItem.weight : 0);

    // Weight factor: heavier items retract slower
    const weightFactor = 0.2;

    // Calculate adjusted speed (lower for heavier items)
    // Ensure minimum speed of 40% of base speed to prevent extreme slowness
    return Math.max(baseSpeed * 0.4, baseSpeed - itemWeight * weightFactor);
  };

  // Update hook position and check for collisions
  const updateHookPosition = (
    angle: number,
    length: number,
    callback: (item: GameItem) => void
  ): GameItem | null => {
    // Skip if not in extending state
    if (gameState.hookState !== 'extending') {
      return null;
    }

    // Get screen dimensions
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

    // Hook origin position (top center of screen)
    const hookOriginX = SCREEN_WIDTH / 2;
    const hookOriginY = SCREEN_HEIGHT * 0.15;

    // Use negative angle to match visual representation
    const correctedAngle = -angle;

    // Convert angle to radians
    const angleRad = correctedAngle * (Math.PI / 180);

    // Calculate hook endpoint coordinates
    const hookX = Math.sin(angleRad) * length;
    const hookY = Math.cos(angleRad) * length;

    // Calculate absolute position of hook endpoint
    const hookEndX = hookOriginX + hookX;
    const hookEndY = hookOriginY + hookY;

    // Hook size for collision detection
    const hookSize = GAME_CONFIG.HOOK_SIZE || 30;
    const halfHookSize = hookSize / 2;

    // Create hook bounds for collision detection
    const hookBounds = {
      left: hookEndX - halfHookSize,
      right: hookEndX + halfHookSize,
      top: hookEndY - halfHookSize,
      bottom: hookEndY + halfHookSize,
    };

    // Filter available items (not collected)
    const availableItems = gameState.items.filter(item => !item.collected);

    if (availableItems.length === 0) {
      return null;
    }

    // Check each item for collision
    for (const item of availableItems) {
      // Create item bounds
      const itemBounds = {
        left: item.x,
        right: item.x + item.width,
        top: item.y,
        bottom: item.y + item.height,
      };

      // Check for collision (expanded hit box for easier catching)
      const collisionMargin = 5; // pixels
      const isColliding =
        hookBounds.left <= itemBounds.right + collisionMargin &&
        hookBounds.right >= itemBounds.left - collisionMargin &&
        hookBounds.top <= itemBounds.bottom + collisionMargin &&
        hookBounds.bottom >= itemBounds.top - collisionMargin;

      if (isColliding) {
        console.log(`Caught item: ${item.type} (value: ${item.value}, weight: ${item.weight})`);

        // Set caught item and change hook state to pulling
        setGameState(prev => ({
          ...prev,
          caughtItem: item,
          hookState: 'pulling',
        }));

        // Add timeout to transition to retracting after a short pause
        setTimeout(() => {
          setGameState(prev => {
            if (prev.hookState === 'pulling' && prev.caughtItem?.id === item.id) {
              return {
                ...prev,
                hookState: 'retracting',
              };
            }
            return prev;
          });
        }, 150);

        // Trigger the callback
        callback(item);

        return item;
      }
    }

    // Check if hook has reached maximum length
    if (length >= GAME_CONFIG.ROPE_MAX_LENGTH) {
      // Automatically start retracting
      setGameState(prev => ({
        ...prev,
        hookState: 'retracting',
      }));
    }

    // No collision detected
    return null;
  };

  // Set hook state directly
  const setHookState = (newHookState: HookState) => {
    setGameState(prev => ({
      ...prev,
      hookState: newHookState,
    }));
  };
  const setHookAngle = (angle: number) => {
    // Implementation to set the hook angle
    // This would update the gameState.hookAngle directly
    setGameState(prev => ({
      ...prev,
      hookAngle: angle,
    }));
  };
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }

      if (hookTimerRef.current) {
        clearInterval(hookTimerRef.current);
      }
    };
  }, []);

  return {
    gameState,
    startGame,
    startNextLevel,
    resetGame,
    toggleHook,
    collectItem,
    calculateHookSpeed,
    updateHookPosition,
    setHookState,
    setHookAngle,
  };
};

export const GameStateInit: GameState = {
  gameStatus: 'ready',
  level: 1,
  score: 0,
  targetScore: 650,
  timeRemaining: 60,
  hookState: 'swinging',
  hookAngle: 0,
  hookLength: 0,
  hookDirection: 1,
  caughtItem: null,
  items: [],
};
