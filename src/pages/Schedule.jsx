import { Calendar } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import EmptyState from '../components/ui/EmptyState'

export default function Schedule() {
  return (
    <PageWrapper width="wide">
      <PageHero title="Schedule" subtitle="Upcoming work bookings" />
      <div className="card">
        <EmptyState
          icon={Calendar}
          title="Calendar view coming soon"
          description="Week and day views with drag-to-reschedule, once job data is in."
        />
      </div>
    </PageWrapper>
  )
}
