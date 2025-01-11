import { HAND_TYPES } from './constants';
import { ACTIONS, POSITIONS, POSITION_MAPPING } from './constants';
import HandEvaluator from './handEvaluator';

class DataAugmenter {
  constructor(options = {}) {
    this.evaluator = new HandEvaluator();
    // Noise configuration
    this.noiseConfig = {
      stackNoise: options.stackNoise || 0.05,  // 5% variation in stack sizes
      potNoise: options.potNoise || 0.03,      // 3% variation in pot sizes
      betNoise: options.betNoise || 0.04       // 4% variation in bet amounts
    };
  }

  /**
   * Add Gaussian noise to a numeric value
   */
  addNoise(value, noiseFactor) {
    if (!Number.isFinite(value) || !Number.isFinite(noiseFactor)) {
      return value;  // Return original if invalid
    }

    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const noise = Math.sqrt(-2.0 * Math.log(u1)) * 
                  Math.cos(2.0 * Math.PI * u2) * 
                  value * noiseFactor;
    
    // Clamp noise to ±10% of original value
    const noiseValue = value + noise;
    const minValue = value * 0.9;
    const maxValue = value * 1.1;
    return Math.max(minValue, Math.min(maxValue, noiseValue));
  }

  /**
   * Generate variations with noise added to continuous values
   */
  generateNoiseVariations(example) {
    if (!example || typeof example !== 'object') {
      throw new Error('Invalid example object');
    }
    if (!Number.isFinite(example.stackSize) || !Number.isFinite(example.potSize)) {
      throw new Error('Missing or invalid stack/pot sizes');
    }

    const variations = [];
    
    // Add original
    variations.push({...example});
    
    // Add 2 noisy variations
    for (let i = 0; i < 2; i++) {
      const noisy = {
        ...example,
        stackSize: this.addNoise(example.stackSize, this.noiseConfig.stackNoise),
        potSize: this.addNoise(example.potSize, this.noiseConfig.potNoise),
        actions: example.actions?.map(action => ({
          ...action,
          amount: this.addNoise(action.amount || 0, this.noiseConfig.betNoise)
        })) || []
      };
      variations.push(noisy);
    }

    return variations;
  }

  /**
   * Augment example with noise variations
   */
  augmentWithNoise(example) {
    return this.generateNoiseVariations(example);
  }

  /**
   * Generate permutations of hole cards while preserving hand strength
   */
  permuteHoleCards(holeCards, communityCards = []) {
    if (!Array.isArray(holeCards) || holeCards.length !== 2) {
      throw new Error('Hole cards must be exactly 2 cards');
    }

    // Get original hand strength
    const originalStrength = this.evaluator.evaluateHand(holeCards, communityCards);

    // Generate all possible 2-card permutations
    const permutations = [];
    const [card1, card2] = holeCards;

    // Test both orderings
    const candidates = [[card1, card2], [card2, card1]];
    
    for (const candidate of candidates) {
      // Verify hand strength is preserved
      const newStrength = this.evaluator.evaluateHand(candidate, communityCards);
      if (newStrength.handType === originalStrength.handType && 
          newStrength.handRank === originalStrength.handRank) {
        permutations.push([...candidate]); // Create a new array to avoid reference issues
      }
    }

    return permutations;
  }

  /**
   * Augment a single training example
   */
  augmentExample(example) {
    if (!example.holeCards || !Array.isArray(example.holeCards)) {
      throw new Error('Example must have hole cards array');
    }

    const augmented = [];
    const permutations = this.permuteHoleCards(
      example.holeCards,
      example.communityCards || []
    );

    // Add each unique permutation (including original)
    const seen = new Set();
    for (const cards of permutations) {
      const key = cards.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        augmented.push({
          ...example,
          holeCards: [...cards]
        });
      }
    }

    return augmented;
  }

  /**
   * Generate variations of action sequences
   */
  generateActionVariations(actions) {
    const variations = [];
    
    // Add original sequence
    variations.push([...actions]);
    
    // Add timing variations
    variations.push(actions.map(action => ({
      ...action,
      timing: Math.random() * 0.5 + 0.5
    })));
    
    // Add bet sizing variations for raises
    variations.push(actions.map(action => {
      if (action.type === ACTIONS.RAISE) {
        const variationFactor = Math.random() * 0.4 + 0.8;
        return {
          ...action,
          amount: Math.round(action.amount * variationFactor)
        };
      }
      return action;
    }));
    
    return variations;
  }

  /**
   * Augment example with action variations
   */
  augmentActions(example) {
    const variations = this.generateActionVariations(example.actions);
    return variations.map(actions => ({
      ...example,
      actions
    }));
  }

  /**
   * Generate position rotations that preserve relative positions
   */
  generatePositionRotations(position, playerCount = 6) {
    if (position < 0 || position >= 6 || !Number.isInteger(position)) {
      return [];  // Return empty array for invalid positions
    }
    if (playerCount !== 6) {
      return [];  // Currently only supporting 6-max
    }

    const rotations = [];
    const originalType = POSITION_MAPPING[playerCount][position];
    
    // Find all positions with equivalent strategic value
    for (let i = 0; i < playerCount; i++) {
      if (POSITION_MAPPING[playerCount][i] === originalType) {
        rotations.push(i);
      }
    }
    
    return rotations;
  }

  /**
   * Augment example with position rotations
   */
  augmentPositions(example) {
    const rotations = this.generatePositionRotations(example.position);
    
    return rotations.map(position => ({
      ...example,
      position,
      // Adjust relative positions of other players
      actions: example.actions.map(action => ({
        ...action,
        relativePosition: (action.relativePosition + position) % 6
      }))
    }));
  }
}

export default DataAugmenter; 