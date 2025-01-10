import assert from 'assert';
import HandHistoryParser from '../data/handHistoryParser.js';
import { MODEL_CONFIG } from '../utils/constants.js';

async function runTests() {
  console.log('Starting HandHistoryParser tests...');

  const parser = new HandHistoryParser();
  
  // Test cases
  await testBasicParsing(parser);
  await testMultipleHands(parser);
  await testEdgeCases(parser);
  await testInputEncoding(parser);
  await testOutputEncoding(parser);
}

async function testBasicParsing(parser) {
  console.log('\nTesting basic hand parsing...');
  
  const sampleHand = `
Game #1234567890 starting at table 'Table1' with 6 players
Dealt to Hero [ Ah Kd ]
Player1: posts small blind 10
Player2: posts big blind 20
Player3: folds
Player4: calls 20
*** FLOP *** [ 7h 8d 9c ]
Player1: checks
Player2: bets 40
Player3: folds
Player4: calls 40
*** TURN *** [ 2d ]
Player1: checks
Player2: checks
*** RIVER *** [ 3s ]
Player1: bets 100
Player2: calls 100
`;

  const hands = parser.parseIRCFormat(sampleHand);
  
  // Debug output
  console.log('\nParsed actions:');
  hands[0].metadata.actions.forEach((action, i) => {
    console.log(`${i + 1}. ${action.player}: ${action.action} ${action.amount || ''}`);
  });

  console.log('\nVector sizes:', {
    input: hands[0].input.length,
    expected: MODEL_CONFIG.INPUT_SIZE,
    output: hands[0].output.length,
    expectedOutput: MODEL_CONFIG.OUTPUT_SIZE
  });

  console.log('\nHand details:', {
    potSize: hands[0].metadata.potSize,
    numActions: hands[0].metadata.actions.length,
    street: hands[0].metadata.street
  });
  
  // Assertions with better error messages
  assert(
    hands[0].input.length === MODEL_CONFIG.INPUT_SIZE, 
    `Input length mismatch: got ${hands[0].input.length}, expected ${MODEL_CONFIG.INPUT_SIZE}`
  );
  assert(
    hands[0].output.length === MODEL_CONFIG.OUTPUT_SIZE,
    `Output length mismatch: got ${hands[0].output.length}, expected ${MODEL_CONFIG.OUTPUT_SIZE}`
  );
  assert(
    hands[0].metadata.potSize === 330,
    `Pot size mismatch: got ${hands[0].metadata.potSize}, expected 330`
  );
  
  console.log('✓ Basic parsing tests passed');
}

async function testMultipleHands(parser) {
  console.log('\nTesting multiple hand parsing...');
  
  const multipleHands = `
Game #1 starting at table 'Table1' with 6 players
Dealt to Hero [ Ah Kd ]
Player1: posts small blind 10
Player2: posts big blind 20
Player1: folds
Player2: raises 50
Player3: folds

Game #2 starting at table 'Table1' with 6 players
Dealt to Hero [ 2c 3c ]
Player1: posts small blind 10
Player2: posts big blind 20
Player1: calls 20
Player2: raises 60
Player3: folds
`;

  const hands = parser.parseIRCFormat(multipleHands);
  
  assert(hands.length === 2, `Should parse two hands, got ${hands.length}`);
  assert(hands[0].metadata.id === '1', 'First hand ID should match');
  assert(hands[1].metadata.id === '2', 'Second hand ID should match');
  
  // Verify actions in each hand
  assert(hands[0].metadata.actions.length > 0, 'First hand should have actions');
  assert(hands[1].metadata.actions.length > 0, 'Second hand should have actions');
  
  console.log('✓ Multiple hands parsing tests passed');
}

async function testEdgeCases(parser) {
  console.log('\nTesting edge cases...');
  
  // Empty input
  assert(parser.parseIRCFormat('').length === 0, 'Empty input should return empty array');
  
  // Malformed hand
  const malformedHand = `
Game #3 starting
Dealt to Hero [ Ah ]  // Missing card
Player1: invalid action
`;
  
  const hands = parser.parseIRCFormat(malformedHand);
  assert(hands.length === 0, 'Malformed hand should be skipped');
  console.log('✓ Properly handles malformed input');
}

async function testInputEncoding(parser) {
  console.log('\nTesting input encoding...');
  
  const hand = `
Game #4 starting at table 'Table1' with 6 players
Dealt to Hero [ Ah Kd ]
Player1: posts small blind 10
Player2: posts big blind 20
*** FLOP *** [ 7h 8d 9c ]
Player1: checks
Player2: checks
`;

  const hands = parser.parseIRCFormat(hand);
  
  // Debug output
  console.log('\nParsed hand:', {
    numHands: hands.length,
    hasInput: hands[0]?.input !== undefined,
    inputLength: hands[0]?.input?.length,
    holeCards: hands[0]?.metadata?.holeCards,
    input: hands[0]?.input.slice(0, 104) // Show first 104 bits (hole cards)
  });
  
  assert(hands.length > 0, 'Should parse at least one hand');
  const input = hands[0].input;
  
  // Test hole cards encoding in first 52-bit section
  // Ah = (12 * 4) + 0 = 48 (Ace of hearts)
  // Kd = (11 * 4) + 1 = 45 (King of diamonds)
  assert(input[48] === 1, 'Ace of hearts should be encoded at index 48');
  assert(input[45] === 1, 'King of diamonds should be encoded at index 45');
  
  // Test community cards encoding - each in its own 52-bit section
  const communityOffset = 52; // Start of community cards
  // 7h = (5 * 4) + 0 = 20
  // 8d = (6 * 4) + 1 = 25
  // 9c = (7 * 4) + 2 = 30
  assert(input[communityOffset + 20] === 1, '7 of hearts should be encoded at index 72');
  assert(input[communityOffset + 52 + 25] === 1, '8 of diamonds should be encoded at index 129');
  assert(input[communityOffset + 104 + 30] === 1, '9 of clubs should be encoded at index 186');
  
  console.log('✓ Input encoding tests passed');
}

async function testOutputEncoding(parser) {
  console.log('\nTesting output encoding...');
  
  const hand = `
Game #5 starting at table 'Table1' with 6 players
Dealt to Hero [ Ah Kd ]
Player1: posts small blind 10
Player2: posts big blind 20
Player1: folds
`;

  const hands = parser.parseIRCFormat(hand);
  
  assert(hands.length > 0, 'Should parse at least one hand');
  const output = hands[0].output;
  
  assert(output.length === MODEL_CONFIG.OUTPUT_SIZE, 'Output should have correct length');
  assert(output[MODEL_CONFIG.ACTION_MAP['fold']] === 1, 'Fold action should be encoded');
  
  console.log('✓ Output encoding tests passed');
}

// Run all tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
}); 