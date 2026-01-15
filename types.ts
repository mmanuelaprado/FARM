
export enum CropType {
  WHEAT = 'WHEAT',
  CORN = 'CORN',
  BLUEBERRY = 'BLUEBERRY',
  CARROT = 'CARROT',
  STRAWBERRY = 'STRAWBERRY',
  TOMATO = 'TOMATO',
  PUMPKIN = 'PUMPKIN',
  DRAGON_FRUIT = 'DRAGON_FRUIT',
  PINEAPPLE = 'PINEAPPLE',
  GIANT_WATERMELON = 'GIANT_WATERMELON'
}

export enum AnimalType {
  CHICKEN = 'CHICKEN',
  COW = 'COW'
}

export enum ToolType {
  SEED = 'SEED',
  WATER = 'WATER'
}

export enum MaterialType {
  WOOD = 'WOOD',
  BRICK = 'BRICK',
  TILE = 'TILE'
}

export interface MaterialData {
  type: MaterialType;
  name: string;
  cost: number;
  icon: string;
}

export interface CropData {
  type: CropType;
  name: string;
  growthTime: number;
  value: number;
  cost: number;
  icon: string;
  color: string;
  minLevel?: number;
}

export interface AnimalData {
  type: AnimalType;
  name: string;
  produceName: string;
  produceIcon: string;
  produceTime: number; 
  produceValue: number;
  cost: number;
  icon: string;
}

export interface Plot {
  id: number;
  crop: CropType | null;
  plantedAt: number | null;
  watered: boolean;
  unlocked: boolean;
}

export interface AnimalSlot {
  id: number;
  type: AnimalType;
  lastProducedAt: number;
}

export interface GameState {
  coins: number;
  xp: number;
  level: number;
  inventory: Record<string, number>; 
  seedInventory: Record<CropType, number>;
  materialInventory: Record<MaterialType, number>;
  animals: AnimalSlot[];
  houseLevel: number;
}
