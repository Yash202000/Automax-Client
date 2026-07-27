import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format as formatDate } from "date-fns";

import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { cn } from "@/lib/utils";
import { DateFormats } from "@/constants/dateFormat";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  format?: string;
  disabledDate?: any;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
  format = DateFormats.DATE,
  disabledDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full flex-1 justify-start font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 " />

            {value ? formatDate(value, format) : placeholder}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={disabledDate}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 hover:bg-white dark:hover:bg-background cursor-pointer"
          onClick={() => onChange?.(undefined)}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
