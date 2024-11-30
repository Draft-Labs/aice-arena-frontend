import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Account from './pages/Account';
import Blackjack from './pages/Blackjack';
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
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;