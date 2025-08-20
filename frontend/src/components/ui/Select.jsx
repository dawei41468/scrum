import React from 'react'

function Select({ label, hint, error, className = '', children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
      <select
        className={[
          'w-full h-10 rounded-md border bg-white px-3 text-sm text-gray-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          error ? 'border-red-400 focus-visible:ring-red-500' : 'border-gray-300',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export default Select
