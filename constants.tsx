
import { CropType, CropData, AnimalType, AnimalData } from './types';

export const CROPS: Record<CropType, CropData> = {
  [CropType.WHEAT]: {
    type: CropType.WHEAT,
    name: 'Trigo',
    growthTime: 5,
    value: 12,
    cost: 2,
    icon: '🌾',
    color: 'bg-yellow-200'
  },
  [CropType.CORN]: {
    type: CropType.CORN,
    name: 'Milho',
    growthTime: 15,
    value: 35,
    cost: 5,
    icon: '🌽',
    color: 'bg-yellow-400'
  },
  [CropType.CARROT]: {
    type: CropType.CARROT,
    name: 'Cenoura',
    growthTime: 30,
    value: 90,
    cost: 10,
    icon: '🥕',
    color: 'bg-orange-400'
  },
  [CropType.TOMATO]: {
    type: CropType.TOMATO,
    name: 'Tomate',
    growthTime: 60,
    value: 280,
    cost: 25,
    icon: '🍅',
    color: 'bg-red-400'
  },
  [CropType.PUMPKIN]: {
    type: CropType.PUMPKIN,
    name: 'Abóbora',
    growthTime: 120,
    value: 750,
    cost: 50,
    icon: '🎃',
    color: 'bg-orange-600'
  },
  [CropType.DRAGON_FRUIT]: {
    type: CropType.DRAGON_FRUIT,
    name: 'Fruta Dragão',
    growthTime: 300, // 5 minutos
    value: 2500,
    cost: 200,
    icon: '🐲',
    color: 'bg-purple-600',
    minLevel: 10
  }
};

export const ANIMALS: Record<AnimalType, AnimalData> = {
  [AnimalType.CHICKEN]: {
    type: AnimalType.CHICKEN,
    name: 'Galinha',
    produceName: 'Ovo',
    produceIcon: '🥚',
    produceTime: 20,
    produceValue: 80,
    cost: 100,
    icon: '🐔'
  },
  [AnimalType.COW]: {
    type: AnimalType.COW,
    name: 'Vaca',
    produceName: 'Leite',
    produceIcon: '🥛',
    produceTime: 45,
    produceValue: 250,
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
