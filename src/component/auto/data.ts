import { Dimensions } from 'react-native';

export const ITEM_PRIORITIES = {
  gold4: 10, // Diamond (highest priority)
  gold3: 8, // Large gold nugget
  gold2: 6, // Medium gold nugget
  gold1: 4, // Small gold nugget
  rock2: 2, // Large rock
  rock1: 1, // Small rock
  tnt: -5, // TNT (avoid)
};
export const { width, height } = Dimensions.get('screen');
