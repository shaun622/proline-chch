import { Plus, Wrench } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function Jobs() {
  return (
    <PageWrapper width="wide">
      <PageHero
        title="Jobs"
        subtitle="Repairs, installations, and site visits"
        action={<Button leftIcon={Plus}>New Job</Button>}
      />
      <div className="card">
        <EmptyState
          icon={Wrench}
          title="No jobs yet"
          description="Create your first job once the database is wired up."
        />
      </div>
    </PageWrapper>
  )
}
