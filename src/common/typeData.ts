export type ItemType = 'gold' | 'stone' | 'diamond';

export interface Item {
  id: number;
  type: ItemType;
  weight: number;
  value: number;
  image: any;
  x: number; // Vị trí X
  y: number; // Vị trí Y
}
