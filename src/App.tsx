import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LiveAuction from './pages/LiveAuction';
import CreateAuction from './pages/CreateAuction';
import JoinAuction from './pages/JoinAuction';
import Lobby from './pages/Lobby';
import Results from './pages/Results';
import AuthPage from './pages/AuthPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage isRegister={false} />} />
        <Route path="/register" element={<AuthPage isRegister={true} />} />
        <Route path="/create" element={<CreateAuction />} />
        <Route path="/join" element={<JoinAuction />} />
        <Route path="/room/:code" element={<Lobby />} />
        <Route path="/room/:code/auction" element={<LiveAuction />} />
        <Route path="/room/:code/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
