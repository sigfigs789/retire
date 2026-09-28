import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Basic from './pages/Basic';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <div className="top-bar">
          <div className="brand">Retire</div>
        </div>

        <Routes>
          <Route path="/" element={<Basic />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
