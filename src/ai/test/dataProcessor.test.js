import DataProcessor from '../data/dataProcessor';
import { ACTIONS } from '../utils/constants';

async function testDataProcessor() {
  console.log('Testing data processor...');

  const processor = new DataProcessor({
    maxSequenceLength: 10
  });

  // Sample hand data matching our HandCollector output format
  const sampleHand = {
    gameType: 'tournament',
    positions: { 'Player1': 0, 'Player2': 1, 'Player3': 2 },  // BTN, SB, BB
    stacks: { 'Player1': 1500, 'Player2': 1600, 'Player3': 2000 },
    activePlayers: [0, 1, 2],
    holeCards: {
      'Player1': ['Ah', 'Kh'],
      'Player2': ['Jc', 'Tc']
    },
    playerStats: {
      'Player1': { vpip: 0.25, pfr: 0.20, aggression: 0.4, threeBet: 0.05, postFlopAggression: 0.3 }
    },
    stages: [
      {
        type: 'preflop',
        cards: [],
        potSize: 30,
        toCall: 20,
        actions: [
          { player: 'Player3', type: 'raise', amount: 80, increment: 60 },
          { player: 'Player1', type: 'call', amount: 70 },
          { player: 'Player2', type: 'fold' }
        ]
      },
      {
        type: 'flop',
        cards: ['7h', '8h', '9h'],
        potSize: 180,
        toCall: 120,
        actions: [
          { player: 'Player1', type: 'check' },
          { player: 'Player3', type: 'bet', amount: 120 },
          { player: 'Player1', type: 'call', amount: 120 }
        ]
      }
    ]
  };

  // Test 1: Training example generation
  console.log('\n1. Testing training example generation...');
  const examples = processor.convertToTrainingExamples(sampleHand);
  console.assert(examples.length === 6, 'Should generate correct number of examples (6 actions total)');
  console.assert(examples[0].features instanceof Float32Array, 'Should use Float32Array for features');
  console.assert(examples[0].label instanceof Float32Array, 'Should use Float32Array for labels');

  // Test 2: Feature extraction
  console.log('\n2. Testing feature extraction...');
  const features = processor.extractFeatures(
    sampleHand,
    sampleHand.stages[0],
    sampleHand.stages[0].actions[0]
  );

  // Verify position encoding
  console.assert(
    features[2] === 1,  // Player3 is BB (position 2)
    'Should encode position correctly'
  );

  // Verify stack size encoding
  console.assert(
    Math.abs(features[6] - 10) < 0.1,  // 2000/200 = 10 BB
    'Should normalize stack sizes correctly'
  );

  // Test 3: Card encoding
  console.log('\n3. Testing card encoding...');
  const cardIndex = processor.cardToIndex('Ah');
  console.assert(cardIndex === 12, 'Should encode Ace of hearts correctly');  // A = 12, h = 0, so 12 + (0 * 13) = 12

  // Test 4: Action history encoding
  console.log('\n4. Testing action history encoding...');
  const history = processor.getPreviousActions(
    sampleHand,
    sampleHand.stages[1],  // flop
    sampleHand.stages[1].actions[1]  // bet action
  );
  console.assert(history.length === 4, 'Should collect correct number of previous actions');

  // Test 5: Label creation
  console.log('\n5. Testing label creation...');
  const label = processor.createLabel({ type: 'raise' });
  const raiseIndex = Object.values(ACTIONS).indexOf(ACTIONS.RAISE);
  console.assert(
    label[raiseIndex] === 1 && 
    label.reduce((a, b) => a + b) === 1,
    'Should create correct one-hot encoded label'
  );

  // Test 6: Game state encoding
  console.log('\n6. Testing game state encoding...');
  const gameStateOffset = processor.encodeGameState(
    new Float32Array(1000),
    sampleHand,
    sampleHand.stages[0],
    0
  );
  console.assert(gameStateOffset === 14, 'Should advance offset correctly');

  // Test 7: Opponent stats encoding
  console.log('\n7. Testing opponent stats encoding...');
  const statsFeatures = new Float32Array(10);
  processor.encodeOpponentStats(statsFeatures, sampleHand, 'Player1', 0);
  console.assert(
    Math.abs(statsFeatures[0] - 0.25) < 0.001,
    'Should encode VPIP correctly'
  );

  // Test 8: Full pipeline with memory checks
  console.log('\n8. Testing full processing pipeline...');
  const startHeap = process.memoryUsage().heapUsed;
  for (let i = 0; i < 10; i++) {  // Reduce iterations to avoid log spam
    processor.convertToTrainingExamples(sampleHand);
  }
  const endHeap = process.memoryUsage().heapUsed;
  console.assert(
    (endHeap - startHeap) / startHeap < 0.1,
    'Should not have significant memory growth'
  );

  console.log('\nAll data processor tests passed!');
}

testDataProcessor().catch(console.error); 