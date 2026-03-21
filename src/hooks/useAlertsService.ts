/**
 * Alerts Service Hooks
 * 
 * React Query hooks wrapping alerts.service.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidationMap } from '@/lib/queryKeys';
import * as alertsService from '@/services/alerts.service';

export function useAlertsData(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.alerts, tenantId],
    queryFn: () => alertsService.fetchAlertsAndRules(tenantId!),
    enabled: !!tenantId,
  });
}

export function useResolveAlert(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => alertsService.resolveAlert(alertId),
    onSuccess: () => invalidationMap.alertMutation.forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}

export function useSaveRule(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, editingRuleId }: { payload: any; editingRuleId?: string }) =>
      alertsService.saveRule(payload, editingRuleId),
    onSuccess: () => invalidationMap.alertMutation.forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, currentActive }: { ruleId: string; currentActive: boolean }) =>
      alertsService.toggleRule(ruleId, currentActive),
    onSuccess: () => invalidationMap.alertMutation.forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => alertsService.deleteRule(ruleId),
    onSuccess: () => invalidationMap.alertMutation.forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}

export function useGenerateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, messages }: { tenantId: string; messages: any }) =>
      alertsService.generateAlerts(tenantId, messages),
    onSuccess: () => invalidationMap.alertMutation.forEach(k => qc.invalidateQueries({ queryKey: k })),
  });
}
