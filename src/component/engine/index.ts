// src/component/engine.ts
import { useState, useEffect, useRef } from 'react';

// Game item types
export type ItemType = 'gold1' | 'gold2' | 'gold3' | 'gold4' | 'rock1' | 'rock2' | 'tnt' | 'barrel';

// Hook states
export type HookState = 'swinging' | 'extending' | 'retracting' | 'pulling';

// Game status
export type GameStatus = 'ready' | 'playing' | 'levelCompleted' | 'gameOver';

// Game item interface
export interface GameItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  weight: number;
  collected: boolean;
}

// Game state interface
export interface GameState {
  gameStatus: GameStatus;
  level: number;
  score: number;
  targetScore: number;
  timeRemaining: number;
  hookState: HookState;
  hookAngle: number;
  hookLength: number;
  hookDirection: 1 | -1; // 1 for clockwise, -1 for counter-clockwise
  caughtItem: GameItem | null;
  items: GameItem[];
}

// Define level configurations
const LEVEL_CONFIGS = [
  {
    targetScore: 650,
    timeLimit: 60,
    items: [
      { type: 'gold1', count: 3, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 2, valueRange: [150, 200], weightRange: [3, 4] },
      { type: 'gold3', count: 1, valueRange: [500, 500], weightRange: [5, 5] },
      { type: 'rock1', count: 4, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 3, valueRange: [30, 50], weightRange: [6, 8] },
      { type: 'tnt', count: 1, valueRange: [-100, -100], weightRange: [1, 1] },
    ],
  },
  {
    targetScore: 1200,
    timeLimit: 50,
    items: [
      { type: 'gold1', count: 2, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 3, valueRange: [150, 200], weightRange: [3, 4] },
      { type: 'gold3', count: 1, valueRange: [500, 500], weightRange: [5, 5] },
      { type: 'gold4', count: 1, valueRange: [800, 1000], weightRange: [8, 10] },
      { type: 'rock1', count: 3, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 2, valueRange: [30, 50], weightRange: [6, 8] },
      { type: 'tnt', count: 2, valueRange: [-100, -100], weightRange: [1, 1] },
      { type: 'barrel', count: 1, valueRange: [0, 0], weightRange: [3, 3] }, // Barrel explodes nearby items
    ],
  },
  // More levels can be added here
];

// Game engine hook
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

  // Generate random items for the level
  const generateItems = (levelIndex: number): GameItem[] => {
    const levelConfig = LEVEL_CONFIGS[levelIndex];
    const items: GameItem[] = [];

    // Screen dimensions (assuming landscape mode)
    const screenWidth = 800; // Example value
    const screenHeight = 480; // Example value

    // Playable area (excluding UI elements)
    const playableAreaTop = 60; // Height of the header
    const playableAreaBottom = screenHeight - 20;

    levelConfig.items.forEach(itemConfig => {
      for (let i = 0; i < itemConfig.count; i++) {
        // Generate random position
        // Ensure items are placed in valid positions (not too close to edges or other items)
        let x = Math.random() * (screenWidth - 100) + 50;
        let y = Math.random() * (playableAreaBottom - playableAreaTop - 100) + playableAreaTop + 50;

        // Determine item size based on type
        let width = 0;
        let height = 0;

        switch (itemConfig.type) {
          case 'gold1':
            width = 30;
            height = 30;
            break;
          case 'gold2':
            width = 40;
            height = 40;
            break;
          case 'gold3':
            width = 50;
            height = 50;
            break;
          case 'gold4':
            width = 60;
            height = 60;
            break;
          case 'rock1':
            width = 45;
            height = 45;
            break;
          case 'rock2':
            width = 55;
            height = 55;
            break;
          case 'tnt':
            width = 40;
            height = 40;
            break;
          case 'barrel':
            width = 50;
            height = 50;
            break;
        }

        // Random value and weight within configured range
        const value = Math.floor(
          Math.random() * (itemConfig.valueRange[1] - itemConfig.valueRange[0] + 1) +
            itemConfig.valueRange[0]
        );

        const weight = Math.floor(
          Math.random() * (itemConfig.weightRange[1] - itemConfig.weightRange[0] + 1) +
            itemConfig.weightRange[0]
        );

        items.push({
          id: `${itemConfig.type}_${i}_${Date.now()}`,
          type: itemConfig.type as ItemType,
          x,
          y,
          width,
          height,
          value,
          weight,
          collected: false,
        });
      }
    });

    return items;
  };

  // Start the game
  const startGame = () => {
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

  // Start the next level
  const startNextLevel = () => {
    // Calculate level index
    const nextLevelIndex = Math.min(gameState.level, LEVEL_CONFIGS.length - 1);

    // Generate items for the next level
    const items = generateItems(nextLevelIndex);

    // Update game state
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

    // Start the game timer
    startGameTimer();
    // Start the hook swinging
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

  // Start the hook swinging
  const startHookSwinging = () => {
    console.log('[Engine] Starting hook swinging');

    // Clear existing timer if any
    if (hookTimerRef.current) {
      console.log('[Engine] Clearing existing hook timer');
      clearInterval(hookTimerRef.current);
      hookTimerRef.current = null;
    }

    // Đảm bảo trạng thái hook là 'swinging'
    setGameState(prev => {
      // Nếu trạng thái đã là swinging, chỉ cập nhật các giá trị khác
      if (prev.hookState === 'swinging') {
        return {
          ...prev,
          hookAngle: 0,
          hookDirection: 1,
        };
      }

      // Nếu trạng thái chưa phải swinging, cập nhật trạng thái
      console.log('[Engine] Forcing hook state to swinging');
      return {
        ...prev,
        hookState: 'swinging',
        hookAngle: 0,
        hookDirection: 1,
      };
    });

    // Mở rộng hàm để đảm bảo tạo timer mới
    setTimeout(() => {
      // Start new timer - delay để đảm bảo state đã được cập nhật
      console.log('[Engine] Creating new hook timer');
      hookTimerRef.current = setInterval(() => {
        setGameState(prev => {
          // Skip if not in swinging state
          if (prev.hookState !== 'swinging') {
            console.log(`[Engine] Skip update, state is ${prev.hookState}`);
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
      }, 50);
    }, 50); // Thêm delay nhỏ
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
          // Nếu trạng thái không hợp lệ, đặt về swinging
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

      // Phần quan trọng: Luôn đặt lại hookState thành 'swinging'
      // trừ khi trò chơi đã hoàn thành cấp độ
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

    // Nếu game vẫn đang chơi, khởi động lại quá trình đung đưa
    if (gameState.gameStatus === 'playing') {
      startHookSwinging();
    }
  };

  // Calculate hook speed based on caught item weight
  const calculateHookSpeed = (weight?: number): number => {
    // Base speed
    const baseSpeed = 8;

    // If no weight provided, use caught item weight
    const itemWeight = weight ?? (gameState.caughtItem ? gameState.caughtItem.weight : 0);

    // Calculate speed based on weight
    // Higher weight = slower speed
    return Math.max(2, baseSpeed - itemWeight * 0.5);
  };

  // Update hook position and check for collisions
  // Sửa trong file engine.ts
  // Tìm hàm updateHookPosition và sửa phần kiểm tra va chạm

  // Sửa trong file engine.ts
  // Thay đổi hàm updateHookPosition với cách tiếp cận tốt hơn

  // Thay thế toàn bộ hàm updateHookPosition bằng phiên bản này:
  const updateHookPosition = (
    angle: number,
    length: number,
    callback: (item: GameItem) => void
  ): GameItem | null => {
    // Skip if not in extending state
    if (gameState.hookState !== 'extending') {
      return null;
    }

    // Convert angle to radians
    const angleRad = angle * (Math.PI / 180);

    // Calculate hook endpoint coordinates
    const hookX = Math.sin(angleRad) * length;
    const hookY = Math.cos(angleRad) * length;

    // Hook origin position (adjust these values to match your game setup)
    const hookOriginX = 400; // Giả định hook bắt đầu ở trung tâm (400, 0)
    const hookOriginY = 60; // Giả định hook bắt đầu ở trên cùng (y=60)

    // Calculate hook endpoint
    const hookEndX = hookOriginX + hookX;
    const hookEndY = hookOriginY + hookY;

    // Hook collision radius (larger value = easier to catch items)
    const hookRadius = 20; // Tăng giá trị này để dễ bắt hơn

    // Check for collisions with items
    for (const item of gameState.items) {
      // Skip if already collected
      if (item.collected) {
        continue;
      }

      // Sử dụng kiểm tra va chạm rộng rãi hơn
      // Kiểm tra xem hook có chạm vào vùng xung quanh vật không
      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;

      // Tính khoảng cách giữa đầu hook và trung tâm vật
      const distance = Math.sqrt(
        Math.pow(hookEndX - itemCenterX, 2) + Math.pow(hookEndY - itemCenterY, 2)
      );

      // Kiểm tra xem khoảng cách có nhỏ hơn tổng bán kính hook và bán kính vật
      // Sử dụng bán kính lớn hơn để dễ dàng bắt vật hơn
      const itemRadius = Math.max(item.width, item.height) / 2;

      if (distance < hookRadius + itemRadius) {
        // Bắt được vật
        setGameState(prev => ({
          ...prev,
          caughtItem: item,
          hookState: 'retracting',
        }));

        // Thông báo va chạm
        callback(item);
        return item;
      }
    }

    return null;
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
  const setHookState = (newHookState: HookState) => {
    setGameState(prev => ({
      ...prev,
      hookState: newHookState,
    }));
  };
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
  };
};

// Initial game state
export const GameState: GameState = {
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
