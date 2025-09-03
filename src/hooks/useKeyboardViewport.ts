import { useState, useEffect } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  viewportHeight: number;
}

export function useKeyboardViewport(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      
      // Debounce to avoid excessive updates during keyboard animation
      resizeTimeout = setTimeout(() => {
        const currentHeight = window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        
        // Consider keyboard open if viewport shrinks by more than 150px
        // This threshold accounts for iOS Safari's dynamic UI
        const isKeyboardVisible = heightDiff > 150;
        
        setKeyboardState({
          isVisible: isKeyboardVisible,
          height: Math.max(0, heightDiff),
          viewportHeight: currentHeight
        });
      }, 100);
    };

    // Initial measurement
    handleResize();

    // Listen for viewport changes
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      // Modern approach using Visual Viewport API (iOS Safari 13+)
      visualViewport.addEventListener('resize', handleResize);
      return () => {
        visualViewport.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
      };
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
      };
    }
  }, []);

  return keyboardState;
}