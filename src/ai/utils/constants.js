// Neural Network Input/Output dimensions
export const INPUT_SIZE = 373;  // Total input dimensions:
                               // - Cards: (52 * 7) = 364  [2 hole + 5 community]
                               // - Position: 6            [BTN/SB/BB/EARLY/MIDDLE/LATE]
                               // - Stack: 1              [Normalized stack size]
                               // - Pot: 1                [Normalized pot size]
                               // - Pot odds: 1           [Current bet / (pot + bet)]

export const OUTPUT_SIZE = 4;   // Action space:
                               // - FOLD
                               // - CHECK
                               // - CALL
                               // - RAISE

// Action encoding
export const ACTIONS = {
  FOLD: 0,    // Give up hand
  CHECK: 1,   // Pass action when no bet to call
  CALL: 2,    // Match the current bet
  RAISE: 3    // Increase the current bet
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

// Position mapping for different table sizes
export const POSITION_MAPPING = {
  6: {  // 6 players (full ring)
    0: POSITIONS.BTN,    // Last to act post-flop
    1: POSITIONS.SB,     // First to act post-flop
    2: POSITIONS.BB,     // Second to act post-flop
    3: POSITIONS.EARLY,  // UTG
    4: POSITIONS.MIDDLE, // MP
    5: POSITIONS.LATE    // CO
  },
  5: {  // 5 players (short-handed)
    0: POSITIONS.BTN,
    1: POSITIONS.SB,
    2: POSITIONS.BB,
    3: POSITIONS.EARLY,
    4: POSITIONS.MIDDLE
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