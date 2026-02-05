import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, X } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export function DateInput({ value, onChange, className }: DateInputProps) {
  const [inputValue, setInputValue] = React.useState(() => 
    format(value, "yyyy-MM-dd")
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setInputValue(format(value, "yyyy-MM-dd"));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const parsed = parse(newValue, "yyyy-MM-dd", new Date());
    if (isValid(parsed) && newValue.length === 10) {
      onChange(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parse(inputValue, "yyyy-MM-dd", new Date());
    if (isValid(parsed)) {
      onChange(parsed);
    } else {
      setInputValue(format(value, "yyyy-MM-dd"));
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(new Date());
    setInputValue(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <div className={cn("flex gap-2 items-center", className)}>
      <div className="relative flex-1">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="YYYY-MM-DD"
          className="pr-8 font-mono"
          data-testid="input-date-text"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
            data-testid="button-clear-date"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            data-testid="button-date-picker"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            defaultMonth={value}
            className="[--cell-size:2.5rem]"
            classNames={{
              month_caption: "flex h-10 w-full items-center justify-center px-10",
              caption_label: "text-base font-medium",
              weekday: "text-sm",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
