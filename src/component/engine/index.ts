// src/component/engine.ts
import { useState, useEffect, useRef } from 'react';
import { GameItem, GameState, HookState, ItemType } from './type';
import { Dimensions } from 'react-native';
import { GAME_CONFIG } from '../hooks';
const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
const aspectRatio = screenWidth / screenHeight;
const expansionRatio = aspectRatio > 1.5 ? 0.6 : 0.4; // Màn hình càng rộng, mở rộng càng nhiều

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
    ],
  },
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
  // Cập nhật hàm generateItems trong engine.ts để tăng khoảng cách giữa các vật phẩm
  const generateItems = (levelIndex: number): GameItem[] => {
    const levelConfig = LEVEL_CONFIGS[levelIndex];
    const items: GameItem[] = [];
    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

    // Playable area (excluding UI elements)
    const playableAreaTop = 100; // Tăng từ 80 lên 100 để tránh vật phẩm quá gần header
    const playableAreaBottom = screenHeight - 60; // Tăng khoảng cách với viền dưới
    const playableAreaLeft = 120; // Tăng từ 40 lên 60
    const playableAreaRight = screenWidth - 60; // Tăng từ 40 lên 60

    // Tăng khoảng cách tối thiểu giữa các vật phẩm
    const MIN_DISTANCE = 30; // Tăng từ 70 lên 100

    // Sort items by size and type to place larger/more valuable items at the bottom
    // and smaller items at the top
    const sortedItemConfigs = [...levelConfig.items].sort((a, b) => {
      // First prioritize gold vs non-gold
      const aIsGold = a.type.startsWith('gold');
      const bIsGold = b.type.startsWith('gold');

      if (aIsGold && !bIsGold) return 1; // Gold goes down (later in the array)
      if (!aIsGold && bIsGold) return -1; // Non-gold goes up

      // Within same category, sort by value (higher value goes down)
      return b.valueRange[1] - a.valueRange[1];
    });

    // Tối đa số lượng vật phẩm hiển thị dựa trên kích thước màn hình
    // Tránh quá nhiều vật phẩm trên màn hình nhỏ
    const calculateMaxItems = () => {
      const playableArea =
        (playableAreaRight - playableAreaLeft) * (playableAreaBottom - playableAreaTop);
      // Tính toán khoảng không gian cần thiết cho mỗi vật phẩm (bao gồm khoảng cách)
      const avgItemSpace = Math.PI * Math.pow(MIN_DISTANCE / 1.5, 2); // Ước tính diện tích
      return Math.floor(playableArea / avgItemSpace);
    };

    const maxItems = calculateMaxItems();
    let totalItems = 0;

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

    // Chia màn hình thành lưới để đặt vật phẩm một cách có hệ thống hơn
    const gridRows = 3; // Số hàng trong lưới
    const gridCols = 4; // Số cột trong lưới

    const cellWidth = (playableAreaRight - playableAreaLeft) / gridCols;
    const cellHeight = (playableAreaBottom - playableAreaTop) / gridRows;

    // Mảng theo dõi các ô đã sử dụng
    const usedCells: boolean[][] = Array(gridRows)
      .fill(false)
      .map(() => Array(gridCols).fill(false));

    // Function để tìm ô trống ngẫu nhiên
    const findRandomEmptyCell = (): [number, number] | null => {
      // Tạo danh sách các ô còn trống
      const emptyCells: [number, number][] = [];
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          if (!usedCells[row][col]) {
            emptyCells.push([row, col]);
          }
        }
      }

      if (emptyCells.length === 0) return null;

      // Chọn ngẫu nhiên một ô trống
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      return emptyCells[randomIndex];
    };

    // Function to get size based on item type
    const getItemSize = (type: string): { width: number; height: number } => {
      switch (type) {
        case 'gold1':
          return { width: 30, height: 30 };
        case 'gold2':
          return { width: 40, height: 40 };
        case 'gold3':
          return { width: 50, height: 50 };
        case 'gold4':
          return { width: 60, height: 60 };
        case 'rock1':
          return { width: 45, height: 45 };
        case 'rock2':
          return { width: 55, height: 55 };
        case 'tnt':
          return { width: 40, height: 40 };
        default:
          return { width: 30, height: 30 };
      }
    };

    // Determine vertical zones for different item types
    const totalPlayableHeight = playableAreaBottom - playableAreaTop;
    const zoneHeight = totalPlayableHeight / gridRows;

    // Process each item config
    let remainingConfigs = [...sortedItemConfigs];
    while (remainingConfigs.length > 0 && totalItems < maxItems) {
      // Lấy ra một loại vật phẩm từ danh sách còn lại
      const configIndex = Math.floor(Math.random() * remainingConfigs.length);
      const itemConfig = remainingConfigs[configIndex];

      // Nếu đã tạo đủ số lượng của loại này, loại bỏ khỏi danh sách
      if (itemConfig.count <= 0) {
        remainingConfigs.splice(configIndex, 1);
        continue;
      }

      // Giảm số lượng của loại này
      itemConfig.count--;

      // Determine which zone to place this item type (higher index = lower on screen)
      const preferredRow = Math.floor(
        (sortedItemConfigs.indexOf(itemConfig) / sortedItemConfigs.length) * gridRows
      );

      // Get item size
      const { width, height } = getItemSize(itemConfig.type);

      // Tìm một ô còn trống
      let cellFound = false;
      let row = preferredRow;

      // Ưu tiên tìm ô ở hàng ưu tiên, sau đó mới tìm ở các hàng khác
      for (let r = 0; r < gridRows && !cellFound; r++) {
        row = (preferredRow + r) % gridRows;
        for (let col = 0; col < gridCols; col++) {
          if (!usedCells[row][col]) {
            // Tính vị trí trong ô với một chút ngẫu nhiên
            const cellX = playableAreaLeft + col * cellWidth;
            const cellY = playableAreaTop + row * cellHeight;

            // Thêm ngẫu nhiên trong ô để tránh vật phẩm xếp thành hàng
            const offsetX = (cellWidth - width) * 0.6 * Math.random();
            const offsetY = (cellHeight - height) * 0.6 * Math.random();

            const x = cellX + offsetX;
            const y = cellY + offsetY;

            if (isValidPosition(x, y, width, height)) {
              usedCells[row][col] = true;
              cellFound = true;

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

              totalItems++;
              break;
            }
          }
        }
        if (cellFound) break;
      }

      // Nếu không tìm được ô nào phù hợp, bỏ qua vật phẩm này
      if (!cellFound) {
        console.log(`Could not place ${itemConfig.type}, skipping`);
      }
    }

    console.log(`Generated ${items.length} items with minimum spacing of ${MIN_DISTANCE}px`);
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

    // Đảm bảo trạng thái hook là 'swinging' nhưng giữ nguyên góc hiện tại
    setGameState(prev => {
      // Nếu trạng thái đã là swinging, không thay đổi gì cả
      if (prev.hookState === 'swinging') {
        return prev; // Giữ nguyên tất cả các giá trị
      }

      // Nếu trạng thái chưa phải swinging, chỉ cập nhật trạng thái, giữ nguyên góc và hướng
      console.log('[Engine] Changing hook state to swinging while preserving angle');
      return {
        ...prev,
        hookState: 'swinging',
        // Không thay đổi hookAngle và hookDirection để giữ nguyên vị trí
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

  // Calculate hook speed based on caught item weight and desired duration
  const calculateHookSpeed = (weight?: number): number => {
    // Độ dài tối đa của móc câu (thay đổi giá trị này theo thiết kế của bạn)
    const maxHookLength = 300;

    // Thời gian mong muốn (2 giây)
    const desiredDuration = 2000; // milliseconds

    // Số lần cập nhật trong 1 giây (dựa vào interval của bạn, giả sử là 50ms)
    const updatesPerSecond = 1000 / 50;

    // Tốc độ cơ bản để hoàn thành trong 2 giây
    const baseSpeed = maxHookLength / ((desiredDuration / 1000) * updatesPerSecond);

    // Nếu không có weight được cung cấp, sử dụng weight của item đã bắt được
    const itemWeight = weight ?? (gameState.caughtItem ? gameState.caughtItem.weight : 0);

    // Điều chỉnh tốc độ dựa theo trọng lượng
    // Item nặng hơn sẽ kéo chậm hơn một chút
    // Nhưng vẫn đảm bảo không quá lệch so với 2 giây
    const weightFactor = 0.2; // Giảm ảnh hưởng của weight

    return Math.max(baseSpeed * 0.8, baseSpeed - itemWeight * weightFactor);
  };
  const updateHookPosition = (
    angle: number,
    length: number,
    callback: (item: GameItem) => void
  ): GameItem | null => {
    // Skip if not in extending state
    if (gameState.hookState !== 'extending') {
      return null;
    }

    // Get screen dimensions and check orientation
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
    const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

    // Fix: we need to swap the sign of the angle to match the visual representation
    const correctedAngle = -angle;

    // Adjust angle based on orientation if needed
    let adjustedAngle = correctedAngle;
    if (isLandscape) {
      // You may need to adjust this value based on your specific rotation direction
      // adjustedAngle = correctedAngle - 90; // For landscape-left
      // adjustedAngle = correctedAngle + 90; // For landscape-right
    }

    // Convert angle to radians
    const angleRad = adjustedAngle * (Math.PI / 180);

    // Calculate hook endpoint coordinates based on orientation
    let hookX, hookY;
    if (isLandscape) {
      // For landscape mode, we can adjust our sin/cos calculations
      // This might need adjustment based on your specific rotation
      hookX = Math.sin(angleRad) * length;
      hookY = Math.cos(angleRad) * length;

      // Alternative calculation if needed:
      // hookX = Math.cos(angleRad) * length;
      // hookY = -Math.sin(angleRad) * length;
    } else {
      // Portrait mode - original calculation
      hookX = Math.sin(angleRad) * length;
      hookY = Math.cos(angleRad) * length;
    }

    // Hook origin position - adjust based on orientation
    const hookOriginX = SCREEN_WIDTH / 2;
    const hookOriginY = SCREEN_HEIGHT * 0.15;

    // Calculate hook endpoint
    const hookEndX = hookOriginX + hookX;
    const hookEndY = hookOriginY + hookY;

    // Hook size
    const hookSize = GAME_CONFIG.HOOK_SIZE || 30;
    const halfHookSize = hookSize / 2;

    console.log(
      `Hook position: (${hookEndX}, ${hookEndY}), Origin: (${hookOriginX}, ${hookOriginY}), 
      Angle: ${angle}°, Corrected: ${correctedAngle}°, Orientation: ${
        isLandscape ? 'Landscape' : 'Portrait'
      }`
    );

    // Create hook bounds for collision detection
    const hookBounds = {
      left: hookEndX - 15,
      right: hookEndX + 15,
      top: hookEndY - halfHookSize,
      bottom: hookEndY + halfHookSize,
    };

    // NEW ALGORITHM STARTS HERE
    // Create a list of valid items (not collected)
    const availableItems = gameState.items.filter(item => !item.collected);

    if (availableItems.length === 0) {
      return null;
    }

    // Create an array with items and their metadata
    const itemsWithMetadata = availableItems.map(item => {
      // Calculate item center
      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;

      // Calculate distance to hook
      const distance = calculateDistance(hookEndX, hookEndY, itemCenterX, itemCenterY);

      // Calculate all four corners of the item
      const itemCorners = {
        topLeft: { x: item.x, y: item.y },
        topRight: { x: item.x + item.width, y: item.y },
        bottomLeft: { x: item.x, y: item.y + item.height },
        bottomRight: { x: item.x + item.width, y: item.y + item.height },
      };

      // Check if hook is aligned with item based on orientation
      let isAligned = false;

      if (isLandscape) {
        // In landscape mode: X alignment is important
        // Check if hook's X is close to the item's facing side (which could be left or right)
        // And hook's Y is between the item's top and bottom

        // Check if hook is approaching from left
        const isApproachingFromLeft = hookEndX <= itemCorners.topLeft.x;

        // Check if hook is approaching from right
        const isApproachingFromRight = hookEndX >= itemCorners.topRight.x;

        // Check Y alignment (hook Y is between item's top and bottom)
        const isYAligned =
          hookEndY >= itemCorners.topLeft.y - 10 && hookEndY <= itemCorners.bottomLeft.y + 10;

        // Check X alignment with a margin
        const xMargin = 20; // Pixels of margin to make it easier to catch

        if (isApproachingFromLeft) {
          // Hook coming from left, check if close enough to left face
          isAligned = Math.abs(hookEndX - itemCorners.topLeft.x) < xMargin && isYAligned;
        } else if (isApproachingFromRight) {
          // Hook coming from right, check if close enough to right face
          isAligned = Math.abs(hookEndX - itemCorners.topRight.x) < xMargin && isYAligned;
        }
      } else {
        // In portrait mode: Y alignment is important
        // Check if hook is approaching from top or bottom

        // Check if hook is approaching from top
        const isApproachingFromTop = hookEndY <= itemCorners.topLeft.y;

        // Check if hook is approaching from bottom
        const isApproachingFromBottom = hookEndY >= itemCorners.bottomLeft.y;

        // Check X alignment (hook X is between item's left and right)
        const isXAligned =
          hookEndX >= itemCorners.topLeft.x - 10 && hookEndX <= itemCorners.topRight.x + 10;

        // Check Y alignment with a margin
        const yMargin = 20; // Pixels of margin

        if (isApproachingFromTop) {
          // Hook coming from top, check if close enough to top face
          isAligned = Math.abs(hookEndY - itemCorners.topLeft.y) < yMargin && isXAligned;
        } else if (isApproachingFromBottom) {
          // Hook coming from bottom, check if close enough to bottom face
          isAligned = Math.abs(hookEndY - itemCorners.bottomLeft.y) < yMargin && isXAligned;
        }
      }

      // Calculate if the item is in the hook's path using traditional path calculation as backup
      const isInHookPath = isItemInHookPath(
        hookOriginX,
        hookOriginY,
        hookEndX,
        hookEndY,
        item,
        angleRad,
        isLandscape
      );

      // Check if item collides with hook bounds - expanded collision zone
      const itemBounds = {
        left: item.x - 5,
        right: item.x + item.width + 5,
        top: item.y - 15 - hookSize,
        bottom: item.y + item.height + 15 + hookSize,
      };

      const isColliding =
        (hookBounds.left <= itemBounds.right &&
          hookBounds.right >= itemBounds.left &&
          hookBounds.top <= itemBounds.bottom &&
          hookBounds.bottom >= itemBounds.top) ||
        isAligned; // Add alignment as another way to collide

      return {
        item,
        distance,
        isInHookPath,
        isColliding,
      };
    });

    // PRIORITY ALGORITHM:
    // 1. First check if any items are colliding with the hook right now
    const collidingItems = itemsWithMetadata.filter(data => data.isColliding);
    if (collidingItems.length > 0) {
      // Get the closest colliding item
      collidingItems.sort((a, b) => a.distance - b.distance);
      const closestColliding = collidingItems[0];

      // Get item corners for logging
      const item = closestColliding.item;
      const corners = {
        topLeft: { x: item.x, y: item.y },
        topRight: { x: item.x + item.width, y: item.y },
        bottomLeft: { x: item.x, y: item.y + item.height },
        bottomRight: { x: item.x + item.width, y: item.y + item.height },
      };

      console.log(
        `Caught item: ${closestColliding.item.type} at distance ${closestColliding.distance.toFixed(
          2
        )}px`
      );
      console.log(`Item corners: TL(${corners.topLeft.x},${corners.topLeft.y}), 
        TR(${corners.topRight.x},${corners.topRight.y}), 
        BL(${corners.bottomLeft.x},${corners.bottomLeft.y}), 
        BR(${corners.bottomRight.x},${corners.bottomRight.y})`);
      console.log(`Hook position: (${hookEndX}, ${hookEndY})`);

      handleCaughtItem(closestColliding.item, callback);
      return closestColliding.item;
    }

    // 2. Next, check if there are items directly in the hook's path
    const itemsInPath = itemsWithMetadata.filter(data => data.isInHookPath);
    if (itemsInPath.length > 0) {
      // Get the closest item in path
      itemsInPath.sort((a, b) => a.distance - b.distance);
      const closestInPath = itemsInPath[0];

      // Check if it's close enough to catch
      const hookLength = calculateDistance(hookOriginX, hookOriginY, hookEndX, hookEndY);
      if (closestInPath.distance < hookLength * 1.1) {
        // This item is in path and within range - catch it
        console.log(
          `Catching item in path: ${
            closestInPath.item.type
          } at distance ${closestInPath.distance.toFixed(2)}px`
        );
        handleCaughtItem(closestInPath.item, callback);
        return closestInPath.item;
      } else {
        // Item in path but not close enough yet
        console.log(
          `Item in path: ${closestInPath.item.type} at distance ${closestInPath.distance.toFixed(
            2
          )}px (waiting to catch)`
        );
      }
    }

    // For debugging: show the closest item
    if (itemsWithMetadata.length > 0) {
      itemsWithMetadata.sort((a, b) => a.distance - b.distance);
      const closestItem = itemsWithMetadata[0];
      console.log(
        `Distance to closest item (${closestItem.item.type}): ${closestItem.distance.toFixed(
          2
        )} pixels, In Path: ${closestItem.isInHookPath}`
      );
    }

    return null;
  };

  // Function to handle caught items
  const handleCaughtItem = (item: GameItem, callback: (item: GameItem) => void) => {
    // Set game state to pulling
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

    callback(item);
  };

  // Helper function to check if an item is directly in the hook's path
  const isItemInHookPath = (
    originX: number,
    originY: number,
    hookEndX: number,
    hookEndY: number,
    item: GameItem,
    angleRad: number,
    isLandscape: boolean
  ): boolean => {
    // Calculate all four corners of the item
    const corners = {
      topLeft: { x: item.x, y: item.y },
      topRight: { x: item.x + item.width, y: item.y },
      bottomLeft: { x: item.x, y: item.y + item.height },
      bottomRight: { x: item.x + item.width, y: item.y + item.height },
    };

    // Calculate item center
    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    // For landscape mode, use a more direct approach using corners
    if (isLandscape) {
      // Direction of hook movement (from origin to end)
      const hookDirectionX = hookEndX - originX;

      // Check which side the hook is approaching from
      const isApproachingFromLeft = hookDirectionX > 0 && hookEndX < corners.topLeft.x;
      const isApproachingFromRight = hookDirectionX < 0 && hookEndX > corners.topRight.x;

      // If approaching from left, check alignment with left face
      if (isApproachingFromLeft) {
        // Check if hook's Y is between top and bottom of item (with margin)
        const margin = 30; // Pixels of margin to make catching easier
        const isYAligned =
          hookEndY >= corners.topLeft.y - margin && hookEndY <= corners.bottomLeft.y + margin;

        if (isYAligned) {
          // Calculate how far hook is from left face
          const distanceToFace = Math.abs(hookEndX - corners.topLeft.x);
          // If close enough to left face, it's in path
          return distanceToFace < 50; // Adjust this threshold as needed
        }
      }

      // If approaching from right, check alignment with right face
      else if (isApproachingFromRight) {
        // Check if hook's Y is between top and bottom of item (with margin)
        const margin = 30;
        const isYAligned =
          hookEndY >= corners.topRight.y - margin && hookEndY <= corners.bottomRight.y + margin;

        if (isYAligned) {
          // Calculate how far hook is from right face
          const distanceToFace = Math.abs(hookEndX - corners.topRight.x);
          // If close enough to right face, it's in path
          return distanceToFace < 50; // Adjust this threshold as needed
        }
      }
    }

    // For portrait mode or fallback for landscape
    else {
      // Direction of hook movement (from origin to end)
      const hookDirectionY = hookEndY - originY;

      // Check which side the hook is approaching from
      const isApproachingFromTop = hookDirectionY > 0 && hookEndY < corners.topLeft.y;
      const isApproachingFromBottom = hookDirectionY < 0 && hookEndY > corners.bottomLeft.y;

      // If approaching from top, check alignment with top face
      if (isApproachingFromTop) {
        // Check if hook's X is between left and right of item (with margin)
        const margin = 30;
        const isXAligned =
          hookEndX >= corners.topLeft.x - margin && hookEndX <= corners.topRight.x + margin;

        if (isXAligned) {
          // Calculate how far hook is from top face
          const distanceToFace = Math.abs(hookEndY - corners.topLeft.y);
          // If close enough to top face, it's in path
          return distanceToFace < 50;
        }
      }

      // If approaching from bottom, check alignment with bottom face
      else if (isApproachingFromBottom) {
        // Check if hook's X is between left and right of item (with margin)
        const margin = 30;
        const isXAligned =
          hookEndX >= corners.bottomLeft.x - margin && hookEndX <= corners.bottomRight.x + margin;

        if (isXAligned) {
          // Calculate how far hook is from bottom face
          const distanceToFace = Math.abs(hookEndY - corners.bottomLeft.y);
          // If close enough to bottom face, it's in path
          return distanceToFace < 50;
        }
      }
    }

    // If the corner-based checks didn't return, use the traditional line-based check as fallback
    // Calculate the line parameters from hook origin to hook end (line equation: ax + by + c = 0)
    const a = hookEndY - originY;
    const b = originX - hookEndX;
    const c = hookEndX * originY - originX * hookEndY;

    // Calculate distance from item center to the line
    const lineDistance = Math.abs(a * itemCenterX + b * itemCenterY + c) / Math.sqrt(a * a + b * b);

    // Check if item is in direction of hook movement
    // Calculate relative position along the hook path
    const dotProduct =
      (itemCenterX - originX) * (hookEndX - originX) +
      (itemCenterY - originY) * (hookEndY - originY);

    // Item is in front of hook if dot product is positive
    const isInFront = dotProduct > 0;

    // Calculate distance from origin to item
    const distanceToItem = calculateDistance(originX, originY, itemCenterX, itemCenterY);

    // Check if item is within hook's maximum length
    const hookLength = calculateDistance(originX, originY, hookEndX, hookEndY);
    const isWithinRange = distanceToItem <= hookLength * 1.3; // Increased margin

    // Define a threshold for how close to the line the item needs to be
    const hookSize = GAME_CONFIG.HOOK_SIZE || 30;
    const pathThreshold = isLandscape
      ? Math.max(item.width, item.height) + hookSize + 25 // Landscape
      : Math.max(item.width, item.height) + hookSize + 20; // Portrait

    // Fallback check
    return lineDistance < pathThreshold && isInFront && isWithinRange;
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };
  // Helper function to calculate distance between two points

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
