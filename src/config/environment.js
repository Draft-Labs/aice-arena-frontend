const getEnvironmentConfig = () => {
  const env = process.env.REACT_APP_ENV || 'local';
  
  if (env === 'fuji') {
    return {
      network: 'fuji',
      rpcUrl: process.env.REACT_APP_RPC_URL,
      chainId: parseInt(process.env.REACT_APP_CHAIN_ID),
      contracts: {
        treasury: process.env.REACT_APP_FUJI_TREASURY_ADDRESS,
        blackjack: process.env.REACT_APP_FUJI_BLACKJACK_ADDRESS,
        roulette: process.env.REACT_APP_FUJI_ROULETTE_ADDRESS,
        poker: process.env.REACT_APP_FUJI_POKER_ADDRESS
      }
    };
  }

  // Default to local hardhat network
  return {
    network: 'localhost',
    rpcUrl: process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545',
    chainId: 31337,
    contracts: {
      treasury: process.env.REACT_APP_HARDHAT_TREASURY_ADDRESS,
      blackjack: process.env.REACT_APP_HARDHAT_BLACKJACK_ADDRESS,
      roulette: process.env.REACT_APP_HARDHAT_ROULETTE_ADDRESS,
      poker: process.env.REACT_APP_HARDHAT_POKER_ADDRESS
    }
  };
};

export default getEnvironmentConfig; 