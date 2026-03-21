import { useState } from 'react';
import { Calendar, Hash, User, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/quotation';

interface Props {
  projectNo: string;
  quotationDate: string;
  customers: Customer[];
  selectedCustomerId?: string;
  onProjectNoChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSelectCustomer: (id: string | undefined) => void;
  layout?: 'mobile' | 'desktop';
  quotationNo?: string;
}

export function QuotationMobileInfo({ projectNo, quotationDate, customers, selectedCustomerId, onProjectNoChange, onDateChange, onSelectCustomer, layout = 'mobile', quotationNo }: Props) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const dateValue = quotationDate ? new Date(quotationDate) : new Date();

  if (layout === 'desktop') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={projectNo} onChange={e => onProjectNoChange(e.target.value)} placeholder="工程编号" className="pl-7 h-7 text-xs w-40 bg-secondary/50 border-0 font-mono" />
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 font-normal">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {quotationDate ? format(dateValue, 'yyyy/MM/dd') : '日期'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <CalendarComponent mode="single" selected={dateValue} onSelect={date => { if (date) { onDateChange(format(date, 'yyyy-MM-dd')); setCalendarOpen(false); } }} initialFocus />
          </PopoverContent>
        </Popover>
        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 font-normal max-w-[160px]">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className={cn("truncate", !selectedCustomer && "text-muted-foreground")}>{selectedCustomer ? selectedCustomer.nameZh : '客户'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="center">
            <Command>
              <CommandInput placeholder="搜索客户..." className="h-9" />
              <CommandList>
                <CommandEmpty>未找到客户</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="none" onSelect={() => { onSelectCustomer(undefined); setCustomerOpen(false); }}><span className="text-muted-foreground">无客户</span></CommandItem>
                  {customers.map(c => (
                    <CommandItem key={c.id} value={c.nameZh} onSelect={() => { onSelectCustomer(c.id); setCustomerOpen(false); }}>
                      <div className="flex flex-col"><span>{c.nameZh}</span>{c.nameEn && <span className="text-xs text-muted-foreground">{c.nameEn}</span>}</div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={projectNo} onChange={e => onProjectNoChange(e.target.value)} placeholder="工程编号" className="pl-8 h-9 text-sm bg-background/50 border-border font-mono" />
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("h-9 justify-start text-left font-normal text-sm px-2.5 bg-background/50 border-border", !quotationDate && "text-muted-foreground")}>
              <Calendar className="w-4 h-4 mr-1.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{quotationDate ? format(dateValue, 'yyyy/MM/dd') : '选择日期'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent mode="single" selected={dateValue} onSelect={date => { if (date) { onDateChange(format(date, 'yyyy-MM-dd')); setCalendarOpen(false); } }} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full h-9 justify-between text-sm bg-background/50 border-border">
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className={cn("truncate", !selectedCustomer && "text-muted-foreground")}>{selectedCustomer ? selectedCustomer.nameZh : '选择客户 (可选)'}</span>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] max-w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜索客户..." className="h-9" />
            <CommandList>
              <CommandEmpty>未找到客户</CommandEmpty>
              <CommandGroup>
                <CommandItem value="none" onSelect={() => { onSelectCustomer(undefined); setCustomerOpen(false); }}><span className="text-muted-foreground">无客户</span></CommandItem>
                {customers.map(c => (
                  <CommandItem key={c.id} value={c.nameZh} onSelect={() => { onSelectCustomer(c.id); setCustomerOpen(false); }}>
                    <div className="flex flex-col"><span>{c.nameZh}</span>{c.nameEn && <span className="text-xs text-muted-foreground">{c.nameEn}</span>}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
