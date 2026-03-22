/**
 * Balance Ledger Service Hooks
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useTenant } from '@/lib/tenant';
import * as balanceLedgerService from '@/services/balanceLedger.service';
import { format } from 'date-fns';

export type { CalculatedBalances, TransactionWithBalance } from '@/services/balanceLedger.service';

export function useCalculatedBalances(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.calculatedBalances, tenantId],
    queryFn: () => balanceLedgerService.fetchCalculatedBalances(tenantId!),
    enabled: !!tenantId,
  });
}

export function useLedgerTransactions(
  tenantId: string | undefined,
  filters: {
    currency: string;
    accountType: string;
    dateFrom?: Date;
    dateTo?: Date;
    search: string;
  },
  pagination: { page: number; pageSize: number },
  enabled = true
) {
  return useQuery({
    queryKey: [
      ...queryKeys.balanceLedger, tenantId,
      pagination.page, pagination.pageSize,
      filters.currency, filters.accountType,
      filters.dateFrom?.toISOString(), filters.dateTo?.toISOString(),
      filters.search,
    ],
    queryFn: () => balanceLedgerService.fetchLedgerTransactions(
      tenantId!,
      {
        currency: filters.currency,
        accountType: filters.accountType,
        dateFrom: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
        dateTo: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
        search: filters.search,
      },
      pagination
    ),
    enabled: !!tenantId && enabled,
  });
}

export function useRefreshLedger() {
  const qc = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  return () => {
    if (!tenantId) return;
    qc.invalidateQueries({ queryKey: [...queryKeys.calculatedBalances, tenantId] });
    qc.invalidateQueries({ queryKey: [...queryKeys.balanceLedger, tenantId] });
  };
}
