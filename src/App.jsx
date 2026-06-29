import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Basic from './pages/Basic';
import Advanced from './pages/Advanced';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <div className="top-bar">
          <div className="brand">Retire</div>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Basic
            </NavLink>
            <NavLink to="/advanced" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Advanced
            </NavLink>
          </nav>
        </div>

        <Routes>
          <Route path="/" element={<Basic />} />
          <Route path="/advanced" element={<Advanced />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
