import InputTransformer from '../utils/inputTransformer';
import { convertHand, cardToString } from '../utils/cardConverter';
import { POSITIONS } from '../utils/constants';

async function testInputTransformation() {
  console.log('Testing input transformation...');
  
  const transformer = new InputTransformer();
  
  try {
    // Test individual components
    console.log('\nTesting individual components:');
    
    // Test card encoding
    const testCards = [
      { card: 1, name: 'Ace of Hearts' },
      { card: 13, name: 'King of Hearts' },
      { card: 14, name: 'Ace of Diamonds' },
      { card: 52, name: 'King of Spades' },
      { card: 0, name: 'Invalid Card Low' },
      { card: 53, name: 'Invalid Card High' }
    ];

    for (const test of testCards) {
      const encoding = transformer.encodeCard(test.card, 0);
      console.log(`${test.name} encoding:`, {
        size: encoding.length,
        position: encoding.indexOf(1),
        sum: encoding.reduce((a, b) => a + b, 0),
        originalCard: cardToString(test.card)
      });
    }

    // Test position encoding
    const positions = [
      { pos: POSITIONS.BTN, name: 'Button' },
      { pos: POSITIONS.SB, name: 'Small Blind' },
      { pos: POSITIONS.BB, name: 'Big Blind' },
      { pos: POSITIONS.EARLY, name: 'Early Position' },
      { pos: POSITIONS.MIDDLE, name: 'Middle Position' },
      { pos: POSITIONS.LATE, name: 'Late Position' },
      { pos: -1, name: 'Invalid Position Low' },
      { pos: 6, name: 'Invalid Position High' }
    ];

    for (const test of positions) {
      const encoding = transformer.encodePosition(test.pos);
      console.log(`${test.name} encoding:`, {
        size: encoding.length,
        position: encoding.indexOf(1),
        sum: encoding.reduce((a, b) => a + b, 0)
      });
    }

    // Test complete states
    console.log('\nTesting complete states:');

    const testStates = [
      {
        name: 'Royal Flush',
        state: {
          holeCards: convertHand('Ah Kh'),
          communityCards: convertHand('Qh Jh Th'),
          position: POSITIONS.BTN,
          stack: 1000,
          potSize: 100,
          betAmount: 20
        }
      },
      {
        name: 'Preflop',
        state: {
          holeCards: convertHand('2h 7d'),
          communityCards: [],
          position: POSITIONS.SB,
          stack: 900,
          potSize: 30,
          betAmount: 10
        }
      },
      {
        name: 'Empty Hand',
        state: {
          holeCards: [],
          communityCards: [],
          position: POSITIONS.BB,
          stack: 0,
          potSize: 0,
          betAmount: 0
        }
      },
      {
        name: 'Oversized Values',
        state: {
          holeCards: convertHand('As Ks'),
          communityCards: convertHand('Qs Js Ts'),
          position: POSITIONS.EARLY,
          stack: 2000,
          potSize: 5000,
          betAmount: 1000
        }
      },
      {
        name: 'Partial Community',
        state: {
          holeCards: convertHand('Td 9d'),
          communityCards: convertHand('8d 7d'),
          position: POSITIONS.MIDDLE,
          stack: 500,
          potSize: 200,
          betAmount: 50
        }
      }
    ];

    // Find card indices helper
    const findCardIndex = (cardNumber, slotIndex, input) => {
      const startPos = slotIndex * 52;
      const cardPos = startPos + ((cardNumber - 1) % 52);
      return input[cardPos] === 1 ? cardPos : -1;
    };

    // Test each state
    for (const test of testStates) {
      const input = transformer.transformState(test.state);
      console.log(`${test.name} state:`, {
        size: input.length,
        nonZeroElements: input.filter(x => x !== 0).length,
        holeCards: test.state.holeCards.map(cardToString),
        holeCardIndices: test.state.holeCards.map((card, i) => findCardIndex(card, i, input)),
        communityCards: test.state.communityCards.map(cardToString),
        communityCardIndices: test.state.communityCards.map((card, i) => findCardIndex(card, i + 2, input)),
        positionIndex: input.indexOf(1, 52 * 7),
        stackValue: input[input.length - 3],
        potValue: input[input.length - 2],
        potOdds: input[input.length - 1],
        valid: transformer.validateInput(input)
      });
    }

    return {
      success: true,
      message: 'Input transformation tests completed successfully'
    };
  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testInputTransformation().then(result => {
  console.log('\nTest result:', result);
}); 