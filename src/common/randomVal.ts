import {Dimensions} from 'react-native';
import {Item, ItemType} from './typeData';
import {VALUE_TABLE} from './data';
import goldSmall from '../assets/image/gold_small.png';
import goldMedium from '../assets/image/gold_medium.png';
import goldLarge from '../assets/image/gold_big.png';
const SCREEN_WIDTH = Dimensions.get('screen').width;
const SCREEN_HEIGHT = Dimensions.get('screen').height;
import stoneSmall from '../assets/image/stone_small.png';
import stoneMedium from '../assets/image/stone_medium.png';
import stoneLarge from '../assets/image/stone_big.png';
import diamond from '../assets/image/kimcuong.png';
const HOOK_POSITION_Y = 150; // Khoảng cách từ móc kéo

const getRandomWeight = (): number =>
  Math.max(0.1, parseFloat((Math.random() * 3).toFixed(2)));

// Bản đồ ảnh sử dụng require() thay vì đường dẫn chuỗi
const imageMap = {
  gold: [goldSmall, goldMedium, goldLarge],
  stone: [stoneSmall, stoneMedium, stoneLarge],
  diamond: [diamond],
};

// Random vị trí X đảm bảo trải đều
const getRandomX = (index: number, total: number): number => {
  const spacing = SCREEN_WIDTH / (total + 1); // Khoảng cách giữa vật phẩm
  return spacing * (index + 1);
};

// Random vị trí Y (vàng lớn nằm dưới cùng)
const getRandomY = (type: ItemType, weight: number): number => {
  let baseY = HOOK_POSITION_Y + 100 + Math.random() * 100; // Cách móc kéo ít nhất 150px
  if (type === 'gold' && weight >= 2) {
    baseY += 100;
  } // Nếu vàng lớn, hạ xuống
  return baseY;
};

export const generateItems = (level: number): Item[] => {
  const items: Item[] = [];

  // Tạo 5 vật phẩm vàng hoặc đá
  for (let i = 0; i < 5; i++) {
    const type: ItemType = Math.random() < 0.5 ? 'gold' : 'stone';
    const weight = getRandomWeight();
    const roundedWeight = Math.ceil(weight);
    const value = VALUE_TABLE[type][roundedWeight - 1];
    const x = getRandomX(i, 5);
    const y = getRandomY(type, weight);

    // Lấy ảnh từ imageMap thay vì đường dẫn chuỗi
    const image = imageMap[type]?.[roundedWeight - 1] || imageMap.gold[0];

    items.push({id: i + 1, type, weight, value, image, x, y});
  }

  // Thêm kim cương theo cấp độ
  for (let i = 0; i < level + 1; i++) {
    const x = getRandomX(i, level + 1);
    const y = getRandomY('diamond', 1);

    items.push({
      id: items.length + 1,
      type: 'diamond',
      weight: 1,
      value: 500,
      image: imageMap.diamond,
      x,
      y,
    });
  }

  return items;
};
