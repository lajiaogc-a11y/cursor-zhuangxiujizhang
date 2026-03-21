import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: TablePaginationProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isShowAll = pageSize >= totalItems && totalItems > 0;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const selectValue = isShowAll ? "all" : pageSize.toString();
  const handlePageSizeChange = (value: string) => {
    if (value === "all") {
      onPageSizeChange(totalItems || 99999);
    } else {
      onPageSizeChange(Number(value));
    }
  };

  if (isMobile) {
    return (
      <div className="flex items-center justify-between px-2 py-3">
        <span className="text-xs text-muted-foreground">
          {startItem}-{endItem} / {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="mx-2 text-sm">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('pagination.perPage')}</span>
        <Select value={selectValue} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="h-8 w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
        <span>{t('pagination.items')}</span>
        <span className="mx-2">|</span>
        <span>
          {isShowAll
            ? `${t('pagination.showing')} ${totalItems} ${t('pagination.records')}`
            : `${t('pagination.showing')} ${startItem}-${endItem} ${t('pagination.of')} ${totalItems} ${t('pagination.records')}`}
        </span>
      </div>

      {!isShowAll && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="mx-2 text-sm">{t('pagination.page')} {currentPage} / {totalPages || 1}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
