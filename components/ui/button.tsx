// components/ui/button.tsx - VERSÃO CORRIGIDA
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-beige hover:bg-brand-700 shadow-lg",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-lg",
        outline: "border-2 border-brand-olive bg-white text-brand hover:bg-brand-light hover:border-brand-sage hover:shadow-md",
        secondary: "bg-brand-sage text-brand-black hover:bg-brand-sage/90 shadow-md",
        ghost: "text-brand hover:bg-brand-light hover:text-brand-700 rounded-lg",
        link: "text-brand underline-offset-4 hover:underline hover:text-brand-700",
        premium: "bg-gradient-to-r from-brand to-brand-sage text-brand-beige hover:from-brand-700 hover:to-brand-sage/90 shadow-xl",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-13 rounded-xl px-8 py-4 text-base font-bold",
        icon: "h-11 w-11 rounded-lg",
        xl: "h-16 rounded-2xl px-12 py-5 text-lg font-bold",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }