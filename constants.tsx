
import { CropType, CropData, AnimalType, AnimalData } from './types';

export const CROPS: Record<CropType, CropData> = {
  [CropType.WHEAT]: {
    type: CropType.WHEAT,
    name: 'Trigo',
    growthTime: 5,
    value: 5,
    cost: 2,
    icon: '🌾',
    color: 'bg-yellow-200'
  },
  [CropType.CORN]: {
    type: CropType.CORN,
    name: 'Milho',
    growthTime: 15,
    value: 12,
    cost: 5,
    icon: '🌽',
    color: 'bg-yellow-400'
  },
  [CropType.CARROT]: {
    type: CropType.CARROT,
    name: 'Cenoura',
    growthTime: 30,
    value: 25,
    cost: 10,
    icon: '🥕',
    color: 'bg-orange-400'
  },
  [CropType.TOMATO]: {
    type: CropType.TOMATO,
    name: 'Tomate',
    growthTime: 60,
    value: 60,
    cost: 25,
    icon: '🍅',
    color: 'bg-red-400'
  },
  [CropType.PUMPKIN]: {
    type: CropType.PUMPKIN,
    name: 'Abóbora',
    growthTime: 120,
    value: 150,
    cost: 50,
    icon: '🎃',
    color: 'bg-orange-600'
  }
};

export const ANIMALS: Record<AnimalType, AnimalData> = {
  [AnimalType.CHICKEN]: {
    type: AnimalType.CHICKEN,
    name: 'Galinha',
    produceName: 'Ovo',
    produceIcon: '🥚',
    produceTime: 20,
    produceValue: 15,
    cost: 100,
    icon: '🐔'
  },
  [AnimalType.COW]: {
    type: AnimalType.COW,
    name: 'Vaca',
    produceName: 'Leite',
    produceIcon: '🥛',
    produceTime: 45,
    produceValue: 40,
    cost: 250,
    icon: '🐄'
  }
};

export const XP_PER_LEVEL = 100;
export const INITIAL_COINS = 50;
export const INITIAL_PLOT_COUNT = 6;
export const MAX_PLOT_COUNT = 12;
export const PLOT_UNLOCK_COST = 200;
export const ANIMAL_SLOT_COST = 300;
