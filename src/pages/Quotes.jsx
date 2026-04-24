import { Plus, FileText } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function Quotes() {
  return (
    <PageWrapper width="wide">
      <PageHero
        title="Quotes"
        subtitle="Estimates and proposals"
        action={<Button leftIcon={Plus}>New Quote</Button>}
      />
      <div className="card">
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Draft, send, and track acceptance once the database is wired up."
        />
      </div>
    </PageWrapper>
  )
}
