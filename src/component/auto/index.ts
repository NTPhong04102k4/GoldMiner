import { GAME_CONFIG } from './../hooks/index';
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem } from '../engine/type';
import { useGameEngine } from '../engine';
import { height, ITEM_PRIORITIES, width } from './data';

const HOOK_MIN_LENGTH = 10;
const POSITION_COOLDOWN_TIME = 5000;

// Interface cho vị trí đã kéo
interface PulledPosition {
  x: number;
  y: number;
  timestamp: number;
  radius: number;
}

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

  // Thêm state cho ngăn xếp vị trí đã kéo
  const [pulledPositions, setPulledPositions] = useState<PulledPosition[]>([]);

  const [autoPlayerState, setAutoPlayerState] = useState({
    enabled: playerConfig.enabled,
    thinking: false,
    targetItem: null as GameItem | null,
    lastActionTime: 0,
    decisionLog: [] as string[],
    manualAngles: [] as number[],
    manualTargetItems: [] as string[],
    waitingForAngle: false,
    isHookActive: false,
  });

  const decisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayActiveRef = useRef(playerConfig.enabled);
  const manualModeRef = useRef(false);
  const lastActionTimeRef = useRef(0);

  // Hàm để kiểm tra xem một vị trí có nằm trong ngăn xếp vị trí đã kéo không
  const isPositionInCooldown = (x: number, y: number): boolean => {
    const currentTime = Date.now();

    // Lọc bỏ các vị trí đã hết thời gian cooldown (quá 5 giây)
    const validPositions = pulledPositions.filter(
      pos => currentTime - pos.timestamp < POSITION_COOLDOWN_TIME
    );

    // Nếu danh sách đã thay đổi, cập nhật lại state
    if (validPositions.length !== pulledPositions.length) {
      setPulledPositions(validPositions);
    }

    // Kiểm tra xem vị trí hiện tại có gần với bất kỳ vị trí nào trong danh sách không
    return validPositions.some(pos => {
      const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      return distance <= pos.radius; // Nếu nằm trong bán kính, trả về true
    });
  };

  // Hàm để thêm vị trí vào ngăn xếp
  const addPositionToCooldown = (item: GameItem) => {
    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;
    const radius = Math.max(item.width, item.height) / 2 + 10; // Bán kính an toàn

    setPulledPositions(prev => [
      ...prev,
      {
        x: itemCenterX,
        y: itemCenterY,
        timestamp: Date.now(),
        radius: radius,
      },
    ]);

    logDecision(
      `Added position (${itemCenterX.toFixed(0)}, ${itemCenterY.toFixed(0)}) to cooldown list`
    );
  };

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

  const deployHookAtAngle = (angle: number) => {
    if (angle < -80 || angle > 80) {
      logDecision(`Invalid angle: ${angle}. Must be between -80 and 80 degrees.`);
      return false;
    }

    setAutoPlayerState(prev => ({
      ...prev,
      manualAngles: [...prev.manualAngles, angle],
      waitingForAngle: true,
    }));

    if (!autoPlayerState.enabled) {
      toggleAutoPlayer();
    } else if (!decisionTimerRef.current) {
      startDecisionProcess();
    }

    manualModeRef.current = true;
    logDecision(`Added manual angle: ${angle}°`);
    return true;
  };

  const deployHookToItems = (itemIds: string[]) => {
    if (!itemIds.length) {
      logDecision('No item IDs provided');
      return false;
    }

    // Lọc ra những item chưa được thu thập
    const uncollectedItemIds = itemIds.filter(id => {
      const item = gameState.items.find(item => item.id === id);
      return item && !item.collected;
    });

    if (uncollectedItemIds.length === 0) {
      logDecision('All specified items have already been collected');
      return false;
    }

    // Thêm danh sách ID vào danh sách mục tiêu
    setAutoPlayerState(prev => ({
      ...prev,
      manualTargetItems: [...prev.manualTargetItems, ...uncollectedItemIds],
    }));

    // Đảm bảo auto player được bật để xử lý
    if (!autoPlayerState.enabled) {
      toggleAutoPlayer();
    } else if (!decisionTimerRef.current) {
      startDecisionProcess();
    }

    manualModeRef.current = true;
    logDecision(`Added manual target items: ${uncollectedItemIds.join(', ')}`);
    return true;
  };

  // Deploy hook at multiple angles
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

    // Make decisions every 50ms
    decisionTimerRef.current = setInterval(() => {
      // Skip if game isn't playing or auto player is disabled
      if (!autoplayActiveRef.current || gameState.gameStatus !== 'playing') {
        return;
      }

      // Skip if hook is not in swinging state (it's moving or in another state)
      if (gameState.hookState !== 'swinging') {
        // Reset hook active state when hook returns to swinging state
        if (autoPlayerState.isHookActive) {
          setAutoPlayerState(prev => ({
            ...prev,
            isHookActive: false,
          }));
        }
        return;
      }

      // Check for minimum time between hook deployments (1 second)
      const currentTime = Date.now();
      if (currentTime - lastActionTimeRef.current < 1000) {
        return;
      }

      // Nếu ở chế độ thủ công, kiểm tra các góc/vật phẩm thủ công trước
      if (manualModeRef.current) {
        makeManualDecision();
        return; // Always return after attempting manual decision
      }

      // Nếu không ở chế độ thủ công, thực hiện quyết định tự động
      makeDecision();
    }, 50);

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

  // FIXED: Improved isItemReachableAtAngle to check both minimum and maximum distances
  const isItemReachableAtAngle = (
    item: GameItem,
    currentAngle: number,
    angleTolerance: number = 5
  ): boolean => {
    const targetAngle = calculateTargetAngle(item);
    const angleMatch = Math.abs(targetAngle - currentAngle) <= angleTolerance;
    const dist = calculateDistance(item);

    // Check both minimum and maximum distances to avoid passing through items
    return angleMatch && dist <= GAME_CONFIG.ROPE_MAX_LENGTH && dist >= HOOK_MIN_LENGTH;
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
        // Kiểm tra xem vị trí này có đang trong thời gian cooldown không
        const itemCenterX = item.x + item.width / 2;
        const itemCenterY = item.y + item.height / 2;
        const inCooldown = isPositionInCooldown(itemCenterX, itemCenterY);

        let score = calculateItemScore(item);
        const targetAngle = calculateTargetAngle(item);
        const angleDifference = Math.abs(currentAngle - targetAngle);
        const distance = calculateDistance(item);
        const maxDistance = Math.sqrt(width * width + height * height);
        const hasObstacles = hasObstaclesInPath(item, items);

        // Nếu vị trí đang trong thời gian cooldown, giảm điểm số xuống rất thấp
        if (inCooldown) {
          score *= 0.1; // Giảm 90% điểm số
        }

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

        // FIXED: Lower score for items that are too close to avoid passing through
        if (distance < HOOK_MIN_LENGTH) {
          score *= 0.1; // Significantly reduce score for too-close items
        }

        return { item, score };
      });

    return ratedItems.sort((a, b) => b.score - a.score);
  };

  // FIXED: Improved the manual decision function with proper checks
  const makeManualDecision = () => {
    if (autoPlayerState.isHookActive || Date.now() - lastActionTimeRef.current < 1000) {
      return false;
    }

    let actionPerformed = false;

    if (manualModeRef.current) {
      if (autoPlayerState.manualAngles.length > 0) {
        const angle = autoPlayerState.manualAngles[0]; // Read first without shifting yet

        if (angle !== undefined) {
          logDecision(`Deploying hook at manual angle: ${angle}`);

          // First set the angle, then toggle the hook
          gameEngine.setHookAngle(angle);
          toggleHook();

          // Update state AFTER deploying hook
          setAutoPlayerState(prev => ({
            ...prev,
            manualAngles: prev.manualAngles.slice(1), // Remove the used angle
            isHookActive: true,
            lastActionTime: Date.now(),
          }));

          // Update ref for time tracking
          lastActionTimeRef.current = Date.now();
          actionPerformed = true;
        }
      } else if (autoPlayerState.manualTargetItems.length > 0) {
        const targetId = autoPlayerState.manualTargetItems[0]; // Read first without shifting yet
        const targetItem = gameState.items.find(item => item.id === targetId);

        if (targetItem) {
          const angle = calculateTargetAngle(targetItem);
          const distance = calculateDistance(targetItem);

          // Check if the item is at a reasonable distance
          if (distance >= HOOK_MIN_LENGTH && distance <= GAME_CONFIG.ROPE_MAX_LENGTH) {
            // Kiểm tra xem vị trí này có đang trong thời gian cooldown không
            const itemCenterX = targetItem.x + targetItem.width / 2;
            const itemCenterY = targetItem.y + targetItem.height / 2;

            if (!isPositionInCooldown(itemCenterX, itemCenterY)) {
              logDecision(`Deploying hook to manual target item: ${targetItem.type}`);

              // First set the angle, then toggle the hook
              gameEngine.setHookAngle(angle);
              toggleHook();

              // Thêm vị trí này vào danh sách cooldown
              addPositionToCooldown(targetItem);

              // Update state AFTER deploying hook
              setAutoPlayerState(prev => ({
                ...prev,
                manualTargetItems: prev.manualTargetItems.slice(1), // Remove the used target
                isHookActive: true,
                lastActionTime: Date.now(),
              }));

              // Update ref for time tracking
              lastActionTimeRef.current = Date.now();
              actionPerformed = true;
            } else {
              logDecision(`Skipping target item - in cooldown period: ${targetItem.type}`);
              // Keep this target in the list since it's just in cooldown
            }
          } else {
            logDecision(`Skipping target item - unreachable distance: ${distance.toFixed(2)}`);
            // Remove this target since it's unreachable
            setAutoPlayerState(prev => ({
              ...prev,
              manualTargetItems: prev.manualTargetItems.slice(1),
            }));
          }
        } else {
          // Item not found, remove from list
          setAutoPlayerState(prev => ({
            ...prev,
            manualTargetItems: prev.manualTargetItems.slice(1),
          }));
        }
      }
      return actionPerformed;
    }
  };

  useEffect(() => {
    // Kiểm tra và loại bỏ các mục tiêu đã được thu thập từ danh sách
    if (manualModeRef.current && autoPlayerState.manualTargetItems.length > 0) {
      const uncollectedTargets = autoPlayerState.manualTargetItems.filter(targetId => {
        const item = gameState.items.find(item => item.id === targetId);
        return item && !item.collected;
      });

      if (uncollectedTargets.length !== autoPlayerState.manualTargetItems.length) {
        setAutoPlayerState(prev => ({
          ...prev,
          manualTargetItems: uncollectedTargets,
        }));

        logDecision('Removed collected targets from manual target list');
      }
    }
  }, [gameState.items]);

  // FIXED: Improved the auto decision function with proper checks
  const makeDecision = () => {
    // Skip if already thinking, hook is active, or it's too soon for another action
    if (
      autoPlayerState.thinking ||
      autoPlayerState.isHookActive ||
      Date.now() - lastActionTimeRef.current < 1000
    ) {
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

    // Calculate distance to verify it's within reachable range
    const distance = calculateDistance(bestTarget.item);
    if (distance < HOOK_MIN_LENGTH || distance > GAME_CONFIG.ROPE_MAX_LENGTH) {
      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
      return;
    }

    // Kiểm tra xem vị trí mục tiêu có đang trong thời gian cooldown không
    const itemCenterX = bestTarget.item.x + bestTarget.item.width / 2;
    const itemCenterY = bestTarget.item.y + bestTarget.item.height / 2;

    if (isPositionInCooldown(itemCenterX, itemCenterY)) {
      logDecision(`Best target (${bestTarget.item.type}) is in cooldown period, skipping`);
      setAutoPlayerState(prev => ({ ...prev, thinking: false }));
      return;
    }

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
        } (value: ${bestTarget.item.value}, score: ${bestTarget.score.toFixed(
          2
        )}, distance: ${distance.toFixed(2)})`
      );

      // Thêm vị trí này vào danh sách cooldown
      addPositionToCooldown(bestTarget.item);

      // Update both state and ref for last action time
      lastActionTimeRef.current = Date.now();

      setAutoPlayerState(prev => ({
        ...prev,
        thinking: false,
        targetItem: bestTarget.item,
        lastActionTime: Date.now(),
        isHookActive: true,
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
      // Xóa danh sách vị trí đã kéo khi bắt đầu level mới
      setPulledPositions([]);
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

  // ADDED: Monitor hook state changes
  useEffect(() => {
    // Reset isHookActive when hook returns to swinging state
    if (gameState.hookState === 'swinging' && autoPlayerState.isHookActive) {
      setAutoPlayerState(prev => ({
        ...prev,
        isHookActive: false,
      }));
    }
  }, [gameState.hookState]);

  // Xóa các vị trí đã hết thời gian cooldown (chạy mỗi giây)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const currentTime = Date.now();
      setPulledPositions(prev =>
        prev.filter(pos => currentTime - pos.timestamp < POSITION_COOLDOWN_TIME)
      );
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    autoPlayerState,
    toggleAutoPlayer,
    setConfig,
    startDecisionProcess,
    stopDecisionProcess,
    logDecision,
    // Functions for manual control
    deployHookAtAngle,
    deployHookToItems,
    deployHookToAngles,
    // Utility functions
    calculateTargetAngle,
    calculateDistance,
    rateItems,
    isItemReachableAtAngle,
    // Cooldown functions
    pulledPositions,
    isPositionInCooldown,
    addPositionToCooldown,
  };
};
