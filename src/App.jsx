import { BrowserRouter as Router } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import { ToastContainer } from 'react-toastify';
import Background from './components/Background';
import Navbar from './components/Navbar';
import AppRoutes from './routes';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { OpenAIProvider } from './context/OpenAIContext';

function App() {
  return (
    <Router>
      <Web3Provider>
        <OpenAIProvider>
          <div className="App">
            <Background />
            <Navbar />
            <AppRoutes />
            <ToastContainer position="bottom-right" theme="dark" />
          </div>
        </OpenAIProvider>
      </Web3Provider>
    </Router>
  );
}

export default App;