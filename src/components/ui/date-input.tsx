import * as React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface DateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, placeholder, disabled, id }, ref) => {
    const { t } = useI18n();
    const [displayValue, setDisplayValue] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Sync external value to display value
    React.useEffect(() => {
      if (value) {
        // Convert YYYY-MM-DD to display format
        const cleaned = value.replace(/-/g, '');
        setDisplayValue(formatDisplay(cleaned));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    // Format raw digits to YYYY-MM-DD display
    const formatDisplay = (digits: string): string => {
      const d = digits.slice(0, 8); // Max 8 digits
      if (d.length <= 4) return d;
      if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
      return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
    };

    // Convert display format back to raw digits
    const toDigits = (display: string): string => {
      return display.replace(/\D/g, '');
    };

    // Convert raw digits to YYYY-MM-DD value
    const toValue = (digits: string): string => {
      if (digits.length < 8) return '';
      const year = digits.slice(0, 4);
      const month = digits.slice(4, 6);
      const day = digits.slice(6, 8);
      return `${year}-${month}-${day}`;
    };

    // Validate date
    const isValidDate = (digits: string): boolean => {
      if (digits.length !== 8) return false;
      const year = parseInt(digits.slice(0, 4));
      const month = parseInt(digits.slice(4, 6));
      const day = parseInt(digits.slice(6, 8));
      
      if (year < 1900 || year > 2100) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      
      // Basic month-day validation
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) return false;
      
      return true;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const digits = toDigits(input);
      
      // Limit to 8 digits (YYYYMMDD)
      if (digits.length > 8) return;
      
      const formatted = formatDisplay(digits);
      setDisplayValue(formatted);
      
      // Only emit valid complete dates
      if (digits.length === 8 && isValidDate(digits)) {
        onChange(toValue(digits));
      } else if (digits.length === 0) {
        onChange('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, navigation
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))
      ) {
        return;
      }
      
      // Block non-numeric input
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const digits = toDigits(pastedText).slice(0, 8);
      
      if (digits.length > 0) {
        const formatted = formatDisplay(digits);
        setDisplayValue(formatted);
        
        if (digits.length === 8 && isValidDate(digits)) {
          onChange(toValue(digits));
        }
      }
    };

    const handleBlur = () => {
      const digits = toDigits(displayValue);
      
      // If incomplete, try to format with defaults or clear
      if (digits.length > 0 && digits.length < 8) {
        // Pad with current date defaults if partial
        const now = new Date();
        let padded = digits;
        
        // Pad year if only 2 digits
        if (digits.length === 2) {
          padded = `20${digits}`;
        }
        
        // If we have at least 4 digits for year, pad rest
        if (padded.length >= 4 && padded.length < 8) {
          const year = padded.slice(0, 4);
          const month = padded.length >= 6 ? padded.slice(4, 6) : String(now.getMonth() + 1).padStart(2, '0');
          const day = padded.length === 8 ? padded.slice(6, 8) : String(now.getDate()).padStart(2, '0');
          padded = `${year}${month}${day}`;
          
          if (isValidDate(padded)) {
            setDisplayValue(formatDisplay(padded));
            onChange(toValue(padded));
            return;
          }
        }
        
        // If can't complete, restore original
        if (value) {
          setDisplayValue(formatDisplay(value.replace(/-/g, '')));
        } else {
          setDisplayValue('');
        }
      }
    };

    return (
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={placeholder || t('common.selectDate')}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        maxLength={10} // YYYY-MM-DD
        autoComplete="off"
      />
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
