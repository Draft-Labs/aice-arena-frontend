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
  INPUT_SIZE: 373,  // Match the input shape from pokerModel.js
  OUTPUT_SIZE: 4,   // Match the output shape (4 possible actions)
  HIDDEN_LAYERS: [512, 256, 128],
  DROPOUT_RATE: 0.3,
  LEARNING_RATE: 0.0002
}; 