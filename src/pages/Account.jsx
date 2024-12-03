import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import '../styles/Account.css';

function Account() {
  const { account, isLoading, error: web3Error, connectWallet } = useWeb3();
  const { depositToTreasury, withdrawFromTreasury, getAccountBalance, checkTreasuryAccount } = useContractInteraction();
  
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.01');
  const [transactionError, setTransactionError] = useState(null);
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [currentBalance, setCurrentBalance] = useState('0');

  // Add effect to check account status on load
  useEffect(() => {
    const checkAccount = async () => {
      if (account) {
        const isActive = await checkTreasuryAccount();
        setHasActiveAccount(isActive);
      }
    };
    checkAccount();
  }, [account, checkTreasuryAccount]);

  // Add effect to fetch and update balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (account && hasActiveAccount) {
        try {
          const balance = await getAccountBalance();
          setCurrentBalance(balance);
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      }
    };
    fetchBalance();
  }, [account, hasActiveAccount, getAccountBalance, transactionError]);

  const handleDeposit = async () => {
    try {
      setTransactionError(null);
      await depositToTreasury(depositAmount);
      setHasActiveAccount(true);
      // Update balance immediately after deposit
      const newBalance = await getAccountBalance();
      setCurrentBalance(newBalance);
      // Force a balance update in the navbar
      window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: newBalance }));
    } catch (err) {
      console.error('Error depositing:', err);
      setTransactionError(err.message);
    }
  };

  const handleWithdraw = async () => {
    try {
      setTransactionError(null);
      await withdrawFromTreasury(withdrawAmount);
      // Update balance immediately after withdrawal
      const newBalance = await getAccountBalance();
      setCurrentBalance(newBalance);
      // Force a balance update in the navbar
      window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: newBalance }));
    } catch (err) {
      console.error('Error withdrawing:', err);
      setTransactionError(err.message);
    }
  };

  const handleCloseAccount = async () => {
    try {
      setTransactionError(null);
      await withdrawFromTreasury(currentBalance);
      setHasActiveAccount(false);
      setCurrentBalance('0');
      // Force a balance update in the navbar
      window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: '0' }));
    } catch (err) {
      console.error('Error closing account:', err);
      setTransactionError(err.message);
    }
  };

  // Add polling to update balance periodically
  useEffect(() => {
    let intervalId;
    
    if (account && hasActiveAccount) {
      intervalId = setInterval(async () => {
        try {
          const balance = await getAccountBalance();
          setCurrentBalance(balance);
        } catch (err) {
          console.error('Error updating balance:', err);
        }
      }, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [account, hasActiveAccount, getAccountBalance]);

  if (isLoading) return <div>Loading Web3...</div>;
  if (web3Error) return (
    <div>
      <div>Error: {web3Error}</div>
      <button onClick={connectWallet}>Retry Connection</button>
    </div>
  );

  return (
    <div className="account-container">
      <h1>My Account</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !hasActiveAccount ? (
        <div className="open-account">
          <p>Open a Casino Account</p>
          <div className="deposit-controls">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Initial deposit amount"
            />
            <button onClick={handleDeposit}>
              Open Account
            </button>
          </div>
        </div>
      ) : (
        <div className="account-controls">
          <div className="balance-display">
            <h2>Current Balance</h2>
            <p>{currentBalance} ETH</p>
          </div>

          <div className="transaction-section">
            <div className="transaction-row">
              <h2>Deposit to Account</h2>
              <div className="transaction-controls">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Deposit amount"
                />
                <button onClick={handleDeposit}>
                  Deposit
                </button>
              </div>
            </div>

            <div className="transaction-row">
              <h2>Withdraw from Account</h2>
              <div className="transaction-controls">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Withdraw amount"
                />
                <button onClick={handleWithdraw}>
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          <div className="close-account-section">
            <button onClick={handleCloseAccount} className="close-account-button">
              Withdraw and Close Account
            </button>
          </div>
        </div>
      )}

      {transactionError && (
        <div className="error-message">
          Error: {transactionError}
        </div>
      )}
    </div>
  );
}

export default Account; 