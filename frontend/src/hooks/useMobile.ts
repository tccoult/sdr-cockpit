/**
 * Mobile detection hook
 * Detects screen size below 1024px (Tailwind lg breakpoint)
 */

import { useState, useEffect } from 'react';

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    handleMediaChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  return isMobile;
}
