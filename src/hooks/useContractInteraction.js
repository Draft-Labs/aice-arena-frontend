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
      const tx = await treasuryContract.withdraw(amountWei);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error withdrawing from treasury:', error);
      throw error;
    }
  }, [treasuryContract, account]);

  const getAccountBalance = useCallback(async () => {
    try {
      if (!treasuryContract || !account) {
        throw new Error('Treasury contract or account not initialized');
      }

      const balance = await treasuryContract.getPlayerBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }, [treasuryContract, account]);

  const resolveGameAsOwner = useCallback(async (playerAddress, multiplier) => {
    try {
      if (!blackjackContract || !ownerAccount) {
        throw new Error('Contract or owner not initialized');
      }

      const ownerContract = blackjackContract.connect(ownerAccount);
      const tx = await ownerContract.resolveGames(
        [playerAddress],
        [multiplier],
        { gasLimit: 500000 }
      );
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error resolving game:', error);
      throw error;
    }
  }, [blackjackContract, ownerAccount]);

  return {
    placeBet,
    hit,
    stand,
    depositToTreasury,
    withdrawFromTreasury,
    getAccountBalance,
    resolveGameAsOwner
  };
}
