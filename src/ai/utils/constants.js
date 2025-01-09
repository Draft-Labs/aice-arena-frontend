export const INPUT_SIZE = 370; // (52 * 2) + (52 * 5) + 1 + 1 + 1 + 3
export const OUTPUT_SIZE = 4;  // fold, check, call, raise

export const ACTIONS = {
  FOLD: 0,
  CHECK: 1,
  CALL: 2,
  RAISE: 3
};

export const POSITIONS = {
  BTN: 0,    // Button
  SB: 1,     // Small Blind
  BB: 2,     // Big Blind
  EARLY: 3,  // First 2 positions after BTN
  MIDDLE: 4, // Next 2 positions
  LATE: 5    // Last 2 positions including BTN
};

// Add position mapping for 6-max
export const POSITION_MAPPING = {
  6: { // 6 players
    0: POSITIONS.BTN,
    1: POSITIONS.SB,
    2: POSITIONS.BB,
    3: POSITIONS.EARLY,
    4: POSITIONS.MIDDLE,
    5: POSITIONS.LATE
  },
  5: { // 5 players
    0: POSITIONS.BTN,
    1: POSITIONS.SB,
    2: POSITIONS.BB,
    3: POSITIONS.EARLY,
    4: POSITIONS.MIDDLE
  }
}; 

export const HAND_TYPES = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9  // Including Royal Flush
}; 