import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import '../styles/Leaderboard.css';

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get all user profiles
        const querySnapshot = await getDocs(collection(db, 'userProfiles'));
        
        // Map and filter profiles with valid data
        const leaderboardData = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            totalWinnings: doc.data().totalWinnings || 0 // Default to 0 if not set
          }))
          .filter(player => player.address) // Only include profiles with an address
          .sort((a, b) => b.totalWinnings - a.totalWinnings) // Sort by winnings
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }));
        
        setPlayers(leaderboardData);
        console.log('Leaderboard data:', leaderboardData); // Debug log
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="leaderboard-container">
      <h1>Leaderboard</h1>
      
      {isLoading ? (
        <div className="loading">Loading leaderboard...</div>
      ) : players.length > 0 ? (
        <div className="leaderboard-table">
          <div className="leaderboard-header">
            <div className="rank">Rank</div>
            <div className="player">Player</div>
            <div className="winnings">Total Winnings</div>
          </div>
          
          {players.map((player) => (
            <div key={player.id} className="leaderboard-row">
              <div className="rank">#{player.rank}</div>
              <div className="player">
                {player.profileImage && (
                  <img 
                    src={player.profileImage} 
                    alt="Profile" 
                    className="player-avatar"
                  />
                )}
                <div className="player-info">
                  <span className="player-name">
                    {player.displayName || formatAddress(player.address)}
                  </span>
                  {player.twitterHandle && (
                    <span className="player-twitter">@{player.twitterHandle}</span>
                  )}
                </div>
              </div>
              <div className="winnings">
                {player.totalWinnings.toFixed(4)} ETH
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data">No players found</div>
      )}
    </div>
  );
}

export default Leaderboard; 