// Game item types
export type ItemType = 'gold1' | 'gold2' | 'gold3' | 'gold4' | 'rock1' | 'rock2' | 'tnt';

// Hook states
export type HookState = 'swinging' | 'extending' | 'retracting' | 'pulling';

// Game status
export type GameStatus = 'ready' | 'playing' | 'levelCompleted' | 'gameOver' | 'gameCompleted';

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
