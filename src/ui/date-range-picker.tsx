"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

interface DatePickerWithRangeProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
}

const today = new Date();

const presetRanges = {
  "Last 7 Days": {
    from: subDays(today, 6),
    to: today,
  },

  "Last 30 Days": {
    from: subDays(today, 29),
    to: today,
  },
};

export function DatePickerWithRange({
  value,
  onChange,
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    setRange(value);
  }, [value]);

  const handleSelect = (selected: DateRange | undefined) => {
    setRange(selected);

    if (selected?.from && selected?.to) {
      onChange?.(selected);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[220px] justify-start text-left font-normal",
            !range && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />

          {range?.from ? (
            range.to ? (
              <>
                {format(range.from, "dd MMM yyyy")} -{" "}
                {format(range.to, "dd MMM yyyy")}
              </>
            ) : (
              format(range.from, "dd MMM yyyy")
            )
          ) : (
            "Select date range"
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={range?.from}
          min={1}
        />
        <div className="border-t flex items-center justify-between">
          <div className="flex gap-2 p-3">
            {Object.entries(presetRanges).map(([label, value]) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setRange(value);
                  onChange?.(value);
                  setOpen(false);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="mx-2"
            onClick={() => {
              setRange(undefined);
              onChange?.(undefined);
              setOpen(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
