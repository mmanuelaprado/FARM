
import { CropType, CropData, AnimalType, AnimalData, MaterialType, MaterialData } from './types';

export const CROPS: Record<CropType, CropData> = {
  [CropType.WHEAT]: { type: CropType.WHEAT, name: 'Trigo', growthTime: 5, value: 12, cost: 2, icon: '🌾', color: 'bg-yellow-200' },
  [CropType.CORN]: { type: CropType.CORN, name: 'Milho', growthTime: 12, value: 30, cost: 5, icon: '🌽', color: 'bg-yellow-400', minLevel: 2 },
  [CropType.BLUEBERRY]: { type: CropType.BLUEBERRY, name: 'Mirtilo', growthTime: 20, value: 65, cost: 12, icon: '🫐', color: 'bg-blue-400', minLevel: 4 },
  [CropType.CARROT]: { type: CropType.CARROT, name: 'Cenoura', growthTime: 30, value: 100, cost: 15, icon: '🥕', color: 'bg-orange-400', minLevel: 6 },
  [CropType.STRAWBERRY]: { type: CropType.STRAWBERRY, name: 'Morango', growthTime: 45, value: 180, cost: 30, icon: '🍓', color: 'bg-red-400', minLevel: 9 },
  [CropType.TOMATO]: { type: CropType.TOMATO, name: 'Tomate', growthTime: 60, value: 300, cost: 45, icon: '🍅', color: 'bg-red-500', minLevel: 12 },
  [CropType.PUMPKIN]: { type: CropType.PUMPKIN, name: 'Abóbora', growthTime: 120, value: 850, cost: 100, icon: '🎃', color: 'bg-orange-600', minLevel: 15 },
  [CropType.BLACKBERRY]: { type: CropType.BLACKBERRY, name: 'Amora', growthTime: 180, value: 1200, cost: 150, icon: '🫐', color: 'bg-purple-800', minLevel: 18 },
  [CropType.CHERRY]: { type: CropType.CHERRY, name: 'Cereja', growthTime: 240, value: 1800, cost: 220, icon: '🍒', color: 'bg-red-600', minLevel: 22 },
  [CropType.BANANA]: { type: CropType.BANANA, name: 'Banana', growthTime: 360, value: 2800, cost: 300, icon: '🍌', color: 'bg-yellow-300', minLevel: 25 },
  [CropType.DRAGON_FRUIT]: { type: CropType.DRAGON_FRUIT, name: 'Fruta Dragão', growthTime: 600, value: 5500, cost: 600, icon: '🐲', color: 'bg-purple-600', minLevel: 30 },
  [CropType.PINEAPPLE]: { type: CropType.PINEAPPLE, name: 'Abacaxi', growthTime: 1200, value: 12000, cost: 1200, icon: '🍍', color: 'bg-yellow-500', minLevel: 40 },
  [CropType.GIANT_WATERMELON]: { type: CropType.GIANT_WATERMELON, name: 'Melancia G.', growthTime: 2400, value: 35000, cost: 3500, icon: '🍉', color: 'bg-green-500', minLevel: 60 }
};

export const ANIMALS: Record<AnimalType, AnimalData> = {
  [AnimalType.CHICKEN]: { type: AnimalType.CHICKEN, name: 'Galinha', produceName: 'Ovo', produceIcon: '🥚', produceTime: 60, produceValue: 120, cost: 150, icon: '🐔' },
  [AnimalType.BEE]: { type: AnimalType.BEE, name: 'Abelha', produceName: 'Mel', produceIcon: '🍯', produceTime: 90, produceValue: 200, cost: 450, icon: '🐝' },
  [AnimalType.COW]: { type: AnimalType.COW, name: 'Vaca', produceName: 'Leite', produceIcon: '🥛', produceTime: 150, produceValue: 450, cost: 800, icon: '🐄' }
};

export const MATERIALS: Record<MaterialType, MaterialData> = {
  [MaterialType.WOOD]: { type: MaterialType.WOOD, name: 'Madeira', cost: 50, icon: '🪵' },
  [MaterialType.BRICK]: { type: MaterialType.BRICK, name: 'Tijolo', cost: 150, icon: '🧱' },
  [MaterialType.TILE]: { type: MaterialType.TILE, name: 'Telha', cost: 300, icon: '🧇' }
};

export const HOUSE_UPGRADES = [
  { level: 0, name: "Acampamento", icon: "⛺", req: { [MaterialType.WOOD]: 0, [MaterialType.BRICK]: 0, [MaterialType.TILE]: 0 }, cost: 0 },
  { level: 1, name: "Barraco de Madeira", icon: "🛖", req: { [MaterialType.WOOD]: 5, [MaterialType.BRICK]: 0, [MaterialType.TILE]: 0 }, cost: 500 },
  { level: 2, name: "Cabana Rústica", icon: "🏠", req: { [MaterialType.WOOD]: 15, [MaterialType.BRICK]: 10, [MaterialType.TILE]: 0 }, cost: 2000 },
  { level: 3, name: "Fazenda de Luxo", icon: "🏡", req: { [MaterialType.WOOD]: 30, [MaterialType.BRICK]: 30, [MaterialType.TILE]: 15 }, cost: 8000 },
  { level: 4, name: "Mansão Colonial", icon: "🏛️", req: { [MaterialType.WOOD]: 60, [MaterialType.BRICK]: 60, [MaterialType.TILE]: 40 }, cost: 25000 }
];

export const XP_BASE = 250; 
export const INITIAL_COINS = 100;
export const INITIAL_PLOT_COUNT = 6;
export const MAX_PLOT_COUNT = 12;
export const PLOT_UNLOCK_COST = 200;
