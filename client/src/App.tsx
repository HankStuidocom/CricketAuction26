import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import Lobby from './pages/Lobby';
import LiveAuction from './pages/LiveAuction';
import SquadBuilder from './pages/SquadBuilder';
import Simulation from './pages/Simulation';
import Results from './pages/Results';
import PlayerDatabase from './pages/PlayerDatabase';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateGame />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/lobby/:roomCode" element={<Lobby />} />
          <Route path="/auction/:roomCode" element={<LiveAuction />} />
          <Route path="/squad/:roomCode" element={<SquadBuilder />} />
          <Route path="/simulation/:roomCode" element={<Simulation />} />
          <Route path="/results/:roomCode" element={<Results />} />
          <Route path="/players" element={<PlayerDatabase />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A2035',
              color: '#fff',
              border: '1px solid rgba(245, 166, 35, 0.3)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#1DB954', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#FF4444', secondary: '#fff' },
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}
