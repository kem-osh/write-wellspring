import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true };
    }
    
    const width = window.innerWidth;
    return {
      isMobile: width <= MOBILE_BREAKPOINT,
      isTablet: width > MOBILE_BREAKPOINT && width <= TABLET_BREAKPOINT,
      isDesktop: width > TABLET_BREAKPOINT
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setDeviceInfo({
        isMobile: width <= MOBILE_BREAKPOINT,
        isTablet: width > MOBILE_BREAKPOINT && width <= TABLET_BREAKPOINT,
        isDesktop: width > TABLET_BREAKPOINT
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
}