import { useState, useCallback } from 'react';

export interface DashboardSection {
  id: string;
  labelKey: string;
  visible: boolean;
}

const STORAGE_KEY = 'dashboard_layout_v1';

const defaultSections: DashboardSection[] = [
  { id: 'stat-cards', labelKey: 'dashboard.coreMetrics', visible: true },
  { id: 'monthly-trend', labelKey: 'dashboard.monthlyTrend', visible: true },
  { id: 'balance-cards', labelKey: 'dashboard.balanceOverview', visible: true },
  { id: 'project-table', labelKey: 'dashboard.projectOverview', visible: true },
  { id: 'financial-overview', labelKey: 'dashboard.financialOverview', visible: true },
  { id: 'profit-category', labelKey: 'dashboard.profitAndCategory', visible: true },
];

function loadLayout(): DashboardSection[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSections;
    const parsed = JSON.parse(stored) as DashboardSection[];
    // Merge with defaults to handle new sections
    return defaultSections.map(def => {
      const found = parsed.find(p => p.id === def.id);
      return found ? { ...def, visible: found.visible } : def;
    });
  } catch {
    return defaultSections;
  }
}

export function useDashboardLayout() {
  const [sections, setSections] = useState<DashboardSection[]>(loadLayout);

  const toggleSection = useCallback((id: string) => {
    setSections(prev => {
      const next = prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSections(defaultSections);
  }, []);

  const isVisible = useCallback((id: string) => {
    return sections.find(s => s.id === id)?.visible ?? true;
  }, [sections]);

  return { sections, toggleSection, resetLayout, isVisible };
}
