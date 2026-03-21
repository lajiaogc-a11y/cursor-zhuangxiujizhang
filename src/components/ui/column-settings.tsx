import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ColumnConfig } from '@/hooks/useColumnSettings';

interface ColumnSettingsProps {
  columns: ColumnConfig[];
  onToggleColumn: (columnId: string) => void;
  onReset: () => void;
}

export function ColumnSettings({ columns, onToggleColumn, onReset }: ColumnSettingsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          列设置
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>显示/隐藏列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuItem
            key={column.id}
            className="flex items-center gap-2 cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              onToggleColumn(column.id);
            }}
          >
            <Checkbox
              checked={column.visible}
              className="pointer-events-none"
            />
            <span>{column.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          重置默认
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
