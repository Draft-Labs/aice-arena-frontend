import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import '../App.css';

// ABI for HouseTreasury (we'll only include the functions we need)
const treasuryABI = [
  "function openAccount() external payable",
  "function closeAccount() external",
  "function getPlayerBalance(address player) external view returns (uint256)",
  "function activeAccounts(address) external view returns (bool)",
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function getHouseFunds() external view returns (uint256)",
  "function fundHouseTreasury() external payable",
  "function withdrawHouseFunds(uint256 amount) external",
  "function owner() external view returns (address)"
];

function Treasury() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [treasury, setTreasury] = useState(null);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [houseFunds, setHouseFunds] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [houseFundAmount, setHouseFundAmount] = useState('1.0');
  const [houseWithdrawAmount, setHouseWithdrawAmount] = useState('1.0');
  const [ownerAddress, setOwnerAddress] = useState(null);

  // Replace with your deployed treasury address
  const TREASURY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const treasury = new ethers.Contract(TREASURY_ADDRESS, treasuryABI, signer);
        
        setProvider(provider);
        setSigner(signer);
        setTreasury(treasury);
        
        const userAddress = await signer.getAddress();
        setAccount(userAddress);
        
        // Get and set owner address
        const owner = await treasury.owner();
        setOwnerAddress(owner);
        setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());
        
        // Check if user has an active account
        const active = await treasury.activeAccounts(await signer.getAddress());
        setHasAccount(active);
        
        if (active) {
          const balance = await treasury.getPlayerBalance(await signer.getAddress());
          setBalance(ethers.formatEther(balance));
        }
      }
    };

    init();
  }, []);

  const handleOpenAccount = async () => {
    try {
      const tx = await treasury.openAccount({
        value: ethers.parseEther(depositAmount)
      });
      await tx.wait();
      setHasAccount(true);
      const balance = await treasury.getPlayerBalance(account);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("Error opening account:", error);
    }
  };

  const handleCloseAccount = async () => {
    try {
      const tx = await treasury.closeAccount();
      await tx.wait();
      setHasAccount(false);
      setBalance(null);
    } catch (error) {
      console.error("Error closing account:", error);
    }
  };

  const refreshBalance = async () => {
    if (treasury && account) {
      const balance = await treasury.getPlayerBalance(account);
      setBalance(ethers.formatEther(balance));
    }
  };

  const handleDeposit = async () => {
    try {
      const tx = await treasury.deposit({
        value: ethers.parseEther(depositAmount)
      });
      await tx.wait();
      const balance = await treasury.getPlayerBalance(account);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("Error depositing:", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      const tx = await treasury.withdraw(ethers.parseEther(withdrawAmount));
      await tx.wait();
      const balance = await treasury.getPlayerBalance(account);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("Error withdrawing:", error);
    }
  };

  const refreshHouseFunds = async () => {
    if (treasury) {
      try {
        const funds = await treasury.getHouseFunds();
        setHouseFunds(ethers.formatEther(funds));
      } catch (error) {
        console.error("Error refreshing house funds:", error);
      }
    }
  };

  const handleFundTreasury = async () => {
    try {
      if (!treasury) {
        console.error("Treasury contract not initialized");
        return;
      }

      console.log(`Attempting to fund treasury with ${houseFundAmount} ETH`);
      const tx = await treasury.fundHouseTreasury({
        value: ethers.parseEther(houseFundAmount)
      });
      
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      
      await refreshHouseFunds();
      console.log("House funds refreshed");
    } catch (error) {
      console.error("Error funding treasury:", error);
    }
  };

  const handleWithdrawHouseFunds = async () => {
    try {
      const tx = await treasury.withdrawHouseFunds(ethers.parseEther(houseWithdrawAmount));
      await tx.wait();
      await refreshHouseFunds();
    } catch (error) {
      console.error("Error withdrawing house funds:", error);
    }
  };

  if (!provider) {
    return <div className="App">Please install MetaMask!</div>;
  }

  return (
    <div className="App">
      <h1>Casino Treasury Interface</h1>
      
      <div className="account-info">
        <p>Connected Account: {account}</p>
        <p>Contract Owner: {ownerAddress}</p>
        {hasAccount && <p>Balance: {balance} ETH</p>}
        <div className="action-group">
          <p>House Treasury: {houseFunds} ETH</p>
          <button onClick={refreshHouseFunds}>Refresh Treasury</button>
        </div>
      </div>

      {isOwner && (
        <div className="house-management">
          <h2>House Treasury Management</h2>
          <div className="action-group">
            <input
              type="number"
              value={houseFundAmount}
              onChange={(e) => setHouseFundAmount(e.target.value)}
              step="0.1"
              min="0"
              placeholder="Amount to fund"
            />
            <button 
              onClick={handleFundTreasury}
              className="primary-button"
            >
              Fund Treasury
            </button>
          </div>
          
          <div className="action-group">
            <input
              type="number"
              value={houseWithdrawAmount}
              onChange={(e) => setHouseWithdrawAmount(e.target.value)}
              step="0.1"
              min="0"
              placeholder="Amount to withdraw"
            />
            <button 
              onClick={handleWithdrawHouseFunds}
              className="primary-button"
            >
              Withdraw House Funds
            </button>
          </div>
        </div>
      )}

      <div className="actions">
        {!hasAccount ? (
          <div>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              step="0.1"
              min="0"
            />
            <button onClick={handleOpenAccount}>Open Account</button>
          </div>
        ) : (
          <div>
            <div className="action-group">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                step="0.1"
                min="0"
              />
              <button onClick={handleDeposit}>Deposit</button>
            </div>
            
            <div className="action-group">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                step="0.1"
                min="0"
              />
              <button onClick={handleWithdraw}>Withdraw</button>
            </div>
            
            <div className="action-group">
              <button onClick={handleCloseAccount}>Close Account</button>
              <button onClick={refreshBalance}>Refresh Balance</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Treasury;