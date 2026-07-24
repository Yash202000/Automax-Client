import { cn } from "@/lib/utils";
import { Label } from "@/ui/label";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {children}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
