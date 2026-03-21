import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveTableProps {
  mobileView: ReactNode;
  tabletView?: ReactNode;
  desktopView: ReactNode;
}

/**
 * Three-tier responsive wrapper:
 * - Mobile (<=599px): renders mobileView (card-based)
 * - Tablet (600-899px): renders tabletView (compact table) or falls back to desktopView
 * - Desktop (>=900px): renders desktopView (full table)
 */
export function ResponsiveTable({ mobileView, tabletView, desktopView }: ResponsiveTableProps) {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) return <>{mobileView}</>;
  if (isTablet && tabletView) return <>{tabletView}</>;
  return <>{desktopView}</>;
}
