import React, { forwardRef } from 'react'

const Input = forwardRef(function Input({ className = '', label, hint, error, ...props }, ref) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
      <input
        ref={ref}
        className={[
          'w-full h-10 rounded-md border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          error ? 'border-red-400 focus-visible:ring-red-500' : 'border-gray-300',
          className,
        ].join(' ')}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
})

export default Input
