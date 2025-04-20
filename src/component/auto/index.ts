import { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem } from '../engine/type';
import { useGameEngine } from '../engine';
import { height, ITEM_PRIORITIES, width } from './data';

const calculateItemScore = (item: GameItem): number => {
  const priorityMultiplier = ITEM_PRIORITIES[item.type] || 0;
  const valueToWeightRatio = item.value / (item.weight || 1);

  return priorityMultiplier * valueToWeightRatio;
};

interface AutoPlayerConfig {
  enabled: boolean;
  intelligenceLevel: 'basic' | 'advanced' | 'expert';
  riskTolerance: number;
  preferHighValue: boolean;
  avoidTNT: boolean;
}

const DEFAULT_CONFIG: AutoPlayerConfig = {
  enabled: true,
  intelligenceLevel: 'advanced',
  riskTolerance: 0.6,
  preferHighValue: true,
  avoidTNT: true,
};

export const useAutoPlayer = (config: Partial<AutoPlayerConfig> = {}) => {
  const playerConfig = { ...DEFAULT_CONFIG, ...config };
  const gameEngine = useGameEngine();
  const { gameState, toggleHook } = gameEngine;

  const [autoPlayerState, setAutoPlayerState] = useState({
    enabled: playerConfig.enabled,
    thinking: false,
    targetItem: null as GameItem | null,
    lastActionTime: 0,
    decisionLog: [] as string[],
    manualAngles: [] as number[], // Thêm mảng lưu góc cần móc
    manualTargetItems: [] as string[], // Thêm mảng lưu ID vật phẩm cần móc
    waitingForAngle: false, // Cờ báo đang đợi góc đúng
  });

  const decisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayActiveRef = useRef(playerConfig.enabled);
  const manualModeRef = useRef(false); // Cờ báo hiệu đang ở chế độ thủ công

  // Log decisions for debugging
  const logDecision = (message: string) => {
    setAutoPlayerState(prev => ({
      ...prev,
      decisionLog: [...prev.decisionLog.slice(-9), message],
    }));
    console.log(`[AutoPlayer] ${message}`);
  };

  const toggleAutoPlayer = () => {
    setAutoPlayerState(prev => {
      const newEnabled = !prev.enabled;
      autoplayActiveRef.current = newEnabled;

      if (newEnabled) {
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

  // NEW FUNCTION: Triển khai móc tại một góc cụ thể
  const deployHookAtAngle = (angle: number) => {
    // Kiểm tra góc hợp lệ
    if (angle < -80 || angle > 80) {
      logDecision(`Invalid angle: ${angle}. Must be between -80 and 80 degrees.`);
      return false;
    }

    // Thêm góc vào danh sách chờ
    setAutoPlayerState(prev => ({
      ...prev,
      manualAngles: [...prev.manualAngles, angle],
      waitingForAngle: true,
    }));

    // Đảm bảo auto player được bật để xử lý
    if (!autoPlayerState.enabled) {
      toggleAutoPlayer();
    } else if (!decisionTimerRef.current) {
      startDecisionProcess();
    }

    manualModeRef.current = true; // Chuyển sang chế độ thủ công
    logDecision(`Added manual angle: ${angle}°`);
    return true;
  };

  // NEW FUNCTION: Triển khai móc để kéo các vật phẩm cụ thể theo ID
  const deployHookToItems = (itemIds: string[]) => {
    if (!itemIds.length) {
      logDecision('No item IDs provided');
      return false;
    }

    // Thêm danh sách ID vào danh sách mục tiêu
    setAutoPlayerState(prev => ({
      ...prev,
      manualTargetItems: [...prev.manualTargetItems, ...itemIds],
    }));

    // Đảm bảo auto player được bật để xử lý
    if (!autoPlayerState.enabled) {
      toggleAutoPlayer();
    } else if (!decisionTimerRef.current) {
      startDecisionProcess();
    }

    manualModeRef.current = true; // Chuyển sang chế độ thủ công
    logDecision(`Added manual target items: ${itemIds.join(', ')}`);
    return true;
  };

  // NEW FUNCTION: Triển khai móc tại nhiều góc (theo thứ tự trong mảng)
  const deployHookToAngles = (angles: number[]) => {
    if (!angles.length) {
      logDecision('No angles provided');
      return false;
    }

    // Lọc góc hợp lệ
    const validAngles = angles.filter(angle => angle >= -80 && angle <= 80);

    if (validAngles.length !== angles.length) {
      logDecision('Some angles were invalid and will be ignored');
    }

    // Thêm danh sách góc vào danh sách chờ
    setAutoPlayerState(prev => ({
      ...prev,
      manualAngles: [...prev.manualAngles, ...validAngles],
      waitingForAngle: true,
    }));

    // Đảm bảo auto player được bật để xử lý
    if (!autoPlayerState.enabled) {
      toggleAutoPlayer();
    } else if (!decisionTimerRef.current) {
      startDecisionProcess();
    }

    manualModeRef.current = true; // Chuyển sang chế độ thủ công
    logDecision(`Added manual angles: ${validAngles.join(', ')}°`);
    return true;
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

      // Nếu ở chế độ thủ công, kiểm tra các góc/vật phẩm thủ công trước
      if (manualModeRef.current) {
        const manualDecision = makeManualDecision();
        if (manualDecision) return; // Nếu đã quyết định thủ công, bỏ qua quyết định tự động
      }

      // Nếu không ở chế độ thủ công hoặc không có quyết định thủ công, thực hiện quyết định tự động
      if (!manualModeRef.current) {
        makeDecision();
      }
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

  const calculateTargetAngle = (item: GameItem): number => {
    const { width: screenWidth, height: screenHeight } = {
      width: width,
      height: height,
    };

    const hookOriginX = screenWidth / 2;
    const hookOriginY = screenHeight * 0.15;

    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    const relativeX = itemCenterX - hookOriginX;
    const relativeY = itemCenterY - hookOriginY;
    let angle = Math.atan2(relativeX, relativeY) * (180 / Math.PI);

    angle = -angle;

    angle = Math.max(-80, Math.min(80, angle));

    return angle;
  };

  const calculateDistance = (item: GameItem): number => {
    const { width: screenWidth, height: screenHeight } = {
      width: width,
      height: height,
    };

    const hookOriginX = screenWidth / 2;
    const hookOriginY = screenHeight * 0.15;

    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    return Math.sqrt(
      Math.pow(itemCenterX - hookOriginX, 2) + Math.pow(itemCenterY - hookOriginY, 2)
    );
  };

  const isItemReachableAtAngle = (
    item: GameItem,
    currentAngle: number,
    angleTolerance: number = 5
  ): boolean => {
    const targetAngle = calculateTargetAngle(item);
    return Math.abs(currentAngle - targetAngle) <= angleTolerance;
  };

  const hasObstaclesInPath = (targetItem: GameItem, items: GameItem[]): boolean => {
    const { width: screenWidth, height: screenHeight } = {
      width: width,
      height: height,
    };

    const hookOriginX = screenWidth / 2;
    const hookOriginY = screenHeight * 0.15;

    const targetCenterX = targetItem.x + targetItem.width / 2;
    const targetCenterY = targetItem.y + targetItem.height / 2;

    const pathVectorX = targetCenterX - hookOriginX;
    const pathVectorY = targetCenterY - hookOriginY;
    const pathLength = Math.sqrt(pathVectorX * pathVectorX + pathVectorY * pathVectorY);

    const normalizedPathX = pathVectorX / pathLength;
    const normalizedPathY = pathVectorY / pathLength;

    // Target distance
    const targetDistance = calculateDistance(targetItem);

    for (const item of items) {
      if (item.id === targetItem.id || item.collected) {
        continue;
      }

      if (item.type === 'tnt' && !playerConfig.avoidTNT) {
        continue;
      }

      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;

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

  // NEW FUNCTION: Quyết định dựa trên đầu vào thủ công
  const makeManualDecision = (): boolean => {
    // Bỏ qua nếu đang suy nghĩ hoặc móc không ở trạng thái đang đu đưa
    if (autoPlayerState.thinking || gameState.hookState !== 'swinging') {
      return false;
    }

    // Kiểm tra nếu có góc thủ công để xử lý
    if (autoPlayerState.manualAngles.length > 0 && autoPlayerState.waitingForAngle) {
      // Lấy góc đầu tiên từ danh sách
      const targetAngle = autoPlayerState.manualAngles[0];

      // Xác định dung sai dựa trên cấp độ thông minh
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

      // Kiểm tra nếu móc đã gần đến góc mục tiêu
      if (Math.abs(gameState.hookAngle - targetAngle) <= angleTolerance) {
        // Kéo móc!
        toggleHook();

        logDecision(
          `Deploying hook at manual angle ${gameState.hookAngle.toFixed(
            1
          )}° (target: ${targetAngle.toFixed(1)}°)`
        );

        // Loại bỏ góc đã xử lý khỏi danh sách
        setAutoPlayerState(prev => ({
          ...prev,
          thinking: false,
          lastActionTime: Date.now(),
          manualAngles: prev.manualAngles.slice(1),
          waitingForAngle: prev.manualAngles.length > 1,
        }));

        return true;
      }

      return false; // Vẫn đang đợi đúng góc
    }

    // Kiểm tra nếu có vật phẩm mục tiêu thủ công
    if (autoPlayerState.manualTargetItems.length > 0) {
      setAutoPlayerState(prev => ({ ...prev, thinking: true }));

      // Lấy các vật phẩm khả dụng khớp với ID mục tiêu
      const targetItems = gameState.items.filter(
        item => !item.collected && autoPlayerState.manualTargetItems.includes(item.id)
      );

      if (targetItems.length === 0) {
        // Không còn vật phẩm mục tiêu, xóa danh sách và quay lại chế độ tự động
        setAutoPlayerState(prev => ({
          ...prev,
          thinking: false,
          manualTargetItems: [],
        }));
        manualModeRef.current = false;
        return false;
      }

      // Đánh giá các vật phẩm mục tiêu để tìm vật tốt nhất để bắt ngay
      const ratedTargetItems = targetItems
        .map(item => {
          const targetAngle = calculateTargetAngle(item);
          const angleDifference = Math.abs(gameState.hookAngle - targetAngle);
          return { item, angleDifference };
        })
        .sort((a, b) => a.angleDifference - b.angleDifference);

      // Lấy vật phẩm có khoảng cách góc nhỏ nhất
      const bestTarget = ratedTargetItems[0];

      // Xác định dung sai dựa trên cấp độ thông minh
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

      // Kiểm tra nếu ở góc thích hợp để bắt vật phẩm
      if (bestTarget.angleDifference <= angleTolerance) {
        // Kéo móc!
        toggleHook();

        logDecision(
          `Deploying hook at angle ${gameState.hookAngle.toFixed(1)}° to catch manual target ${
            bestTarget.item.type
          } (ID: ${bestTarget.item.id})`
        );

        // Loại bỏ vật phẩm đã xử lý khỏi danh sách
        setAutoPlayerState(prev => ({
          ...prev,
          thinking: false,
          targetItem: bestTarget.item,
          lastActionTime: Date.now(),
          manualTargetItems: prev.manualTargetItems.filter(id => id !== bestTarget.item.id),
        }));

        return true;
      }

      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
      return false; // Vẫn đang đợi góc thích hợp
    }

    // Nếu đã xử lý hết tất cả đầu vào thủ công, quay lại chế độ tự động
    if (
      manualModeRef.current &&
      autoPlayerState.manualAngles.length === 0 &&
      autoPlayerState.manualTargetItems.length === 0
    ) {
      manualModeRef.current = false;
    }

    return false; // Không có quyết định thủ công
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

  // Reset manual mode when all items are collected
  useEffect(() => {
    if (gameState.items.every(item => item.collected) && manualModeRef.current) {
      manualModeRef.current = false;
      setAutoPlayerState(prev => ({
        ...prev,
        manualAngles: [],
        manualTargetItems: [],
        waitingForAngle: false,
      }));
    }
  }, [gameState.items]);

  return {
    autoPlayerState,
    toggleAutoPlayer,
    setConfig,
    startDecisionProcess,
    stopDecisionProcess,
    logDecision,
    // Các hàm mới cho điều khiển thủ công
    deployHookAtAngle,
    deployHookToItems,
    deployHookToAngles,
    // Hàm tiện ích có thể cần dùng bên ngoài
    calculateTargetAngle,
    calculateDistance,
    rateItems,
    isItemReachableAtAngle,
  };
};
