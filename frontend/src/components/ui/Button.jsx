import React from 'react'

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost: 'bg-transparent text-gray-800 hover:bg-gray-100 focus-visible:ring-gray-400',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  size = 'md',
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none'
  const cn = [base, variants[variant] || variants.primary, sizes[size] || sizes.md, className].join(' ')
  return (
    <button type={type} className={cn} {...props}>
      {children}
    </button>
  )
}

export default Button
