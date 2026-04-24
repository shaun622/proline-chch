import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Home from './pages/Home'
import Schedule from './pages/Schedule'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import Settings from './pages/Settings'
import BusinessDetails from './pages/settings/BusinessDetails'
import PublicQuote from './pages/public/PublicQuote'
import PublicInvoice from './pages/public/PublicInvoice'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/q/:token" element={<PublicQuote />} />
      <Route path="/i/:token" element={<PublicInvoice />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/:id" element={<QuoteDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/business" element={<BusinessDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
