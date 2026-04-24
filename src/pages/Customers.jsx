import { Plus, Users } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function Customers() {
  return (
    <PageWrapper width="wide">
      <PageHero
        title="Customers"
        subtitle="Residential & commercial clients"
        action={<Button leftIcon={Plus}>New Customer</Button>}
      />
      <div className="card">
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start tracking jobs."
        />
      </div>
    </PageWrapper>
  )
}
