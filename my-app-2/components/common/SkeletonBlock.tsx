import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

type SkeletonBlockProps = {
  style?: StyleProp<ViewStyle>;
  color?: string;
  animated?: boolean;
};

export function SkeletonBlock({
  style,
  color = '#283244',
  animated = true,
}: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotionEnabled(enabled);
        }
      })
      .catch(() => {
        // non-fatal
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotionEnabled(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!animated || reduceMotionEnabled) {
      opacity.setValue(0.65);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.92,
          duration: 640,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 640,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [animated, opacity, reduceMotionEnabled]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          borderRadius: 10,
          opacity,
        },
        style,
      ]}
    />
  );
}
