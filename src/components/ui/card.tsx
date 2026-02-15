import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-soft', className)} {...props} />;
}
