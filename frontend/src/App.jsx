import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import PoliceLogin from './pages/PoliceLogin';
import HospitalLogin from './pages/HospitalLogin';
import AdminLogin from './pages/AdminLogin';
import PoliceDashboard from './pages/PoliceDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import IncidentReportForm from './components/IncidentReportForm';
import IncidentConfirmation from './pages/IncidentConfirmation';
import IncidentUpvote from './components/IncidentUpvote';
import MapsDemo from './pages/MapsDemo';
import Unauthorized from './pages/Unauthorized';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login/police" element={<PoliceLogin />} />
            <Route path="/login/hospital" element={<HospitalLogin />} />
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected Routes */}
            <Route 
              path="/police/dashboard" 
              element={
                <ProtectedRoute requiredRole="police">
                  <PoliceDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/dashboard" 
              element={
                <ProtectedRoute requiredRole="hospital">
                  <HospitalDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user/dashboard" 
              element={
                <ProtectedRoute requiredRole="user">
                  <div>User Dashboard - Coming Soon</div>
                </ProtectedRoute>
              } 
            />
            
            {/* Additional routes */}
            <Route path="/login/:role" element={<div>Login Page - Coming Soon</div>} />
            <Route path="/auth" element={<div>Auth Page - Coming Soon</div>} />
            <Route path="/report-incident" element={<IncidentReportForm />} />
            <Route path="/incident/:id" element={<IncidentUpvote />} />
            <Route path="/incident-confirmation/:id" element={<IncidentConfirmation />} />
            <Route path="/maps-demo" element={<MapsDemo />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
