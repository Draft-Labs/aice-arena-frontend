import pokerEvaluator from 'poker-evaluator';
import CardConverter from './cardConverter.js';

class HandEvaluator {
  constructor() {
    // No need to store evaluator as a property
  }

  convertToEvaluatorFormat(cards) {
    // Handle different input formats
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }

    // Convert to strings in the format expected by poker-evaluator
    return CardConverter.convertToStrings(cards);
  }

  evaluateHand(holeCards, communityCards = []) {
    try {
      // Convert both hole cards and community cards to strings
      const holeCardStrs = this.convertToEvaluatorFormat(holeCards);
      const communityCardStrs = communityCards.length > 0 ? 
        this.convertToEvaluatorFormat(communityCards) : [];
      
      // Combine all cards
      const allCards = [...holeCardStrs, ...communityCardStrs];
      
      // Validate we have the right number of cards
      if (allCards.length < 2 || allCards.length > 7) {
        throw new Error(`Invalid number of cards: ${allCards.length}`);
      }

      // Ensure all cards are unique
      const uniqueCards = new Set(allCards);
      if (uniqueCards.size !== allCards.length) {
        throw new Error('Duplicate cards detected');
      }

      // Use pokerEvaluator
      const result = pokerEvaluator.evalHand(allCards);
      
      return {
        value: result.value,
        handType: result.handType,
        handRank: result.handRank,
        description: result.handName
      };
    } catch (error) {
      console.error('Hand evaluation error:', error);
      throw error;
    }
  }

  calculateEquity(holeCards, communityCards = []) {
    try {
      // Convert cards to evaluator format
      const holeCardStrs = this.convertToEvaluatorFormat(holeCards);
      const communityCardStrs = communityCards.length > 0 ? 
        this.convertToEvaluatorFormat(communityCards) : [];
      
      // Simple Monte Carlo simulation for equity calculation
      const iterations = 1000;
      let wins = 0;
      
      // Track used cards
      const usedCards = new Set([...holeCardStrs, ...communityCardStrs]);
      
      // Track split pots
      const splits = [0, 0, 0, 0]; // 2-way to 5-way splits
      
      // Run simulations
      for (let i = 0; i < iterations; i++) {
        const result = this.simulateHand(holeCardStrs, communityCardStrs, usedCards);
        if (result.win) wins++;
        if (result.split > 1) {
          splits[result.split - 2]++;
        }
      }

      return {
        winRate: wins / iterations,
        splitRates: splits.map((count, index) => ({
          rate: count / iterations,
          ways: index + 2
        }))
      };
    } catch (error) {
      console.error('Equity calculation error:', error);
      throw error;
    }
  }

  simulateHand(holeCards, communityCards, usedCards) {
    try {
      // Generate random opponent hands and remaining community cards
      const remainingCommunityCards = this.generateRandomCards(
        5 - communityCards.length,
        usedCards
      );
      
      const opponentHoleCards = this.generateRandomCards(2, 
        new Set([...usedCards, ...remainingCommunityCards])
      );

      // Evaluate both hands
      const playerHand = this.evaluateHand(
        holeCards,
        [...communityCards, ...remainingCommunityCards]
      );
      
      const opponentHand = this.evaluateHand(
        opponentHoleCards,
        [...communityCards, ...remainingCommunityCards]
      );

      return {
        win: playerHand.value > opponentHand.value,
        split: playerHand.value === opponentHand.value ? 2 : 1
      };
    } catch (error) {
      console.error('Hand simulation error:', error);
      throw error;
    }
  }

  generateRandomCards(count, usedCards) {
    const cards = [];
    const ranks = '23456789TJQKA';
    const suits = 'hdcs';
    
    // Create array of all possible cards
    const allCards = [];
    for (let r = 0; r < ranks.length; r++) {
      for (let s = 0; s < suits.length; s++) {
        allCards.push(ranks[r] + suits[s]);
      }
    }
    
    // Filter out used cards
    const availableCards = allCards.filter(card => !usedCards.has(card));
    
    // Randomly select cards
    while (cards.length < count && availableCards.length > 0) {
      const index = Math.floor(Math.random() * availableCards.length);
      const card = availableCards.splice(index, 1)[0];
      cards.push(card);
    }
    
    return cards;
  }
}

export default HandEvaluator; 