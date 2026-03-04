import { useCallback, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

export function useScrollTop(threshold = 520) {
  const scrollRef = useRef<ScrollView>(null);
  const showRef = useRef(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const shouldShow = event.nativeEvent.contentOffset.y > threshold;
      if (shouldShow !== showRef.current) {
        showRef.current = shouldShow;
        setShowScrollTop(shouldShow);
      }
    },
    [threshold]
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return {
    scrollRef,
    showScrollTop,
    onScroll,
    scrollToTop,
  };
}

