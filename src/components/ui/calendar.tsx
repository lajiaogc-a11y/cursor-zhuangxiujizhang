import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DropdownProps } from "react-day-picker";
import { enUS, zhCN } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 安全获取语言设置，避免在 I18nProvider 外部使用时崩溃
function useLanguageSafe(): 'zh' | 'en' {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app-language') : null;
    return (saved as 'zh' | 'en') || 'zh';
  } catch {
    return 'zh';
  }
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// 自定义下拉组件 - 使用 Shadcn Select 替代原生下拉
function CustomDropdown(props: DropdownProps) {
  const { value, onChange, children, caption, "aria-label": ariaLabel } = props;

  // 从 children 中提取 options
  const options = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>> =>
      React.isValidElement(child) && child.type === "option"
  );

  const handleValueChange = (newValue: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: newValue },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <Select value={value?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger 
        className="h-8 w-auto gap-1 border-none bg-transparent px-2 font-medium hover:bg-accent focus:ring-0 focus:ring-offset-0"
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={caption} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((option) => (
          <SelectItem
            key={option.props.value?.toString()}
            value={option.props.value?.toString() || ""}
            disabled={option.props.disabled}
          >
            {option.props.children}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  // 使用安全的语言获取方式，避免依赖 I18nProvider
  const language = useLanguageSafe();

  // Default year range: 20 years before and 10 years after current year
  const currentYear = new Date().getFullYear();
  const fromYear = props.fromYear ?? currentYear - 20;
  const toYear = props.toYear ?? currentYear + 10;

  // If consumer doesn't provide locale, use current app language.
  const locale = props.locale ?? (language === "zh" ? zhCN : enUS);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      fromYear={fromYear}
      toYear={toYear}
      locale={locale}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex items-center gap-2",
        dropdown_month: "relative",
        dropdown_year: "relative",
        dropdown: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        vhidden: "sr-only",
        ...classNames,
      }}
      components={{
        Dropdown: CustomDropdown,
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
