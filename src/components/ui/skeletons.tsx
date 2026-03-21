import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** 6-column stat cards skeleton */
export function DashStatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Chart card skeleton */
export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ height }}>
          <div className="flex items-end gap-2 h-full pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                <Skeleton className="w-full rounded-t" style={{ height: `${30 + Math.random() * 50}%` }} />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Transaction list skeleton */
export function TransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="px-4">
        <div className="space-y-1">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="space-y-1.5 text-right ml-3">
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Balance cards skeleton (6 currency cards) */
export function BalanceCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
            {i < 3 && (
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border mt-2">
                <div className="space-y-1 text-center">
                  <Skeleton className="h-2.5 w-8 mx-auto" />
                  <Skeleton className="h-3.5 w-16 mx-auto" />
                </div>
                <div className="space-y-1 text-center">
                  <Skeleton className="h-2.5 w-8 mx-auto" />
                  <Skeleton className="h-3.5 w-16 mx-auto" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Table skeleton for list pages */
export function TableSkeleton({ columns = 5, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-3.5 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, ri) => (
                <tr key={ri} className="border-b border-border last:border-0">
                  {Array.from({ length: columns }).map((_, ci) => (
                    <td key={ci} className="px-4 py-3">
                      <Skeleton className="h-4" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Full dashboard skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse-subtle">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28" />
      </div>
      <DashStatCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <TransactionListSkeleton />
      </div>
      <BalanceCardsSkeleton />
    </div>
  );
}
