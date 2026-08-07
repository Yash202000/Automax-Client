/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordRequirement {
  label: string;
  valid: boolean;
}

export interface PasswordRequirementLabels {
  minLength: string;
  uppercase: string;
  lowercase: string;
  number: string;
  specialChar: string;
}

export const getPasswordRequirements = (
  password: string,
  labels: PasswordRequirementLabels,
): PasswordRequirement[] => [
  {
    label: labels.minLength,
    valid: password.length >= 8,
  },
  {
    label: labels.uppercase,
    valid: /[A-Z]/.test(password),
  },
  {
    label: labels.lowercase,
    valid: /[a-z]/.test(password),
  },
  {
    label: labels.number,
    valid: /\d/.test(password),
  },
  {
    label: labels.specialChar,
    valid: /[^\w\s]/.test(password),
  },
];

export const isValidPassword = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^\w\s]/.test(password);

interface PasswordChecklistProps {
  requirements: PasswordRequirement[];
  className?: string;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
  requirements,
  className = "",
}) => (
  <div
    className={cn("mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs", className)}
  >
    {requirements.map(({ valid, label }) => {
      const Icon = valid ? Check : X;

      return (
        <div
          key={label}
          className={cn(
            "flex items-center gap-1.5",
            valid
              ? "text-[hsl(var(--success))]"
              : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{label}</span>
        </div>
      );
    })}
  </div>
);
