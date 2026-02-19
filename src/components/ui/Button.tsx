import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-r rtl:bg-linear-to-l from-primary to-accent text-primary-foreground  hover:bg-primary/90 shadow-lg shadow-primary/0.25 hover:shadow-xl hover:shadow-[hsl(var(--primary)/0.3)]",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.9)] shadow-lg shadow-[hsl(var(--destructive)/0.25)] hover:shadow-xl hover:shadow-[hsl(var(--destructive)/0.3)]",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success)/0.9)] shadow-lg shadow-[hsl(var(--success)/0.25)] hover:shadow-xl hover:shadow-[hsl(var(--success)/0.3)]",
        outline:
          "border-2 border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--muted-foreground)/0.3)] text-[hsl(var(--foreground))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)]",
        ghost:
          "hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]",
        link:
          "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        xs: "h-8 rounded-md px-3 text-xs",
        sm: "h-9 rounded-md px-4",
        lg: "h-11 rounded-lg px-6",
        xl: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    const iconSize = {
      xs: "w-3.5 h-3.5",
      sm: "w-4 h-4",
      default: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-5 h-5",
      icon: "w-5 h-5",
    }[size || "default"]

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && "w-full"
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={cn(iconSize, "animate-spin")} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className={iconSize}>{leftIcon}</span>}
            {children}
            {rightIcon && <span className={iconSize}>{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
