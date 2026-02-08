import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import EngineerDashboard from './components/EngineerDashboard'
import WorkerPhotoCapture from './components/WorkerPhotoCapture'
import './App.css'

const LandingPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream">
    <div className="w-full max-w-md space-y-12">
      {/* Header */}
      <div className="text-center space-y-6">
        <span className="inline-block px-3 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-medium tracking-wide uppercase">
          Pre-Release
        </span>
        <h1 className="text-5xl font-serif text-primary-black tracking-tight">
          Constructrack
        </h1>
        <p className="text-gray-500 font-light text-lg">
          Seamless site monitoring designed for modern engineering teams.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <Link
          to="/worker"
          className="block w-full py-4 bg-primary-black text-white rounded-full text-center font-medium hover:bg-gray-800 transition-transform active:scale-95"
        >
          Worker Access
        </Link>

        <Link
          to="/engineer"
          className="block w-full py-4 bg-white border-2 border-primary-black text-primary-black rounded-full text-center font-bold hover:bg-gray-50 transition-colors"
        >
          Engineer Dashboard
        </Link>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400 mt-12">
          &copy; 2026 Constructrack Inc.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/engineer" element={<EngineerDashboard />} />
        <Route path="/worker" element={<WorkerPhotoCapture />} />
        <Route path="/worker/:projectId" element={<WorkerPhotoCapture />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
