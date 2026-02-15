import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50', {
  variants: {
    variant: {
      default: 'bg-primary text-background shadow-soft',
      secondary: 'bg-muted text-foreground',
      ghost: 'hover:bg-muted'
    }
  },
  defaultVariants: { variant: 'default' }
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
