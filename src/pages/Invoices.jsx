import { Plus, Receipt } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function Invoices() {
  return (
    <PageWrapper width="wide">
      <PageHero
        title="Invoices"
        subtitle="Outstanding and paid"
        action={<Button leftIcon={Plus}>New Invoice</Button>}
      />
      <div className="card">
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Send invoices and track payments once jobs are flowing."
        />
      </div>
    </PageWrapper>
  )
}
