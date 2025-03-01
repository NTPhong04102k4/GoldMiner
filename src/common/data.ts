import {ItemType} from './typeData';

export const GOLD_IMAGES = [
  '../../assets/image/gold_small.png',
  '../../assets/image/gold_medium.png',
  '../../assets/image/gold_large.png',
];
export const STONE_IMAGES = [
  '../../assets/image/stone_small.png',
  '../../assets/image/stone_medium.png',
  '../../assets/image/stone_large.png',
];
export const DIAMOND_IMAGE = '../../assets/image/kimcuong.png';
export const VALUE_TABLE: Record<ItemType, number[]> = {
  gold: [100, 300, 600],
  stone: [10, 20, 30],
  diamond: [500],
};
