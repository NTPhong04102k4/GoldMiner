// src/assets/images/index.ts
// Export all image categories
import * as Gui from './gui';
import * as Hooks from './hooks';
import * as Stones from './stone';
import * as Tnts from './tnt';
import * as Golds from './gold';
export const images = {
  ...Gui.buttons,
  ...Gui.elements,
  ...Hooks.hooks,
  ...Stones.stones,
  ...Tnts.tnts,
  ...Golds.golds,
};

// Direct exports for convenience
export * from './gui';
export * from './hooks';
export * from './stone';
export * from './tnt';
