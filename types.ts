
export enum CropType {
  WHEAT = 'WHEAT',
  CORN = 'CORN',
  CARROT = 'CARROT',
  TOMATO = 'TOMATO',
  PUMPKIN = 'PUMPKIN'
}

export enum AnimalType {
  CHICKEN = 'CHICKEN',
  COW = 'COW'
}

export enum ToolType {
  SEED = 'SEED',
  WATER = 'WATER'
}

export interface CropData {
  type: CropType;
  name: string;
  growthTime: number;
  value: number;
  cost: number;
  icon: string;
  color: string;
}

export interface AnimalData {
  type: AnimalType;
  name: string;
  produceName: string;
  produceIcon: string;
  produceTime: number; // segundos
  produceValue: number;
  cost: number;
  icon: string;
}

export interface Plot {
  id: number;
  crop: CropType | null;
  plantedAt: number | null;
  watered: boolean;
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
  inventory: Record<string, number>; // Frutos e produtos animais
  seedInventory: Record<CropType, number>;
  animals: AnimalSlot[];
}
