import { ImageSourcePropType } from 'react-native';

export type AnimationConfig = {
  frames: ImageSourcePropType[];
  frameDuration: number;
  loop: boolean;
};

export const ANIMATION_CONFIGS: Record<number, AnimationConfig> = {
  1: {
    frames: [
      require('../../assets/environment/tree_0.png'),
      require('../../assets/environment/tree_1.png'),
    ],
    frameDuration: 800,
    loop: true,
  },
  3: {
    frames: [
      require('../../assets/environment/flower_0.png'),
      require('../../assets/environment/flower_1.png'),
      require('../../assets/environment/flower_2.png'),
    ],
    frameDuration: 350,
    loop: true,
  },
  4: {
    frames: [
      require('../../assets/environment/water_0.png'),
      require('../../assets/environment/water_1.png'),
      require('../../assets/environment/water_2.png'),
      require('../../assets/environment/water_3.png'),
    ],
    frameDuration: 500,
    loop: true,
  },
};

export const getAnimationConfig = (tileType: number): AnimationConfig | null => {
  return ANIMATION_CONFIGS[tileType] ?? null;
};
