import React, { useState, useEffect } from 'react';
import { Image, ImageStyle } from 'react-native';
import { AnimationConfig } from '../data/AnimationConfig';

type AnimatedSpriteProps = {
  animation: AnimationConfig;
  style: ImageStyle;
};

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({ animation, style }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (animation.frames.length <= 1) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= animation.frames.length) {
          return animation.loop ? 0 : prev;
        }
        return next;
      });
    }, animation.frameDuration);

    return () => clearInterval(interval);
  }, [animation.frames.length, animation.frameDuration, animation.loop]);

  return (
    <Image
      source={animation.frames[frameIndex]}
      style={style}
      resizeMode="cover"
    />
  );
};
