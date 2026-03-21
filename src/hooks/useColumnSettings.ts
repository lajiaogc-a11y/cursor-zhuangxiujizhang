import { useState, useEffect, useCallback, useRef } from 'react';
import { loadColumnSettingsFromDB, saveColumnSettingsToDB } from '@/services/admin.service';
import { useAuth } from '@/lib/auth';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  minWidth?: number;
}

interface UseColumnSettingsOptions {
  storageKey: string;
  defaultColumns: ColumnConfig[];
}

export function useColumnSettings({ storageKey, defaultColumns }: UseColumnSettingsOptions) {
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnConfig[];
        return defaultColumns.map(defaultCol => {
          const savedCol = parsed.find(c => c.id === defaultCol.id);
          return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
        });
      }
    } catch (e) {
      console.error('Failed to load column settings:', e);
    }
    return defaultColumns;
  });

  const dbSyncedRef = useRef(false);

  useEffect(() => {
    const loadFromDB = async () => {
      if (!user?.id) return;
      try {
        const dbSettings = await loadColumnSettingsFromDB(user.id, storageKey);
        if (dbSettings && Array.isArray(dbSettings)) {
          const merged = defaultColumns.map(defaultCol => {
            const dbCol = dbSettings.find((c: any) => c.id === defaultCol.id);
            return dbCol ? { ...defaultCol, ...dbCol } : defaultCol;
          });
          setColumns(merged);
          localStorage.setItem(storageKey, JSON.stringify(merged));
        }
      } catch (e) {
        console.error('Failed to load column settings from DB:', e);
      }
      dbSyncedRef.current = true;
    };
    loadFromDB();
  }, [storageKey, user?.id]);

  useEffect(() => {
    if (!dbSyncedRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    } catch (e) {
      console.error('Failed to save column settings:', e);
    }

    const timer = setTimeout(async () => {
      if (!user?.id) return;
      try {
        const minimalColumns = columns.map(c => ({ id: c.id, visible: c.visible, width: c.width }));
        await saveColumnSettingsToDB(user.id, storageKey, minimalColumns);
      } catch (e) {
        console.error('Failed to save column settings to DB:', e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [columns, storageKey, user?.id]);

  const toggleColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.map(col => col.id === columnId ? { ...col, visible: !col.visible } : col));
  }, []);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns(prev => prev.map(col => col.id === columnId ? { ...col, width } : col));
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(defaultColumns);
  }, [defaultColumns]);

  const visibleColumns = columns.filter(col => col.visible);

  return { columns, visibleColumns, toggleColumn, setColumnWidth, resetColumns };
}
