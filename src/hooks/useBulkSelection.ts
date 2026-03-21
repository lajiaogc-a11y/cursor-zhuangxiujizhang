import { useState, useCallback, useMemo } from 'react';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every(item => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const isSomeSelected = useMemo(
    () => items.some(item => selectedIds.has(item.id)) && !isAllSelected,
    [items, selectedIds, isAllSelected]
  );

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  }, [items, isAllSelected]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedCount = useMemo(
    () => items.filter(i => selectedIds.has(i.id)).length,
    [items, selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggleAll,
    toggleOne,
    clearSelection,
  };
}
