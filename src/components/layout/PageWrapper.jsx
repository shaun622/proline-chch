import { cn } from '../../lib/utils'

export default function PageWrapper({ children, width = 'default', className }) {
  const maxW = width === 'wide' ? 'md:max-w-7xl' : 'md:max-w-5xl'
  return (
    <main className={cn('max-w-lg mx-auto px-4 pt-4 pb-28 md:pb-12 animate-fade-in', maxW, className)}>
      {children}
    </main>
  )
}
