import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatEther } from 'ethers';
import '../styles/Leaderboard.css';

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { account } = useWeb3();
  const { getPlayerNetWinnings } = useContractInteraction();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get all profiles from Firebase to get display names and images
        const querySnapshot = await getDocs(collection(db, 'userProfiles'));
        const profiles = querySnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = doc.data();
          return acc;
        }, {});

        // Get net winnings for each player from the contract
        const playersWithWinnings = await Promise.all(
          Object.keys(profiles).map(async (address) => {
            try {
              const netWinnings = await getPlayerNetWinnings(address);
              const winningsInEth = parseFloat(formatEther(netWinnings));
              
              return {
                id: address,
                address: address,
                ...profiles[address],
                totalWinnings: winningsInEth
              };
            } catch (error) {
              console.error(`Error getting winnings for ${address}:`, error);
              return null;
            }
          })
        );

        // Sort and filter players - include non-zero winnings (positive or negative)
        const leaderboardData = playersWithWinnings
          .filter(player => player && player.totalWinnings !== 0) // Remove null entries but keep negative values
          .sort((a, b) => b.totalWinnings - a.totalWinnings) // Sort highest to lowest
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }));

        setPlayers(leaderboardData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [getPlayerNetWinnings]);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Add color styling based on winnings
  const getWinningsColor = (amount) => {
    if (amount > 0) return 'positive-winnings';
    if (amount < 0) return 'negative-winnings';
    return '';
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
              <div className={`winnings ${getWinningsColor(player.totalWinnings)}`}>
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