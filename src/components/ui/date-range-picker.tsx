import * as React from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, subDays, startOfWeek, endOfWeek, subWeeks, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subQuarters, subYears, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";

export type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'last7days' | 'last30days' | 'last90days';

interface PresetItem {
  label: string;
  value: DatePreset;
  getRange: () => DateRange;
}

function usePresets(t: (key: string) => string): PresetItem[] {
  return React.useMemo(() => [
    { label: t('date.today'), value: 'today' as DatePreset, getRange: () => { const d = startOfDay(new Date()); return { from: d, to: d }; } },
    { label: t('date.yesterday'), value: 'yesterday' as DatePreset, getRange: () => { const d = startOfDay(subDays(new Date(), 1)); return { from: d, to: d }; } },
    { label: t('date.thisWeek'), value: 'thisWeek' as DatePreset, getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
    { label: t('date.lastWeek'), value: 'lastWeek' as DatePreset, getRange: () => { const w = subWeeks(new Date(), 1); return { from: startOfWeek(w, { weekStartsOn: 1 }), to: endOfWeek(w, { weekStartsOn: 1 }) }; } },
    { label: t('date.thisMonth'), value: 'thisMonth' as DatePreset, getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: t('date.lastMonth'), value: 'lastMonth' as DatePreset, getRange: () => { const m = subMonths(new Date(), 1); return { from: startOfMonth(m), to: endOfMonth(m) }; } },
    { label: t('date.thisQuarter'), value: 'thisQuarter' as DatePreset, getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
    { label: t('date.lastQuarter'), value: 'lastQuarter' as DatePreset, getRange: () => { const q = subQuarters(new Date(), 1); return { from: startOfQuarter(q), to: endOfQuarter(q) }; } },
    { label: t('date.last7days'), value: 'last7days' as DatePreset, getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: startOfDay(new Date()) }) },
    { label: t('date.last30days'), value: 'last30days' as DatePreset, getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: startOfDay(new Date()) }) },
    { label: t('date.last90days'), value: 'last90days' as DatePreset, getRange: () => ({ from: startOfDay(subDays(new Date(), 89)), to: startOfDay(new Date()) }) },
    { label: t('date.thisYear'), value: 'thisYear' as DatePreset, getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
    { label: t('date.lastYear'), value: 'lastYear' as DatePreset, getRange: () => { const y = subYears(new Date(), 1); return { from: startOfYear(y), to: endOfYear(y) }; } },
  ], [t]);
}

function getActivePreset(dateRange: DateRange | undefined, presets: PresetItem[]): DatePreset | null {
  if (!dateRange?.from) return null;
  for (const preset of presets) {
    const r = preset.getRange();
    if (r.from && dateRange.from && isSameDay(r.from, dateRange.from) &&
        r.to && dateRange.to && isSameDay(r.to, dateRange.to)) {
      return preset.value;
    }
  }
  return null;
}

// ─── DateRangePicker ───

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  showPresets?: boolean;
  align?: "start" | "center" | "end";
  placeholder?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  showPresets = true,
  align = "start",
  placeholder,
}: DateRangePickerProps) {
  const { t, language } = useI18n();
  const [open, setOpen] = React.useState(false);
  const presets = usePresets(t);
  const activePreset = getActivePreset(dateRange, presets);

  const handlePresetClick = (preset: PresetItem) => {
    onDateRangeChange(preset.getRange());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
  };

  const displayText = React.useMemo(() => {
    if (!dateRange?.from) return placeholder || t('common.selectDate');
    if (dateRange.to) return `${format(dateRange.from, "yyyy-MM-dd")} ~ ${format(dateRange.to, "yyyy-MM-dd")}`;
    return format(dateRange.from, "yyyy-MM-dd");
  }, [dateRange, placeholder, t]);

  const hasValue = dateRange?.from || dateRange?.to;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !hasValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{displayText}</span>
          {hasValue && (
            <X className="ml-2 h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClear} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        {showPresets && (
          <div className="px-3 pt-3 pb-2 border-b">
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
              {t('date.quickSelect')}
            </div>
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={activePreset === preset.value ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px] rounded-full"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="p-2">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { onDateRangeChange(undefined); setOpen(false); }}
            >
              {t('date.clear')}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              {t('date.confirm')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── SingleDatePicker ───

interface SingleDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
  showPresets?: boolean;
  align?: "start" | "center" | "end";
  placeholder?: string;
}

export function SingleDatePicker({
  date,
  onDateChange,
  className,
  showPresets = false,
  align = "start",
  placeholder,
}: SingleDatePickerProps) {
  const { t, language } = useI18n();
  const [open, setOpen] = React.useState(false);

  const singlePresets = [
    { label: t('date.today'), getDate: () => startOfDay(new Date()) },
    { label: t('date.yesterday'), getDate: () => startOfDay(subDays(new Date(), 1)) },
  ];

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">
            {date ? format(date, "yyyy-MM-dd") : placeholder || t('common.selectDate')}
          </span>
          {date && (
            <X className="ml-2 h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClear} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        {showPresets && (
          <div className="px-3 pt-3 pb-2 border-b">
            <div className="flex flex-wrap gap-1">
              {singlePresets.map((preset, idx) => (
                <Button
                  key={idx}
                  variant={date && isSameDay(date, preset.getDate()) ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px] rounded-full"
                  onClick={() => { onDateChange(preset.getDate()); setOpen(false); }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="p-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => { onDateChange(d); setOpen(false); }}
            initialFocus
            className="pointer-events-auto"
          />
          {date && (
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { onDateChange(undefined); setOpen(false); }}
              >
                {t('date.clear')}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
