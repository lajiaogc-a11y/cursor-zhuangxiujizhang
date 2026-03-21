import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { defaultSettings } from '@/data/defaultSettings';
import type { CompanySettings } from '@/types/quotation';
import * as qs from '@/services/quotation.service';

export function useCompanySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = defaultSettings, isLoading } = useQuery({
    queryKey: ['q_company_settings'],
    queryFn: () => qs.fetchCompanySettings(defaultSettings) as Promise<CompanySettings>,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const updateSettings = useMutation({
    mutationFn: (s: CompanySettings) => qs.updateCompanySettings(s, user?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['q_company_settings'] }),
  });

  return { settings, loading: isLoading, updateSettings };
}
