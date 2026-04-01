// src/App.jsx
import { Routes, Route } from 'react-router-dom'

// Import all the pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import DemoSelect from './pages/DemoSelect' // 👈 New Import
import ProtectedRoute from './components/ProtectedRoute' // 👈 Route guard

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Demo Selection - Publicly accessible */}
      <Route path="/demo-select" element={<DemoSelect />} />

      {/* Main Dashboard Routes - Protected */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/faculty/dashboard" element={<AdminDashboard />} />
      </Route>
    </Routes>
  )
}

export default App