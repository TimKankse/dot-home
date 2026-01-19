import React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { listVariants } from './list-variants';

export interface ListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listVariants> {
  as?: 'div' | 'ul' | 'ol';
}

export const List = React.forwardRef<HTMLDivElement, ListProps>(
  ({ className, variant, as: Component = 'div', children, ...props }, ref) => {
    // Cast to React.ElementType to avoid type conflicts with 'as' prop differing element types
    const Comp = Component as React.ElementType;

    return (
      <Comp
        ref={ref}
        className={`${listVariants({ variant })} ${className || ''}`}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

List.displayName = 'List';
