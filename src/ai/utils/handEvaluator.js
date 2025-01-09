import pkg from 'poker-evaluator';
import { cardToString } from './cardConverter';
import { HAND_TYPES } from './constants';

const PokerEvaluator = pkg;

class HandEvaluator {
  constructor() {
    this.evaluator = PokerEvaluator;
  }

  // Convert our 1-52 card format to poker-evaluator format
  convertToEvaluatorFormat(card) {
    const cardStr = cardToString(card);
    return cardStr ? `${cardStr[0].toLowerCase()}${cardStr[1]}` : null;
  }

  // Get hand type name from rank
  getHandTypeName(rank) {
    if (rank >= 36874) return 'Royal Flush';
    if (rank >= 36750) return 'Straight Flush';
    if (rank >= 36339) return 'Four of a Kind';
    if (rank >= 35226) return 'Full House';
    if (rank >= 34479) return 'Flush';
    if (rank >= 33462) return 'Straight';
    if (rank >= 31367) return 'Three of a Kind';
    if (rank >= 28820) return 'Two Pair';
    if (rank >= 26013) return 'One Pair';
    return 'High Card';
  }

  // Get hand type from rank
  getHandType(rank) {
    if (rank >= 36874) return HAND_TYPES.STRAIGHT_FLUSH; // Royal Flush is highest straight flush
    if (rank >= 36750) return HAND_TYPES.STRAIGHT_FLUSH;
    if (rank >= 36339) return HAND_TYPES.FOUR_OF_A_KIND;
    if (rank >= 35226) return HAND_TYPES.FULL_HOUSE;
    if (rank >= 34479) return HAND_TYPES.FLUSH;
    if (rank >= 33462) return HAND_TYPES.STRAIGHT;
    if (rank >= 31367) return HAND_TYPES.THREE_OF_A_KIND;
    if (rank >= 28820) return HAND_TYPES.TWO_PAIR;
    if (rank >= 26013) return HAND_TYPES.PAIR;
    return HAND_TYPES.HIGH_CARD;
  }

  // Evaluate hand strength (returns 0-7462, higher is better)
  evaluateHand(holeCards, communityCards = []) {
    try {
      const cards = [
        ...holeCards.map(card => this.convertToEvaluatorFormat(card)),
        ...communityCards.map(card => this.convertToEvaluatorFormat(card))
      ].filter(card => card !== null);

      if (cards.length < 5) {
        return {
          handRank: 0,
          handName: 'incomplete',
          handType: -1,
          cards: []
        };
      }

      const result = this.evaluator.evalHand(cards);
      const handRank = result.value;

      return {
        handRank,
        handName: this.getHandTypeName(handRank),
        handType: this.getHandType(handRank),
        cards: cards
      };
    } catch (error) {
      console.error('Hand evaluation error:', error);
      return {
        handRank: 0,
        handName: 'error',
        handType: -1,
        cards: [],
        error: error.message
      };
    }
  }

  // Calculate win probability against random hands
  calculateEquity(holeCards, communityCards = [], simulations = 1000) {
    let wins = 0;
    const myHandRank = this.evaluateHand(holeCards, communityCards).handRank;

    // Monte Carlo simulation
    for (let i = 0; i < simulations; i++) {
      const opponentHoleCards = this.generateRandomHoleCards(holeCards, communityCards);
      const opponentRank = this.evaluateHand(opponentHoleCards, communityCards).handRank;
      if (myHandRank > opponentRank) wins++;
    }

    return wins / simulations;
  }

  // Generate random hole cards that don't conflict with known cards
  generateRandomHoleCards(usedHoleCards, usedCommunityCards) {
    const usedCards = new Set([...usedHoleCards, ...usedCommunityCards]);
    const availableCards = [];
    
    // Generate list of available cards (1-52)
    for (let i = 1; i <= 52; i++) {
      if (!usedCards.has(i)) {
        availableCards.push(i);
      }
    }

    // Randomly select 2 cards
    const cards = [];
    for (let i = 0; i < 2; i++) {
      const index = Math.floor(Math.random() * availableCards.length);
      cards.push(availableCards.splice(index, 1)[0]);
    }

    return cards;
  }
}

export default HandEvaluator; 