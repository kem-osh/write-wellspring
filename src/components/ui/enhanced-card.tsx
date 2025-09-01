import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border border-border",
        elevated: "bg-card border border-border shadow-md hover:shadow-lg",
        interactive: "bg-card border border-border shadow-md hover:shadow-lg cursor-pointer hover:border-primary/20 transform hover:translate-y-[-1px] active:translate-y-0 active:shadow-md",
        surface: "bg-surface border border-border",
        ghost: "bg-transparent border-0",
        compact: "bg-card border border-border/50 shadow-sm hover:shadow-md rounded-lg",
        mobile: "bg-card border border-border/30 shadow-sm hover:shadow-md rounded-lg"
      },
      padding: {
        none: "",
        xs: "p-2",      // Extra small for mobile cards
        sm: "p-3", 
        default: "p-4",
        lg: "p-6",
        xl: "p-8"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default"
    }
  }
)

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      padding: {
        none: "",
        xs: "p-2",      // Extra small for mobile
        sm: "p-3",
        default: "p-4", 
        lg: "p-6"
      }
    },
    defaultVariants: {
      padding: "none"
    }
  }
)

const cardContentVariants = cva(
  "",
  {
    variants: {
      padding: {
        none: "",
        xs: "p-2 pt-0",  // Extra small for mobile
        sm: "p-3 pt-0",
        default: "p-4 pt-0",
        lg: "p-6 pt-0"
      }
    },
    defaultVariants: {
      padding: "none"
    }
  }
)

const cardFooterVariants = cva(
  "flex items-center",
  {
    variants: {
      padding: {
        none: "",
        xs: "p-2 pt-0",  // Extra small for mobile
        sm: "p-3 pt-0",
        default: "p-4 pt-0",
        lg: "p-6 pt-0"
      }
    },
    defaultVariants: {
      padding: "none"
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardHeaderVariants>
>(({ className, padding, ...props }, ref) => (
  <div ref={ref} className={cn(cardHeaderVariants({ padding }), className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-heading-md leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-body-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardContentVariants>
>(({ className, padding, ...props }, ref) => (
  <div ref={ref} className={cn(cardContentVariants({ padding }), className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardFooterVariants>
>(({ className, padding, ...props }, ref) => (
  <div ref={ref} className={cn(cardFooterVariants({ padding }), className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }