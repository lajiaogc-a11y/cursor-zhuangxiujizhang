import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortConfig } from '@/hooks/useSortableTable';

interface SortableTableHeadProps {
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableTableHead({ sortKey, sortConfig, onSort, children, className }: SortableTableHeadProps) {
  const isActive = sortConfig?.key === sortKey;

  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {isActive ? (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}
