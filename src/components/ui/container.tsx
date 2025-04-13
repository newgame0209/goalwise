import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl", className)}
        {...props}
      />
    );
  }
);

Container.displayName = "Container";

export { Container }; 