import * as React from 'react'
import { forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  success?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, leftIcon, rightIcon, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const inputId = props.id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2"
          >
            {label}
            {props.required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-[hsl(var(--muted-foreground))] w-5 h-5">{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              "w-full px-4 py-3 bg-[hsl(var(--background))] border-2 rounded-xl text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] transition-all duration-200 focus:outline-none disabled:bg-[hsl(var(--muted))] disabled:text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed",
              leftIcon && "pl-12",
              (rightIcon || isPassword || error || success) && "pr-12",
              error
                ? "border-[hsl(var(--destructive)/0.5)] focus:border-[hsl(var(--destructive))] focus:ring-4 focus:ring-[hsl(var(--destructive)/0.1)]"
                : success
                  ? "border-[hsl(var(--success)/0.5)] focus:border-[hsl(var(--success))] focus:ring-4 focus:ring-[hsl(var(--success)/0.1)]"
                  : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground)/0.3)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/0.1)]",
              className
            )}
            {...props}
          />
          {(rightIcon || isPassword || error || success) && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              {isPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              ) : error ? (
                <AlertCircle className="w-5 h-5 text-[hsl(var(--destructive))]" />
              ) : success ? (
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
              ) : rightIcon ? (
                <span className="text-[hsl(var(--muted-foreground))] w-5 h-5">{rightIcon}</span>
              ) : null}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p className={cn(
            "mt-2 text-sm",
            error ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--muted-foreground))]"
          )}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    const textareaId = props.id || props.name || `textarea-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2"
          >
            {label}
            {props.required && <span className="text-[hsl(var(--destructive))] ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full px-4 py-3 bg-[hsl(var(--background))] border-2 rounded-xl text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] transition-all duration-200 focus:outline-none resize-none disabled:bg-[hsl(var(--muted))] disabled:text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed",
            error
              ? "border-[hsl(var(--destructive)/0.5)] focus:border-[hsl(var(--destructive))] focus:ring-4 focus:ring-[hsl(var(--destructive)/0.1)]"
              : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground)/0.3)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/0.1)]",
            className
          )}
          {...props}
        />
        {(error || hint) && (
          <p className={cn(
            "mt-2 text-sm",
            error ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--muted-foreground))]"
          )}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, ...props }, ref) => {
    const selectId = props.id || props.name || `select-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2"
          >
            {label}
            {props.required && <span className="text-[hsl(var(--destructive))] ms-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full px-4 py-3 bg-[hsl(var(--background))] border-2 rounded-xl text-[hsl(var(--foreground))] text-sm transition-all duration-200 focus:outline-none appearance-none cursor-pointer pe-12",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.75rem_center] bg-no-repeat rtl:bg-[left_0.75rem_center]",
            error
              ? "border-[hsl(var(--destructive)/0.5)] focus:border-[hsl(var(--destructive))] focus:ring-4 focus:ring-[hsl(var(--destructive)/0.1)]"
              : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground)/0.3)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/0.1)]",
            "disabled:bg-[hsl(var(--muted))] disabled:text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option className='text-black' key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || hint) && (
          <p className={cn(
            "mt-2 text-sm",
            error ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--muted-foreground))]"
          )}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// Checkbox Component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: React.ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, ...props }, ref) => {
    const checkboxId = props.id || props.name || `checkbox-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={cn(
              "w-5 h-5 bg-[hsl(var(--background))] border-2 border-[hsl(var(--border))] rounded-md transition-all duration-200 cursor-pointer",
              "focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:ring-offset-0 focus:border-[hsl(var(--primary))]",
              "checked:bg-[hsl(var(--primary))] checked:border-[hsl(var(--primary))] checked:text-[hsl(var(--primary-foreground))]",
              "hover:border-[hsl(var(--muted-foreground)/0.5)]",
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-[hsl(var(--foreground))] cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
