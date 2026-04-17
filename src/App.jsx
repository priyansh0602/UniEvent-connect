// src/App.jsx
import { Routes, Route } from 'react-router-dom'

// Import all the pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import OrganizerDashboard from './pages/OrganizerDashboard'
import OrganizerInvite from './pages/OrganizerInvite'
import DemoSelect from './pages/DemoSelect'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Demo Selection - Publicly accessible */}
      <Route path="/demo-select" element={<DemoSelect />} />

      {/* Organizer Invite - Publicly accessible (token-based) */}
      <Route path="/organizer-invite" element={<OrganizerInvite />} />

      {/* Main Dashboard Routes - Protected */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/faculty/dashboard" element={<AdminDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['organizer']} />}>
        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
      </Route>
    </Routes>
  )
}

export default App