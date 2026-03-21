import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';
import { useTenant } from '@/lib/tenant';
import { subscribeToTable } from '@/services/base';
import * as memosService from '@/services/memos.service';

export function useMemoCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: count = 0 } = useQuery({
    queryKey: [...queryKeys.memoCount, tenantId],
    queryFn: () => memosService.fetchActiveReminderCount(tenantId!),
    enabled: !!user && !!tenantId,
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToTable('memos-count', 'memos', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memoCount });
    });

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memoCount });
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, queryClient]);

  return count;
}
