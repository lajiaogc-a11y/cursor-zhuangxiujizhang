/**
 * Reports Service Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as reportsService from '@/services/reports.service';
import { format } from 'date-fns';

export type { ReportData, ComparisonData, ProjectProfitData } from '@/services/reports.service';

interface UseReportDataOptions {
  tenantId: string | undefined;
  dateFrom?: Date;
  dateTo?: Date;
  labels: {
    other: string;
    statusLabels: Record<string, string>;
    monthNames: string[];
    monthSuffix: string;
    language: string;
    expenseCategoryLabels: Record<string, string>;
  };
}

export function useReportData(opts: UseReportDataOptions) {
  return useQuery({
    queryKey: [...queryKeys.reports, opts.tenantId, opts.dateFrom?.toISOString(), opts.dateTo?.toISOString(), opts.labels.language],
    queryFn: () => reportsService.fetchReportData(
      opts.tenantId!,
      {
        dateFrom: opts.dateFrom ? format(opts.dateFrom, 'yyyy-MM-dd') : undefined,
        dateTo: opts.dateTo ? format(opts.dateTo, 'yyyy-MM-dd') : undefined,
      },
      opts.labels
    ),
    enabled: !!opts.tenantId,
  });
}

interface UseYearlyDataOptions {
  tenantId: string | undefined;
  year: number;
  labels: {
    language: string;
    monthNames: string[];
    monthSuffix: string;
    incomeLabel: string;
    expenseLabel: string;
    profitLabel: string;
  };
}

export function useYearlyData(opts: UseYearlyDataOptions) {
  return useQuery({
    queryKey: [...queryKeys.reports, 'yearly', opts.year, opts.tenantId, opts.labels.language],
    queryFn: () => reportsService.fetchYearlyData(opts.tenantId!, opts.year, opts.labels),
    enabled: !!opts.tenantId,
  });
}
