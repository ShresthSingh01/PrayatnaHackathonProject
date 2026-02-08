import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import EngineerDashboard from './components/EngineerDashboard'
import WorkerPhotoCapture from './components/WorkerPhotoCapture'
import './App.css'

const LandingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 gap-8">
    <Link to="/" className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all">
      <div className="text-2xl font-bold text-gray-800">Engineer</div>
      <p className="text-gray-500 mt-2">Manage Projects</p>
    </Link>
    <Link to="/worker" className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:border-green-500 hover:shadow-xl transition-all">
      <div className="text-2xl font-bold text-gray-800">Worker</div>
      <p className="text-gray-500 mt-2">Site Capture</p>
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EngineerDashboard />} />
        <Route path="/worker" element={<WorkerPhotoCapture />} />
        <Route path="/worker/:projectId" element={<WorkerPhotoCapture />} />
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
