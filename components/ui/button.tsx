// components/ui/button.tsx - VERSÃO CORRIGIDA
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-beige hover:bg-brand-700 shadow-sm",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        outline: "border border-brand-olive bg-white text-brand hover:bg-brand-light hover:border-brand-sage",
        secondary: "bg-brand-sage text-brand-black hover:bg-brand-sage/90 shadow-sm",
        ghost: "text-brand hover:bg-brand-light hover:text-brand-700",
        link: "text-brand underline-offset-4 hover:underline hover:text-brand-700",
        premium: "bg-brand to-brand-sage text-brand-beige hover:bg-brand-700 shadow-sm border border-brand-sage",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 py-2 text-base font-bold",
        icon: "h-10 w-10",
        xl: "h-12 rounded-md px-10 py-3 text-lg font-bold",
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