import pokerEvaluator from 'poker-evaluator';
import CardConverter from './cardConverter.js';

class HandEvaluator {
  constructor() {
    // No need to store evaluator as a property
  }

  convertToEvaluatorFormat(cards) {
    return cards.map(card => CardConverter.cardToString(card));
  }

  evaluateHand(holeCards, communityCards = []) {
    try {
      const allCards = [
        ...this.convertToEvaluatorFormat(holeCards),
        ...this.convertToEvaluatorFormat(communityCards)
      ];
      
      // Use pokerEvaluator directly
      const result = pokerEvaluator.evalHand(allCards);
      
      return {
        value: result.value,
        type: result.handType,
        description: result.handName
      };
    } catch (error) {
      console.error('Hand evaluation error:', error);
      throw error;
    }
  }

  calculateEquity(holeCards, communityCards = []) {
    // Simple Monte Carlo simulation for equity calculation
    const iterations = 1000;
    let wins = 0;
    
    // Convert known cards
    const knownCards = [
      ...this.convertToEvaluatorFormat(holeCards),
      ...this.convertToEvaluatorFormat(communityCards)
    ];
    
    // Track split pots
    const splits = [0, 0, 0, 0]; // 2-way to 5-way splits
    
    // Run simulations
    for (let i = 0; i < iterations; i++) {
      // Simulate random opponent hands and remaining community cards
      // For now, return dummy data
      wins += Math.random() > 0.5 ? 1 : 0;
    }

    return {
      winRate: wins / iterations,
      splitRates: splits.map((count, index) => ({
        rate: count / iterations,
        ways: index + 2
      }))
    };
  }
}

export default HandEvaluator; 