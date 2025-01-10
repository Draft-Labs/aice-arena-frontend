// Neural Network Input/Output dimensions
export const INPUT_SIZE = 1024;  // Total size of input feature vector

export const OUTPUT_SIZE = 4;   // Action space:
                               // - FOLD
                               // - CHECK
                               // - CALL
                               // - RAISE

// Action encoding
export const ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  BET: 'bet',
  RAISE: 'raise'
};

// Table positions (6-max)
export const POSITIONS = {
  BTN: 0,     // Button (Dealer)
  SB: 1,      // Small Blind
  BB: 2,      // Big Blind
  EARLY: 3,   // UTG (Under the Gun)
  MIDDLE: 4,  // MP (Middle Position)
  LATE: 5     // CO (Cut-off)
};

// Position type mapping for different table sizes
export const POSITION_MAPPING = {
  6: {  // 6-max table
    0: 'BTN',   // Button is unique
    1: 'SB',    // Small blind is unique
    2: 'BB',    // Big blind is unique
    3: 'EARLY', // UTG
    4: 'EARLY', // UTG+1 (also early)
    5: 'LATE'   // Cutoff
  }
};

// Poker hand rankings
export const HAND_TYPES = {
  HIGH_CARD: 1,         // No pair
  PAIR: 2,             // Two cards of same rank
  TWO_PAIR: 3,         // Two different pairs
  THREE_OF_A_KIND: 4,  // Three cards of same rank
  STRAIGHT: 5,         // Five consecutive ranks
  FLUSH: 6,            // Five cards of same suit
  FULL_HOUSE: 7,       // Three of a kind + pair
  FOUR_OF_A_KIND: 8,   // Four cards of same rank
  STRAIGHT_FLUSH: 9    // Straight + flush (includes Royal Flush)
};

export const MODEL_CONFIG = {
  // Input size breakdown:
  // - Hole cards: 52 * 2 = 104 (two cards, each using 52-bit one-hot encoding)
  // - Community cards: 52 * 5 = 260 (five cards max)
  // - Position: 6 (one-hot encoding for 6 possible positions)
  // - Pot size: 1 (normalized value)
  // - Previous action: 2 (encoding of last action)
  INPUT_SIZE: 373,
  
  // Output size: 4 possible actions
  OUTPUT_SIZE: 4,
  
  // Action mapping
  ACTION_MAP: {
    'fold': 0,
    'check': 1,
    'call': 2,
    'raise': 3,
    'sb': 1,    // Small blind counts as check
    'bb': 2     // Big blind counts as call
  },

  // Maximum pot size for normalization
  MAX_POT_SIZE: 1000,

  // Position mapping
  POSITION_MAP: {
    'BTN': 0,
    'SB': 1,
    'BB': 2,
    'UTG': 3,
    'MP': 4,
    'CO': 5
  },

  // Training parameters
  LEARNING_RATE: 0.0002,
  BATCH_SIZE: 32,
  EPOCHS: 100,
  
  // Architecture
  HIDDEN_LAYERS: [512, 256, 128],
  DROPOUT_RATE: 0.3,
  
  // Early stopping
  PATIENCE: 5,
  MIN_DELTA: 0.001
};

// Card constants
export const CARD_CONSTANTS = {
  NUM_RANKS: 13,
  NUM_SUITS: 4,
  DECK_SIZE: 52
};

// Training constants
export const TRAINING_CONSTANTS = {
  VALIDATION_SPLIT: 0.2,
  MIN_SAMPLES: 1000,
  MAX_SAMPLES: 1000000,
  CHECKPOINT_FREQUENCY: 1000
}; 