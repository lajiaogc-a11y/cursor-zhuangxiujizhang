import { useState, useCallback, useMemo } from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function useSortableTable<T>() {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const requestSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }, []);

  const sortData = useCallback((data: T[], getValue: (item: T, key: string) => any): T[] => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = getValue(a, sortConfig.key);
      const bVal = getValue(b, sortConfig.key);

      // null/undefined sort last
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        const aStr = String(aVal);
        const bStr = String(bVal);
        // Date pattern yyyy-MM-dd
        if (/^\d{4}-\d{2}/.test(aStr) && /^\d{4}-\d{2}/.test(bStr)) {
          comparison = aStr.localeCompare(bStr);
        } else {
          comparison = aStr.localeCompare(bStr, 'zh-CN', { numeric: true });
        }
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [sortConfig]);

  return { sortConfig, requestSort, sortData };
}
