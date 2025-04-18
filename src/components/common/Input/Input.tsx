import React from 'react';
import classNames from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  className,
  ...props
}) => {
  return (
    <div className={classNames('flex flex-col', fullWidth && 'w-full')}>
      {label && (
        <label className="mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={classNames(
          'rounded-md border border-gray-300 px-3 py-2',
          'focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
          'placeholder:text-gray-400',
          error && 'border-error-500',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
      {error && (
        <span className="mt-1 text-sm text-error-500">{error}</span>
      )}
    </div>
  );
};
