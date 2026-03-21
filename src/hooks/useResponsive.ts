import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: Breakpoint;
}

const MOBILE_MAX = 599;
const TABLET_MAX = 899;

function getBreakpoint(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return 'mobile';
  if (width <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

export function useResponsive(): ResponsiveState {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'desktop'
  );

  useEffect(() => {
    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const mqlTablet = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`);

    const update = () => setBreakpoint(getBreakpoint(window.innerWidth));

    mqlMobile.addEventListener('change', update);
    mqlTablet.addEventListener('change', update);
    update();

    return () => {
      mqlMobile.removeEventListener('change', update);
      mqlTablet.removeEventListener('change', update);
    };
  }, []);

  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    breakpoint,
  };
}
