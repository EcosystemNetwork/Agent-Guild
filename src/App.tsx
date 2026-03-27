import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import MissionsPage from './pages/MissionsPage'
import TrustLedgerPage from './pages/TrustLedgerPage'
import OperatorPage from './pages/OperatorPage'
import CommsPage from './pages/CommsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="trust" element={<TrustLedgerPage />} />
          <Route path="operator" element={<OperatorPage />} />
          <Route path="comms" element={<CommsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
