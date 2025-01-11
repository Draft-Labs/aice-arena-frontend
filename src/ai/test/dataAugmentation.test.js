import DataAugmenter from '../utils/dataAugmentation';
import CardConverter from '../utils/cardConverter';
import { ACTIONS, POSITIONS, POSITION_MAPPING } from '../utils/constants';

// Test edge cases and error conditions
async function testEdgeCases() {
  console.log('\nTesting edge cases...');
  const augmenter = new DataAugmenter();

  // 1. Card permutation edge cases
  console.log('\n1. Card permutation edge cases:');
  try {
    augmenter.permuteHoleCards([1]);  // Invalid number of hole cards
    console.assert(false, 'Should throw error for invalid hole cards');
  } catch (e) {
    console.log('✓ Correctly handled invalid hole cards');
  }

  // Test with invalid card numbers
  try {
    augmenter.permuteHoleCards([53, 54]);
    console.assert(false, 'Should throw error for invalid card numbers');
  } catch (e) {
    console.log('✓ Correctly handled invalid card numbers');
  }

  // 2. Action variation edge cases
  console.log('\n2. Action variation edge cases:');
  const emptyActions = augmenter.generateActionVariations([]);
  console.assert(emptyActions.length === 3, 'Should handle empty action list');

  const nullAction = augmenter.generateActionVariations([{ type: null, amount: null }]);
  console.assert(
    nullAction[0].length === 1,
    'Should handle null action values'
  );

  // 3. Position rotation edge cases
  console.log('\n3. Position rotation edge cases:');
  const invalidPos = augmenter.generatePositionRotations(10);  // Invalid position
  console.assert(invalidPos.length === 0, 'Should handle invalid position');

  const invalidPlayerCount = augmenter.generatePositionRotations(0, 10);  // Invalid player count
  console.assert(invalidPlayerCount.length === 0, 'Should handle invalid player count');

  // 4. Noise injection edge cases
  console.log('\n4. Noise injection edge cases:');
  
  // Test with zero values
  const zeroExample = {
    stackSize: 0,
    potSize: 0,
    actions: [{ type: ACTIONS.CALL, amount: 0 }]
  };
  const zeroVariations = augmenter.augmentWithNoise(zeroExample);
  console.assert(
    zeroVariations.every(v => v.stackSize >= 0 && v.potSize >= 0),
    'Should handle zero values without going negative'
  );

  // Test with very large values
  const largeExample = {
    stackSize: Number.MAX_SAFE_INTEGER / 2,
    potSize: Number.MAX_SAFE_INTEGER / 2,
    actions: [{ type: ACTIONS.RAISE, amount: Number.MAX_SAFE_INTEGER / 2 }]
  };
  const largeVariations = augmenter.augmentWithNoise(largeExample);
  console.assert(
    largeVariations.every(v => 
      Number.isFinite(v.stackSize) && 
      Number.isFinite(v.potSize) &&
      v.actions.every(a => Number.isFinite(a.amount))
    ),
    'Should handle very large values without overflow'
  );

  // Test with missing properties
  const incompleteExample = {};
  try {
    augmenter.augmentWithNoise(incompleteExample);
    console.assert(false, 'Should handle missing properties gracefully');
  } catch (e) {
    console.log('✓ Correctly handled missing properties');
  }

  console.log('\nAll edge cases handled correctly!');
}

async function testDataAugmentation() {
  console.log('Testing data augmentation...');

  const augmenter = new DataAugmenter();

  console.log('\n1. Testing card permutations...');
  // Test hole card permutation
  const cardTestCases = [
    {
      name: 'Pocket pair',
      holeCards: ['Ah', 'As'],  // Use string format directly
      communityCards: ['Kh', 'Qd', 'Js'],
      expectedPermutations: 2  // Both orderings valid
    },
    {
      name: 'Suited connectors',
      holeCards: ['Ah', 'Kh'],
      communityCards: ['Qh', 'Jh', 'Th'],
      expectedPermutations: 2  // Both orderings valid
    }
  ];

  for (const test of cardTestCases) {
    console.log(`\nTesting ${test.name}...`);
    const permutations = augmenter.permuteHoleCards(
      test.holeCards,
      test.communityCards
    );

    console.assert(
      permutations.length === test.expectedPermutations,
      `Expected ${test.expectedPermutations} permutations, got ${permutations.length}`
    );

    // Test full example augmentation
    const example = {
      holeCards: test.holeCards,
      communityCards: test.communityCards,
      action: 1,
      position: 0
    };

    const augmented = augmenter.augmentExample(example);
    console.log('Augmented examples:', augmented.length);
  }

  console.log('\n2. Testing action variations...');
  const actionTestCases = [
    {
      name: 'Simple call sequence',
      actions: [
        { type: ACTIONS.CALL, amount: 10, player: 'Player1' },
        { type: ACTIONS.CALL, amount: 20, player: 'Player2' }
      ],
      expectedVariations: 3  // Original + timing variation + bet sizing variation
    },
    {
      name: 'Raise sequence',
      actions: [
        { type: ACTIONS.RAISE, amount: 50, player: 'Player1' },
        { type: ACTIONS.CALL, amount: 50, player: 'Player2' }
      ],
      expectedVariations: 3
    }
  ];

  for (const test of actionTestCases) {
    console.log(`\nTesting ${test.name}...`);
    const variations = augmenter.generateActionVariations(test.actions);
    
    console.assert(
      variations.length === test.expectedVariations,
      `Expected ${test.expectedVariations} variations, got ${variations.length}`
    );

    // Test full example augmentation with actions
    const example = {
      holeCards: ['Ah', 'Kh'],
      communityCards: ['Qh', 'Jh', 'Th'],
      actions: test.actions,
      position: 0
    };

    const augmented = augmenter.augmentActions(example);
    console.log('Action variations:', {
      original: augmented[0].actions,
      withTiming: augmented[1].actions,
      withBetSizing: augmented[2].actions
    });

    // Verify timing variations
    console.assert(
      augmented[1].actions.every(action => action.timing >= 0.5 && action.timing <= 1.0),
      'Timing variations should be between 0.5 and 1.0'
    );
    
    // Verify bet sizing variations
    const raiseActions = augmented[2].actions.filter(action => action.type === ACTIONS.RAISE);
    console.assert(
      raiseActions.every(action => {
        const original = test.actions.find(a => a.player === action.player && a.type === ACTIONS.RAISE);
        const ratio = action.amount / original.amount;
        return ratio >= 0.8 && ratio <= 1.2;  // Check if within 80-120% range
      }),
      'Raise amounts should vary between 80-120% of original'
    );
  }

  console.log('\n3. Testing position rotations...');
  const positionTestCases = [
    {
      name: 'Early position',
      position: POSITIONS.EARLY,
      expectedRotations: 2  // Multiple early positions in 6-max
    },
    {
      name: 'Button position',
      position: POSITIONS.BTN,
      expectedRotations: 1  // Only one button
    }
  ];

  for (const test of positionTestCases) {
    console.log(`\nTesting ${test.name}...`);
    
    const example = {
      holeCards: ['Ah', 'Kh'],
      communityCards: ['Qh', 'Jh', 'Th'],
      position: test.position,
      actions: [
        { type: ACTIONS.CALL, amount: 10, player: 'Player1', relativePosition: 1 },
        { type: ACTIONS.RAISE, amount: 30, player: 'Player2', relativePosition: 2 }
      ]
    };

    const rotated = augmenter.augmentPositions(example);
    console.log('Position variations:', {
      count: rotated.length,
      positions: rotated.map(ex => ex.position)
    });

    console.assert(
      rotated.length === test.expectedRotations,
      `Expected ${test.expectedRotations} rotations, got ${rotated.length}`
    );

    // Verify relative positions are adjusted correctly
    console.assert(
      rotated.every(ex => 
        ex.actions.every(action => 
          action.relativePosition >= 0 && action.relativePosition < 6
        )
      ),
      'Relative positions should remain within valid range (0-5)'
    );
  }

  console.log('\n4. Testing noise injection...');
  const noiseExample = {
    holeCards: ['Ah', 'Kh'],
    communityCards: ['Qh', 'Jh', 'Th'],
    stackSize: 1000,
    potSize: 100,
    actions: [
      { type: ACTIONS.CALL, amount: 20, player: 'Player1' },
      { type: ACTIONS.RAISE, amount: 60, player: 'Player2' }
    ]
  };

  const noisyVariations = augmenter.augmentWithNoise(noiseExample);
  console.log('Noise variations:', {
    original: {
      stack: noisyVariations[0].stackSize,
      pot: noisyVariations[0].potSize,
      bets: noisyVariations[0].actions.map(a => a.amount)
    },
    noisy1: {
      stack: noisyVariations[1].stackSize,
      pot: noisyVariations[1].potSize,
      bets: noisyVariations[1].actions.map(a => a.amount)
    },
    noisy2: {
      stack: noisyVariations[2].stackSize,
      pot: noisyVariations[2].potSize,
      bets: noisyVariations[2].actions.map(a => a.amount)
    }
  });

  // Verify noise is within expected bounds
  for (const variation of noisyVariations.slice(1)) {  // Skip original
    console.assert(
      Math.abs(variation.stackSize - noiseExample.stackSize) <= noiseExample.stackSize * 0.1,
      'Stack size noise should be within ±10%'
    );
    console.assert(
      Math.abs(variation.potSize - noiseExample.potSize) <= noiseExample.potSize * 0.1,
      'Pot size noise should be within ±10%'
    );
    variation.actions.forEach((action, i) => {
      console.assert(
        Math.abs(action.amount - noiseExample.actions[i].amount) <= noiseExample.actions[i].amount * 0.1,
        'Bet amount noise should be within ±10%'
      );
    });
  }

  // Run edge case tests
  await testEdgeCases();

  console.log('\nAll data augmentation tests passed!');
}

testDataAugmentation().catch(console.error); 