import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { prefetchTenantCommonData } from '@/lib/prefetchTenantData';

/** 切换租户：失效旧/新 tenantId 出现在 queryKey 中的查询，避免 `invalidateQueries()` 无差别刷新 */
function invalidateQueriesForTenantSwitch(qc: QueryClient, previousId: string | null, nextId: string) {
  return qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey as unknown[];
      if (!Array.isArray(k)) return false;
      if (k.includes(nextId)) return true;
      if (previousId != null && k.includes(previousId)) return true;
      return false;
    },
  });
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  max_members: number;
  logo_url: string | null;
  expires_at: string | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  switching: boolean;
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

/** 同步当前租户到 profiles，供 RLS 函数 get_user_tenant_id() 读取（与 localStorage 一致） */
async function persistActiveTenantToProfile(userId: string, tenantId: string) {
  try {
    const { data: row } = await supabase.from('profiles').select('preferences').eq('user_id', userId).maybeSingle();
    const prefs =
      row?.preferences && typeof row.preferences === 'object' && !Array.isArray(row.preferences)
        ? (row.preferences as Record<string, unknown>)
        : {};
    await supabase
      .from('profiles')
      .update({ preferences: { ...prefs, active_tenant_id: tenantId } as any })
      .eq('user_id', userId);
  } catch (e) {
    console.warn('persistActiveTenantToProfile failed:', e);
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastPrefetchTenantIdRef = useRef<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setTenant(null);
      setTenants([]);
      setLoading(false);
      return;
    }

    // Clear previous user's tenant state early to avoid showing stale switcher data
    setTenant(null);
    setTenants([]);

    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select('tenant_id, role, tenants(id, name, slug, plan, status, max_members, logo_url, expires_at)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching tenants:', error);
        setTenant(null);
        setTenants([]);
        setLoading(false);
        return;
      }

      const activeTenants = (data || [])
        .map((m: any) => m.tenants)
        .filter((t: any) => t && t.status === 'active' && (!t.expires_at || new Date(t.expires_at) >= new Date())) as Tenant[];

      setTenants(activeTenants);

      // Restore last selected tenant from localStorage, or pick first
      const savedId = localStorage.getItem(`active_tenant_${user.id}`);
      const saved = activeTenants.find(t => t.id === savedId);
      const chosen = saved || activeTenants[0] || null;
      setTenant(chosen);
      // 必须先写入 DB，后续请求才能通过 get_user_tenant_id() 命中当前组织
      if (chosen) {
        await persistActiveTenantToProfile(user.id, chosen.id);
      }
    } catch (err) {
      console.error('Error in fetchTenants:', err);
      setTenant(null);
      setTenants([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  /** 租户就绪后后台预取常用读接口（与页面 useQuery key 对齐）；每租户只触发一次 */
  useEffect(() => {
    if (!user) {
      lastPrefetchTenantIdRef.current = null;
      return;
    }
    if (!tenant?.id || loading) return;
    if (lastPrefetchTenantIdRef.current === tenant.id) return;
    lastPrefetchTenantIdRef.current = tenant.id;
    void prefetchTenantCommonData(queryClient, tenant.id);
  }, [user, tenant?.id, loading, queryClient]);

  const switchTenant = useCallback((tenantId: string) => {
    const found = tenants.find(t => t.id === tenantId);
    if (!found || !user) return;
    const previousId = tenant?.id ?? null;
    setSwitching(true);
    setTenant(found);
    localStorage.setItem(`active_tenant_${user.id}`, tenantId);
    lastPrefetchTenantIdRef.current = null;
    void (async () => {
      await persistActiveTenantToProfile(user.id, tenantId);
      try {
        await invalidateQueriesForTenantSwitch(queryClient, previousId, tenantId);
        await prefetchTenantCommonData(queryClient, tenantId);
      } finally {
        setTimeout(() => setSwitching(false), 300);
      }
    })();
  }, [tenants, user, queryClient, tenant?.id]);

  return (
    <TenantContext.Provider value={{ tenant, tenants, loading, switching, switchTenant, refreshTenants: fetchTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
