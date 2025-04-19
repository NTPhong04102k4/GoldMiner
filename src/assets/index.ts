// src/assets/index.ts
// Export all asset modules from a central file

import * as images from './image';
// import * as Sounds from './sounds';
// import * as Animations from './animations';

export const R = {
  ...images,
  //   Sounds,
  //   Animations
};

// Shorthand export for direct imports
export * from './image';
// export * from './sounds';
// export * from './animations';
