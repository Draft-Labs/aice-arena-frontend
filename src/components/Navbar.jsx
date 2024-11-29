import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          Casino
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/treasury" className="nav-link">
          Treasury
        </Link>
        <Link to="/blackjack" className="nav-link">
          Blackjack
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;