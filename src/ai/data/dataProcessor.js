import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, ACTIONS } from '../utils/constants';

class DataProcessor {
  constructor(options = {}) {
    this.maxSequenceLength = options.maxSequenceLength || 50;
    this.inputFeatures = {
      // Player features
      position: 6,        // One-hot position
      stackSize: 1,       // Normalized stack size
      potOdds: 1,        // Pot odds for current decision
      
      // Hand features
      holeCards: 52 * 2,  // One-hot encoding for each card
      board: 52 * 5,      // One-hot encoding for board cards
      
      // Action history
      actionHistory: 4 * this.maxSequenceLength,  // One-hot action type
      betSizes: this.maxSequenceLength,          // Normalized bet sizes
      
      // Game state
      potSize: 1,         // Normalized pot size
      streetType: 4,      // One-hot street type
      playersInHand: 9,   // Binary flags for active players
      
      // Opponent modeling
      opponentStats: 5,   // Basic opponent statistics
    };
  }

  /**
   * Convert hand history to training examples
   * @param {Object} hand - Processed hand history
   * @returns {Array} Training examples
   */
  convertToTrainingExamples(hand) {
    const examples = [];
    
    // Generate example for each decision point
    for (const stage of hand.stages) {
      for (const action of stage.actions) {
        const features = this.extractFeatures(hand, stage, action);
        const label = this.createLabel(action);
        
        if (features && label) {
          examples.push({ features, label });
        }
      }
    }
    
    return examples;
  }

  /**
   * Extract input features for a decision point
   * @param {Object} hand - Full hand data
   * @param {Object} stage - Current street
   * @param {Object} action - Current action
   * @returns {Float32Array} Feature vector
   */
  extractFeatures(hand, stage, action) {
    const features = new Float32Array(INPUT_SIZE);
    let offset = 0;

    // Encode position
    offset = this.encodePosition(features, action.player, hand, offset);
    
    // Encode stack sizes
    offset = this.encodeStackSize(features, action.player, hand, offset);
    
    // Encode pot odds
    offset = this.encodePotOdds(features, stage, action, offset);
    
    // Encode cards
    offset = this.encodeCards(features, hand, stage, offset);
    
    // Encode action history
    offset = this.encodeActionHistory(features, hand, stage, action, offset);
    
    // Encode game state
    offset = this.encodeGameState(features, hand, stage, offset);
    
    // Encode opponent stats
    offset = this.encodeOpponentStats(features, hand, action.player, offset);

    return features;
  }

  /**
   * Create label vector for an action
   * @param {Object} action - Player action
   * @returns {Float32Array} One-hot encoded action
   */
  createLabel(action) {
    const label = new Float32Array(Object.keys(ACTIONS).length);
    const actionIndex = Object.values(ACTIONS).indexOf(action.type);
    if (actionIndex !== -1) {
      label[actionIndex] = 1;
    }
    return label;
  }

  // Feature encoding helpers
  encodePosition(features, player, hand, offset) {
    // One-hot encode player position
    const position = hand.positions[player] || 0;
    features[offset + position] = 1;
    return offset + 6;  // 6 possible positions
  }

  encodeStackSize(features, player, hand, offset) {
    // Normalize stack size
    const stack = hand.stacks[player] || 0;
    features[offset] = stack / 200;  // Normalize by big blinds
    return offset + 1;
  }

  encodePotOdds(features, stage, action, offset) {
    const toCall = stage.toCall || 0;
    const potSize = stage.potSize || 1;
    features[offset] = toCall / (toCall + potSize);
    return offset + 1;
  }

  encodeCards(features, hand, stage, offset) {
    // Encode hole cards
    const holeCards = hand.holeCards[stage.player] || [];
    for (const card of holeCards) {
      const cardIndex = this.cardToIndex(card);
      if (cardIndex !== -1) {
        features[offset + cardIndex] = 1;
      }
    }
    
    // Encode board cards
    const boardCards = stage.cards || [];
    for (const card of boardCards) {
      const cardIndex = this.cardToIndex(card);
      if (cardIndex !== -1) {
        features[offset + 104 + cardIndex] = 1;  // After hole cards
      }
    }
    
    return offset + 364;  // 52 * 7 total cards
  }

  encodeActionHistory(features, hand, stage, action, offset) {
    const history = this.getPreviousActions(hand, stage, action);
    for (let i = 0; i < Math.min(history.length, this.maxSequenceLength); i++) {
      const actionType = history[i].type;
      const actionIndex = Object.values(ACTIONS).indexOf(actionType);
      if (actionIndex !== -1) {
        features[offset + i * 4 + actionIndex] = 1;
      }
      // Encode normalized bet size
      features[offset + this.maxSequenceLength * 4 + i] = 
        history[i].amount ? history[i].amount / 200 : 0;
    }
    return offset + this.maxSequenceLength * 5;  // Actions + bet sizes
  }

  encodeGameState(features, hand, stage, offset) {
    // Encode pot size
    features[offset] = (stage.potSize || 0) / 200;
    
    // Encode street type
    const streetIndex = ['preflop', 'flop', 'turn', 'river'].indexOf(stage.type);
    if (streetIndex !== -1) {
      features[offset + 1 + streetIndex] = 1;
    }
    
    // Encode active players
    const activePlayers = hand.activePlayers || [];
    for (let i = 0; i < 9; i++) {
      features[offset + 5 + i] = activePlayers.includes(i) ? 1 : 0;
    }
    
    return offset + 14;
  }

  encodeOpponentStats(features, hand, player, offset) {
    const stats = hand.playerStats?.[player] || {};
    features[offset] = stats.vpip || 0;
    features[offset + 1] = stats.pfr || 0;
    features[offset + 2] = stats.aggression || 0;
    features[offset + 3] = stats.threeBet || 0;
    features[offset + 4] = stats.postFlopAggression || 0;
    return offset + 5;
  }

  // Helper methods
  cardToIndex(card) {
    const ranks = '23456789TJQKA';
    const suits = 'hsdc';  // hearts, spades, diamonds, clubs
    const rank = card.charAt(0);
    const suit = card.charAt(1);
    const rankIndex = ranks.indexOf(rank);
    const suitIndex = suits.indexOf(suit);
    
    return rankIndex !== -1 && suitIndex !== -1 ? 
      rankIndex + (suitIndex * 13) : -1;
  }

  getPreviousActions(hand, stage, currentAction) {
    const allActions = [];
    for (const s of hand.stages) {
      for (const a of s.actions) {
        if (a === currentAction) break;
        allActions.push(a);
      }
      if (s === stage) break;
    }
    return allActions.slice(-this.maxSequenceLength);
  }
}

export default DataProcessor; 