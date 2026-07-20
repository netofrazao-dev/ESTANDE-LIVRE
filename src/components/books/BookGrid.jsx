import BookCard from './BookCard'
import { motion } from 'framer-motion'

export default function BookGrid({ books = [], loading = false, isNewFn = () => false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-pergaminho-darker/60" />
            <div className="p-4 space-y-2 border-t border-sepia/10">
              <div className="h-3 bg-pergaminho-darker/60 w-2/3" />
              <div className="h-4 bg-pergaminho-darker/60 w-full" />
              <div className="h-3 bg-pergaminho-darker/60 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {books.map((book, i) => (
        <motion.div
          key={book.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <BookCard book={book} isNew={isNewFn(book)} />
        </motion.div>
      ))}
    </div>
  )
}
