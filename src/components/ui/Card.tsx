import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
    hover?: boolean
  }
>(({ className, variant = 'default', hover = false, ...props }, ref) => {
  const variants = {
    default: "bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm",
    elevated: "bg-[hsl(var(--card))] shadow-xl shadow-[hsl(var(--foreground)/0.05)]",
    outlined: "bg-[hsl(var(--card))] border-2 border-[hsl(var(--border))]",
    ghost: "bg-[hsl(var(--muted)/0.5)]",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl text-[hsl(var(--card-foreground))]",
        variants[variant],
        hover && "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    subtitle?: string
  }
>(({ className, subtitle, children, ...props }, ref) => (
  <div>
    <h3
      ref={ref}
      className={cn(
        "text-xl font-bold leading-none tracking-tight text-[hsl(var(--foreground))]",
        className
      )}
      {...props}
    >
      {children}
    </h3>
    {subtitle && (
      <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</p>
    )}
  </div>
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    divider?: boolean
  }
>(({ className, divider = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0",
      divider && "mt-6 pt-6 border-t border-[hsl(var(--border))]",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Stat Card Component
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, icon, trend, className, ...props }, ref) => (
    <Card ref={ref} className={cn("p-6", className)} hover {...props}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[hsl(var(--foreground))]">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                trend.isPositive
                  ? "text-[hsl(var(--success))]"
                  : "text-[hsl(var(--destructive))]"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              <span className="text-[hsl(var(--muted-foreground))] font-normal ml-1">
                vs last month
              </span>
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-[hsl(var(--primary)/0.1)] rounded-xl text-[hsl(var(--primary))]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
)
StatCard.displayName = "StatCard"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, StatCard }
