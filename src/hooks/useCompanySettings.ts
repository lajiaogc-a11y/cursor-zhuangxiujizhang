import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { defaultSettings } from '@/data/defaultSettings';
import type { CompanySettings } from '@/types/quotation';
import * as qs from '@/services/quotation.service';

export function useCompanySettings() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: settings = defaultSettings, isLoading } = useQuery({
    queryKey: ['q_company_settings', tenantId],
    queryFn: () => qs.fetchCompanySettings(defaultSettings) as Promise<CompanySettings>,
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const updateSettings = useMutation({
    mutationFn: (s: CompanySettings) => qs.updateCompanySettings(s, user?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['q_company_settings', tenantId] }),
  });

  return { settings, loading: isLoading, updateSettings };
}
