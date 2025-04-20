export const LEVEL_CONFIGS = [
  // Level 1 - Basic introduction
  {
    targetScore: 650,
    timeLimit: 60,
    items: [
      { type: 'gold1', count: 4, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 2, valueRange: [200, 250], weightRange: [3, 4] },
      { type: 'rock1', count: 4, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 2, valueRange: [30, 50], weightRange: [6, 8] },
    ],
  },
  // Level 2 - Introduce higher value gold
  {
    targetScore: 1200,
    timeLimit: 60,
    items: [
      { type: 'gold1', count: 3, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 3, valueRange: [200, 250], weightRange: [3, 4] },
      { type: 'gold3', count: 1, valueRange: [500, 600], weightRange: [5, 6] },
      { type: 'rock1', count: 3, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 3, valueRange: [30, 50], weightRange: [6, 8] },
      { type: 'tnt', count: 1, valueRange: [-150, -100], weightRange: [1, 1] },
    ],
  },
  // Level 3 - Introduce the diamond (gold4)
  {
    targetScore: 1800,
    timeLimit: 60,
    items: [
      { type: 'gold1', count: 2, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 3, valueRange: [200, 250], weightRange: [3, 4] },
      { type: 'gold3', count: 2, valueRange: [500, 600], weightRange: [5, 6] },
      { type: 'gold4', count: 1, valueRange: [1000, 1200], weightRange: [8, 10] },
      { type: 'rock1', count: 2, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 2, valueRange: [30, 50], weightRange: [6, 8] },
      { type: 'tnt', count: 2, valueRange: [-200, -150], weightRange: [1, 1] },
    ],
  },
  // Level 4 - Challenging level with time pressure
  {
    targetScore: 2500,
    timeLimit: 50, // Less time
    items: [
      { type: 'gold1', count: 2, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 2, valueRange: [200, 250], weightRange: [3, 4] },
      { type: 'gold3', count: 2, valueRange: [500, 600], weightRange: [5, 6] },
      { type: 'gold4', count: 1, valueRange: [1000, 1200], weightRange: [8, 10] },
      { type: 'rock1', count: 3, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 3, valueRange: [30, 50], weightRange: [7, 9] },
      { type: 'tnt', count: 3, valueRange: [-250, -200], weightRange: [1, 1] },
    ],
  },
  // Level 5 - Final challenge
  {
    targetScore: 3500,
    timeLimit: 45, // Even less time
    items: [
      { type: 'gold1', count: 1, valueRange: [50, 100], weightRange: [2, 3] },
      { type: 'gold2', count: 2, valueRange: [200, 250], weightRange: [3, 4] },
      { type: 'gold3', count: 3, valueRange: [500, 600], weightRange: [5, 6] },
      { type: 'gold4', count: 2, valueRange: [1000, 1500], weightRange: [8, 10] },
      { type: 'rock1', count: 2, valueRange: [10, 20], weightRange: [4, 6] },
      { type: 'rock2', count: 3, valueRange: [30, 50], weightRange: [7, 9] },
      { type: 'tnt', count: 3, valueRange: [-300, -250], weightRange: [1, 1] },
    ],
  },
];
