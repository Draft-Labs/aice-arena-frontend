import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Account from './pages/Account';
import Blackjack from './pages/Blackjack';
import Roulette from './pages/Roulette';
import PokerLobby from './pages/poker/index';
import CreatePokerTable from './pages/poker/create';
import PokerTable from './pages/poker/table';
import Leaderboard from './pages/Leaderboard';
import './App.css';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/account" element={<Account />} />
            <Route path="/blackjack" element={<Blackjack />} />
            <Route path="/roulette" element={<Roulette />} />
            <Route path="/poker" element={<PokerLobby />} />
            <Route path="/poker/create" element={<CreatePokerTable />} />
            <Route path="/poker/table/:tableId" element={<PokerTable />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;