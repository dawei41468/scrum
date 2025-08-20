import React from 'react'

function Card({ className = '', children, header, footer }) {
  return (
    <div className={["rounded-lg border border-gray-200 bg-white shadow-sm", className].join(' ')}>
      {header && (
        <div className="px-4 py-3 border-b border-gray-200">
          {typeof header === 'string' ? <h3 className="text-sm font-semibold text-gray-900">{header}</h3> : header}
        </div>
      )}
      <div className="px-4 py-4">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-3 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  )}

export default Card
