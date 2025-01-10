import { ACTIONS, POSITIONS } from './constants.js';
import { convertHand } from './cardConverter.js';

class StrategyVerifier {
  constructor() {
    this.rules = this.defineStrategyRules();
  }

  defineStrategyRules() {
    return {
      preflop: {
        premiumHands: {
          description: "Premium hands should never be folded preflop",
          hands: ['AA', 'KK', 'QQ', 'AKs', 'AKo'],
          verify: (action, position, hand) => {
            if (this.isPremiumHand(hand)) {
              return action !== ACTIONS.FOLD;
            }
            return true;
          },
          weight: 1.0
        },
        positionPlay: {
          description: "Later position should play more hands",
          verify: (action, position, hand) => {
            if (position === POSITIONS.BTN || position === POSITIONS.CO) {
              if (this.isSuitedConnector(hand)) {
                return action !== ACTIONS.FOLD;
              }
            }
            return true;
          },
          weight: 0.8
        },
        stackDepth: {
          description: "Short stacks should play tighter",
          verify: (action, position, hand, stackSize) => {
            if (stackSize < 20) {
              if (this.isPremiumHand(hand)) {
                return action === ACTIONS.RAISE;
              } else {
                return action === ACTIONS.FOLD;
              }
            }
            return true;
          },
          weight: 0.9
        }
      },
      postflop: {
        drawContinuation: {
          description: "Continue with strong draws",
          verify: (action, position, hand, stackSize, potOdds, board) => {
            if (this.hasStrongDraw(hand, board)) {
              return action !== ACTIONS.FOLD;
            }
            return true;
          },
          weight: 0.85
        }
      }
    };
  }

  // Convert array of cards to standard format
  normalizeCards(cards) {
    if (!cards) return [];
    if (typeof cards === 'string') return cards.split(' ');
    if (Array.isArray(cards)) {
      return cards.map(card => {
        if (typeof card === 'string') return card;
        if (typeof card === 'object') return `${card.rank}${card.suit}`;
        return '';
      }).filter(card => card);
    }
    return [];
  }

  // Convert hand to standard format (e.g., "AKs")
  normalizeHand(hand) {
    try {
      const cards = this.normalizeCards(hand);
      if (cards.length !== 2) return '';
      
      // Sort ranks in descending order
      const ranks = cards.map(card => card[0].toUpperCase())
                       .sort((a, b) => {
                         const rankOrder = '23456789TJQKA';
                         return rankOrder.indexOf(b) - rankOrder.indexOf(a);
                       });
      
      // Check if suited
      const suited = cards[0][1].toLowerCase() === cards[1][1].toLowerCase();
      
      // Special case for pairs
      if (ranks[0] === ranks[1]) {
        return ranks[0] + ranks[1];
      }
      
      return ranks.join('') + (suited ? 's' : 'o');
    } catch (error) {
      console.error('Error in normalizeHand:', error);
      return '';
    }
  }

  evaluateHandStrength(hand, board = []) {
    const handCards = this.normalizeCards(hand);
    const boardCards = this.normalizeCards(board);
    
    if (!handCards.length) return 0.3; // Default to high card
    
    // Count pairs, trips, quads
    const allCards = [...handCards, ...boardCards];
    const rankCounts = allCards.reduce((counts, card) => {
      const rank = card[0].toUpperCase();
      counts[rank] = (counts[rank] || 0) + 1;
      return counts;
    }, {});

    const maxCount = Math.max(...Object.values(rankCounts));
    
    if (maxCount === 4) return 1.0;     // Four of a kind
    if (maxCount === 3) return 0.8;     // Three of a kind
    if (maxCount === 2) return 0.5;     // Pair
    return 0.3;                         // High card
  }

  hasStrongDraw(hand, board) {
    const handCards = this.normalizeCards(hand);
    const boardCards = this.normalizeCards(board);
    
    if (!handCards.length) return false;
    
    const allCards = [...handCards, ...boardCards];
    return this.hasFlushDraw(allCards) || this.hasStraightDraw(allCards);
  }

  hasFlushDraw(cards) {
    const suitCounts = cards.reduce((counts, card) => {
      const suit = card[1].toLowerCase();
      counts[suit] = (counts[suit] || 0) + 1;
      return counts;
    }, {});

    return Object.values(suitCounts).some(count => count === 4);
  }

  hasStraightDraw(cards) {
    const ranks = cards.map(card => '23456789TJQKA'.indexOf(card[0].toUpperCase()));
    ranks.sort((a, b) => a - b);

    let consecutive = 1;
    let maxConsecutive = 1;
    
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] === ranks[i-1] + 1) {
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else if (ranks[i] !== ranks[i-1]) {
        consecutive = 1;
      }
    }

    return maxConsecutive === 4;
  }

  // Helper methods for hand evaluation
  isPremiumHand(hand) {
    try {
      const normalizedHand = this.normalizeHand(hand);
      console.log('Normalized hand:', normalizedHand); // Debug log
      const isPremium = ['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(normalizedHand);
      console.log('Is premium:', isPremium); // Debug log
      return isPremium;
    } catch (error) {
      console.error('Error in isPremiumHand:', error);
      return false;
    }
  }

  hasStrongHand(hand, board) {
    // Implement strong hand detection (sets, two pairs, etc.)
    const handStrength = this.evaluateHandStrength(hand, board);
    return handStrength > 0.8; // Threshold for strong hands
  }

  calculateEquity(hand, board) {
    // Simplified equity calculation
    // In practice, you'd want a more sophisticated equity calculator
    const handStrength = this.evaluateHandStrength(hand, board);
    const drawStrength = this.hasStrongDraw(hand, board) ? 0.2 : 0;
    return Math.max(handStrength, drawStrength);
  }

  // New helper method for suited connectors
  isSuitedConnector(hand) {
    const cards = this.normalizeCards(hand);
    if (cards.length !== 2) return false;
    
    const ranks = cards.map(card => '23456789TJQKA'.indexOf(card[0].toUpperCase()));
    const suited = cards[0][1].toLowerCase() === cards[1][1].toLowerCase();
    const connected = Math.abs(ranks[0] - ranks[1]) === 1;
    
    return suited && connected;
  }

  // Verification methods
  verifyDecision(gameState, action) {
    try {
      console.log('Verifying decision:', { gameState, action }); // Debug log
      
      const results = {
        passed: true,
        violations: [],
        score: 0,
        totalWeight: 0
      };

      const rules = this.rules[gameState.street] || {};

      for (const [ruleName, rule] of Object.entries(rules)) {
        try {
          const isValid = rule.verify(
            action,
            gameState.position,
            gameState.hand,
            gameState.stackSize,
            gameState.potOdds,
            gameState.board
          );

          console.log(`Rule ${ruleName} result:`, isValid); // Debug log

          results.totalWeight += rule.weight;

          if (isValid) {
            results.score += rule.weight;
          } else {
            results.passed = false;
            results.violations.push({
              rule: ruleName,
              description: rule.description,
              weight: rule.weight
            });
          }
        } catch (ruleError) {
          console.error(`Error in rule ${ruleName}:`, ruleError);
        }
      }

      results.complianceScore = results.totalWeight > 0 ? 
        results.score / results.totalWeight : 1;
      
      console.log('Verification results:', results); // Debug log
      return results;

    } catch (error) {
      console.error('Error in verifyDecision:', error);
      return {
        passed: false,
        violations: [{
          rule: 'error',
          description: 'Error processing decision',
          weight: 1.0
        }],
        score: 0,
        totalWeight: 1,
        complianceScore: 0
      };
    }
  }

  // Batch verification for multiple decisions
  verifyStrategicConsistency(decisions) {
    const results = {
      overall: {
        totalDecisions: decisions.length,
        passedDecisions: 0,
        averageCompliance: 0,
        violations: {}
      },
      byStreet: {},
      byPosition: {}
    };

    decisions.forEach(decision => {
      const verification = this.verifyDecision(decision.gameState, decision.action);
      
      // Update overall stats
      if (verification.passed) {
        results.overall.passedDecisions++;
      }
      
      // Track violations
      verification.violations.forEach(violation => {
        if (!results.overall.violations[violation.rule]) {
          results.overall.violations[violation.rule] = 0;
        }
        results.overall.violations[violation.rule]++;
      });

      // Update street-specific stats
      const street = decision.gameState.street;
      if (!results.byStreet[street]) {
        results.byStreet[street] = {
          total: 0,
          passed: 0,
          compliance: 0
        };
      }
      results.byStreet[street].total++;
      if (verification.passed) {
        results.byStreet[street].passed++;
      }
      results.byStreet[street].compliance += verification.complianceScore;

      // Update position-specific stats
      const position = decision.gameState.position;
      if (!results.byPosition[position]) {
        results.byPosition[position] = {
          total: 0,
          passed: 0,
          compliance: 0
        };
      }
      results.byPosition[position].total++;
      if (verification.passed) {
        results.byPosition[position].passed++;
      }
      results.byPosition[position].compliance += verification.complianceScore;
    });

    // Calculate averages
    results.overall.averageCompliance = 
      results.overall.passedDecisions / results.overall.totalDecisions;

    Object.values(results.byStreet).forEach(stats => {
      stats.compliance = stats.compliance / stats.total;
    });

    Object.values(results.byPosition).forEach(stats => {
      stats.compliance = stats.compliance / stats.total;
    });

    return results;
  }
}

export default StrategyVerifier; 