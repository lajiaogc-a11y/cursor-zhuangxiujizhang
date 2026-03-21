import { CartesianGrid as RechartsCartesianGrid } from 'recharts';
import { forwardRef } from 'react';

/**
 * Wrapper for Recharts CartesianGrid to suppress forwardRef warning.
 * Recharts' CartesianGrid is a function component that doesn't use forwardRef,
 * but React tries to pass a ref to it, causing a console warning.
 */
export const CartesianGrid = forwardRef<any, React.ComponentProps<typeof RechartsCartesianGrid>>(
  function CartesianGridWrapper(props, _ref) {
    return <RechartsCartesianGrid {...props} />;
  }
);
