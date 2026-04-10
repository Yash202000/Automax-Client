import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailChipInputProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function EmailChipInput({
  value,
  onChange,
  placeholder,
  className,
}: EmailChipInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addChip = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (email && !value.includes(email)) {
      onChange([...value, email]);
    }
    setInputValue("");
  };

  const removeChip = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (inputValue.trim()) addChip(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeChip(value.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) addChip(inputValue);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    // Support pasting comma/semicolon/space separated addresses
    const emails = pasted.split(/[,;\s]+/).filter(Boolean);
    if (emails.length > 1) {
      const unique = emails.filter(
        (em) => !value.includes(em.toLowerCase().trim()),
      );
      onChange([...value, ...unique.map((em) => em.toLowerCase().trim())]);
    } else {
      setInputValue(pasted);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 items-center min-h-[38px] px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent cursor-text",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-medium"
        >
          {chip}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeChip(i);
            }}
            className="hover:text-violet-600"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[140px] outline-none text-sm bg-transparent placeholder:text-slate-400"
      />
    </div>
  );
}
