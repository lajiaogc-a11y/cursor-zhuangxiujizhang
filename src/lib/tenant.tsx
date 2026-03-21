import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

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

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      setTenant(saved || activeTenants[0] || null);
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

  const switchTenant = useCallback((tenantId: string) => {
    const found = tenants.find(t => t.id === tenantId);
    if (found && user) {
      setSwitching(true);
      setTenant(found);
      localStorage.setItem(`active_tenant_${user.id}`, tenantId);
      // Invalidate ALL react-query caches so data refetches for the new tenant
      queryClient.invalidateQueries().finally(() => {
        // Short delay to let queries start refetching
        setTimeout(() => setSwitching(false), 300);
      });
    }
  }, [tenants, user, queryClient]);

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
