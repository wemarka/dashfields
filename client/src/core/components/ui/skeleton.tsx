import { cn } from "@/core/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md", className)}
      style={{ backgroundColor: 'hsl(var(--muted) / 0.6)', backgroundImage: 'linear-gradient(90deg, hsl(var(--muted) / 0.6) 0%, hsl(var(--muted) / 0.9) 50%, hsl(var(--muted) / 0.6) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }}
      {...props}
    />
  );
}

export { Skeleton };
