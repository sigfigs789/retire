import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Basic from './pages/Basic';
import Playground from './pages/Playground';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <div className="top-bar">
          <div className="brand">Retire</div>
          <NavLink to="/" end className="nav-link">My Plan</NavLink>
          <NavLink to="/playground" className="nav-link">Playground</NavLink>
        </div>

        <Routes>
          <Route path="/" element={<Basic />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
