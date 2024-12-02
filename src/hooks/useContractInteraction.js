import { useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

export function useContractInteraction() {
  const { blackjackContract, treasuryContract, account, ownerAccount } = useWeb3();

  const placeBet = useCallback(async (amount) => {
    try {
      if (!blackjackContract || !treasuryContract || !account) {
        console.error('Contracts or account not initialized');
        return false;
      }

      const betAmountWei = ethers.parseEther(amount.toString());
      
      console.log('Placing bet...', {
        amount,
        betAmountWei: betAmountWei.toString(),
        account,
        blackjackAddress: await blackjackContract.getAddress(),
        treasuryAddress: await treasuryContract.getAddress()
      });

      // Check if treasury has enough funds to cover potential win
      const houseFunds = await treasuryContract.getHouseFunds();
      console.log('House funds:', ethers.formatEther(houseFunds));
      
      const betAmountBigInt = ethers.toBigInt(betAmountWei);
      if (houseFunds < betAmountBigInt * ethers.toBigInt(2)) {
        throw new Error('Insufficient house funds to cover potential win');
      }

      // Check if player already has an active bet
      const isActive = await blackjackContract.isPlayerActive(account);
      if (isActive) {
        throw new Error('Player already has an active bet');
      }

      // Place bet with ETH from wallet
      console.log('Placing bet transaction...');
      const tx = await blackjackContract.placeBet({
        value: betAmountWei,
        gasLimit: 500000
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return true;
    } catch (error) {
      console.error('Detailed error:', error);
      throw error;
    }
  }, [blackjackContract, treasuryContract, account]);

  const hit = useCallback(async () => {
    try {
      if (!blackjackContract || !account) return false;
      const tx = await blackjackContract.hit({
        gasLimit: 500000
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error hitting:', error);
      return false;
    }
  }, [blackjackContract, account]);

  const stand = useCallback(async () => {
    try {
      if (!blackjackContract || !account) return false;
      const tx = await blackjackContract.stand({
        gasLimit: 500000
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error standing:', error);
      return false;
    }
  }, [blackjackContract, account]);

  // Add functions to handle treasury interactions
  const depositToTreasury = useCallback(async (amount) => {
    try {
      if (!treasuryContract || !account) {
        throw new Error('Treasury contract or account not initialized');
      }

      const amountWei = ethers.parseEther(amount.toString());
      
      // Call openAccount if first deposit, otherwise call deposit
      const hasAccount = await treasuryContract.activeAccounts(account);
      const tx = hasAccount 
        ? await treasuryContract.deposit({ value: amountWei })
        : await treasuryContract.openAccount({ value: amountWei });

      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error depositing to treasury:', error);
      throw error;
    }
  }, [treasuryContract, account]);

  const withdrawFromTreasury = useCallback(async (amount) => {
    try {
      if (!treasuryContract || !account) {
        throw new Error('Treasury contract or account not initialized');
      }

      const amountWei = ethers.parseEther(amount.toString());
      
      // Check if account is active
      const hasAccount = await treasuryContract.activeAccounts(account);
      if (!hasAccount) {
        // If no active account, open one with minimum deposit
        const minDeposit = ethers.parseEther("0.01");
        const tx = await treasuryContract.openAccount({ value: minDeposit });
        await tx.wait();
        console.log('Account opened');
      }

      // First check the balance
      const balance = await treasuryContract.getPlayerBalance(account);
      if (balance < amountWei) {
        throw new Error('Insufficient balance for withdrawal');
      }

      console.log('Withdrawing...', {
        amount,
        amountWei: amountWei.toString(),
        balance: balance.toString(),
        account
      });

      const tx = await treasuryContract.withdraw(amountWei, {
        gasLimit: 500000
      });
      
      console.log('Withdrawal transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Withdrawal confirmed:', receipt);
      
      return true;
    } catch (error) {
      console.error('Error withdrawing from treasury:', error);
      throw error;
    }
  }, [treasuryContract, account]);

  const getAccountBalance = useCallback(async () => {
    try {
      if (!treasuryContract || !account) {
        console.log('Treasury state:', {
          hasContract: !!treasuryContract,
          hasAccount: !!account
        });
        return '0'; // Return '0' instead of throwing when not initialized
      }

      const balance = await treasuryContract.getPlayerBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting account balance:', error);
      return '0'; // Return '0' on error
    }
  }, [treasuryContract, account]);

  const resolveGameAsOwner = useCallback(async (playerAddress, multiplier) => {
    try {
      if (!blackjackContract || !account) {
        throw new Error('Contract or account not initialized');
      }

      console.log('Resolving game...', {
        player: playerAddress,
        multiplier,
        account
      });

      // Now any player can resolve their own game
      const tx = await blackjackContract.resolveGames(
        [playerAddress],
        [multiplier],
        { 
          gasLimit: 500000,
        }
      );

      console.log('Resolution transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Resolution confirmed:', receipt);

      return true;
    } catch (error) {
      console.error('Error resolving game:', error);
      throw error;
    }
  }, [blackjackContract, account]);

  const checkTreasuryAccount = useCallback(async () => {
    try {
      if (!treasuryContract || !account) return false;
      return await treasuryContract.activeAccounts(account);
    } catch (error) {
      console.error('Error checking treasury account:', error);
      return false;
    }
  }, [treasuryContract, account]);

  return {
    placeBet,
    hit,
    stand,
    depositToTreasury,
    withdrawFromTreasury,
    getAccountBalance,
    resolveGameAsOwner,
    checkTreasuryAccount
  };
}
