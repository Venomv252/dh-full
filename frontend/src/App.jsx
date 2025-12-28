import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import './index.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* Additional routes will be added as we implement more components */}
          <Route path="/login/:role" element={<div>Login Page - Coming Soon</div>} />
          <Route path="/auth" element={<div>Auth Page - Coming Soon</div>} />
          <Route path="/report-incident" element={<div>Report Incident Page - Coming Soon</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
