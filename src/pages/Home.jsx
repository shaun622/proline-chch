import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'

export default function Home() {
  return (
    <PageWrapper width="wide">
      <PageHero title="Home" subtitle="ProLine Aluminium dashboard" />
      <div className="card">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Dashboard widgets coming up next — today's jobs, outstanding invoices, recent activity.
        </p>
      </div>
    </PageWrapper>
  )
}
