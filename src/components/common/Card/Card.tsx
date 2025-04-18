import React from 'react';
import classNames from 'classnames';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glowEffect?: 'none' | 'blue' | 'pink';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  glowEffect = 'none',
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const glowStyles = {
    none: '',
    blue: 'glow-blue',
    pink: 'glow-pink',
  };

  return (
    <div
      className={classNames(
        'rounded-lg border border-gray-700',
        'bg-dark-800/80 backdrop-blur-sm',
        paddingStyles[padding],
        glowStyles[glowEffect],
        className
      )}
    >
      {children}
    </div>
  );
};
