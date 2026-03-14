import { cn } from "@/core/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md", className)}
      style={{ backgroundColor: '#1c1c1c', backgroundImage: 'linear-gradient(90deg, #1c1c1c 0%, #242424 50%, #1c1c1c 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }}
      {...props}
    />
  );
}

export { Skeleton };
