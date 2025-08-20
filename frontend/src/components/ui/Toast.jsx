import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext({ add: () => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    const t = { id, title: '', description: '', variant: 'default', duration: 2500, ...toast }
    setToasts((prev) => [...prev, t])
    setTimeout(() => remove(id), t.duration)
  }, [remove])

  const value = useMemo(() => ({ add }), [add])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[68px] z-50 flex justify-center px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={[
              'pointer-events-auto rounded-md border px-3 py-2 shadow-md backdrop-blur-sm',
              t.variant === 'error' ? 'border-red-200 bg-red-50 text-red-800' :
              t.variant === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
              'border-gray-200 bg-white text-gray-900'
            ].join(' ')}>
              {t.title && <div className="text-sm font-semibold">{t.title}</div>}
              {t.description && <div className="text-sm">{t.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
