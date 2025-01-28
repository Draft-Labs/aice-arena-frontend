import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Account from './pages/Account';
import Blackjack from './pages/Blackjack';
import Roulette from './pages/Roulette';
import PokerLobby from './pages/poker/index';
import CreatePokerTable from './pages/poker/create';
import PokerTable from './pages/poker/table';
import Leaderboard from './pages/Leaderboard';

const AppRoutes = () => {
  return (
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
  );
};

export default AppRoutes; 