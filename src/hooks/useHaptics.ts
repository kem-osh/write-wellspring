import { useCallback } from 'react';

export interface HapticsOptions {
  impact?: 'light' | 'medium' | 'heavy';
  notification?: 'success' | 'warning' | 'error';
  selection?: boolean;
}

export function useHaptics() {
  const triggerHaptic = useCallback((type: keyof HapticsOptions, style?: string) => {
    // Check if device supports haptic feedback
    if (!('vibrate' in navigator)) return;

    try {
      switch (type) {
        case 'impact':
          // Light, medium, or heavy impact
          const impactPatterns = {
            light: [10],
            medium: [20],
            heavy: [50]
          };
          navigator.vibrate(impactPatterns[style as keyof typeof impactPatterns] || [10]);
          break;

        case 'notification':
          // Success, warning, or error patterns
          const notificationPatterns = {
            success: [50, 50, 50],
            warning: [100, 50, 100],
            error: [100, 100, 200]
          };
          navigator.vibrate(notificationPatterns[style as keyof typeof notificationPatterns] || [50]);
          break;

        case 'selection':
          // Simple selection feedback
          navigator.vibrate([5]);
          break;

        default:
          navigator.vibrate([10]);
      }
    } catch (error) {
      // Silently fail if haptics not supported
      console.debug('Haptic feedback not supported', error);
    }
  }, []);

  const impactLight = useCallback(() => triggerHaptic('impact', 'light'), [triggerHaptic]);
  const impactMedium = useCallback(() => triggerHaptic('impact', 'medium'), [triggerHaptic]);
  const impactHeavy = useCallback(() => triggerHaptic('impact', 'heavy'), [triggerHaptic]);
  
  const notificationSuccess = useCallback(() => triggerHaptic('notification', 'success'), [triggerHaptic]);
  const notificationWarning = useCallback(() => triggerHaptic('notification', 'warning'), [triggerHaptic]);
  const notificationError = useCallback(() => triggerHaptic('notification', 'error'), [triggerHaptic]);
  
  const selectionChanged = useCallback(() => triggerHaptic('selection'), [triggerHaptic]);

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationWarning,
    notificationError,
    selectionChanged,
    triggerHaptic
  };
}