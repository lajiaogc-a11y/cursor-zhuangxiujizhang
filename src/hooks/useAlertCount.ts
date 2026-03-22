import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useTenant } from '@/lib/tenant';
import { subscribeToTable } from '@/services/base';
import { fetchUnresolvedAlertCount } from '@/services/alerts.service';

export function useAlertCount() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: count = 0 } = useQuery({
    queryKey: [...queryKeys.alertCount, tenantId],
    queryFn: () => fetchUnresolvedAlertCount(tenantId!),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const alertKey = [...queryKeys.alertCount, tenantId] as const;
    const unsubscribe = subscribeToTable('alert-count-changes', 'project_alerts', () => {
      queryClient.invalidateQueries({ queryKey: alertKey });
    });

    return unsubscribe;
  }, [queryClient, tenantId]);

  return count;
}
