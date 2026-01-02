import { ImageSourcePropType } from 'react-native';
import { Direction } from './CharacterState';

export type DirectionalSprites = {
  [key in Direction]: ImageSourcePropType[];
};

export const CHARACTER_SPRITES: Record<string, DirectionalSprites> = {
  brown: {
    front: [
      require('../../assets/character/walk_front_0.png'),
      require('../../assets/character/walk_front_1.png'),
    ],
    back: [
      require('../../assets/character/walk_back_0.png'),
      require('../../assets/character/walk_back_1.png'),
    ],
    left: [
      require('../../assets/character/walk_left_0.png'),
      require('../../assets/character/walk_left_1.png'),
    ],
    right: [
      require('../../assets/character/walk_right_0.png'),
      require('../../assets/character/walk_right_1.png'),
    ],
  },
  grey: {
    front: [
      require('../../assets/character/walk_front_0_grey.png'),
      require('../../assets/character/walk_front_1_grey.png'),
    ],
    back: [
      require('../../assets/character/walk_back_0_grey.png'),
      require('../../assets/character/walk_back_1_grey.png'),
    ],
    left: [
      require('../../assets/character/walk_left_0_grey.png'),
      require('../../assets/character/walk_left_1_grey.png'),
    ],
    right: [
      require('../../assets/character/walk_right_0_grey.png'),
      require('../../assets/character/walk_right_1_grey.png'),
    ],
  },
};

export const getCharacterSprite = (
  direction: Direction,
  frame: number,
  hairColor: string = 'brown'
): ImageSourcePropType => {
  const spriteSet = CHARACTER_SPRITES[hairColor] ?? CHARACTER_SPRITES.brown;
  const sprites = spriteSet[direction];
  return sprites[frame % sprites.length];
};
