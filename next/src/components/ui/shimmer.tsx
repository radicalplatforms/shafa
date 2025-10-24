'use client';

import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import {
  type CSSProperties,
  type ElementType,
  type JSX,
  memo,
  useMemo,
} from 'react';

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const ShimmerComponent = ({
  children,
  as: Component = 'p',
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = motion.create(
    Component as keyof JSX.IntrinsicElements,
  );

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread],
  );

  return (
    <MotionComponent
      animate={{ backgroundPosition: '0% center' }}
      className={cn(
        'relative inline-block bg-[length:250%_100%] bg-clip-text text-transparent',
        className,
      )}
      initial={{ backgroundPosition: '100% center' }}
        style={
        {
          '--spread': `${dynamicSpread}px`,
          backgroundImage: `linear-gradient(90deg, transparent calc(50% - var(--spread)), hsl(var(--foreground)), transparent calc(50% + var(--spread))), linear-gradient(hsl(var(--muted-foreground)), hsl(var(--muted-foreground)))`,
        } as CSSProperties
      }
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: 'linear',
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
