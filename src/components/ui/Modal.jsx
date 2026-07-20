import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-cafe/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${sizes[size]} bg-pergaminho border border-sepia/20 shadow-2xl`}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-sepia/15 px-6 py-4">
                <h3 className="font-display text-xl text-cafe">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-sepia hover:text-cafe transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
            {footer && (
              <div className="border-t border-sepia/15 px-6 py-4 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
