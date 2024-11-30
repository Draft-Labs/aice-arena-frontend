import { useState } from 'react';
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

  const handleDeposit = async () => {
    try {
      setTransactionError(null);
      await depositToTreasury(depositAmount);
      setHasActiveAccount(true);
    } catch (err) {
      console.error('Error depositing:', err);
      setTransactionError(err.message);
    }
  };

  const handleWithdraw = async () => {
    try {
      setTransactionError(null);
      await withdrawFromTreasury(withdrawAmount);
    } catch (err) {
      console.error('Error withdrawing:', err);
      setTransactionError(err.message);
    }
  };

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
          <div className="deposit-section">
            <h2>Deposit Funds</h2>
            <div className="deposit-controls">
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

          <div className="withdraw-section">
            <h2>Withdraw Funds</h2>
            <div className="withdraw-controls">
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