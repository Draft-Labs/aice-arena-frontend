import HandEvaluator from '../utils/handEvaluator';
import { convertHand, cardToString } from '../utils/cardConverter';

async function testHandEvaluation() {
  console.log('Testing hand evaluation...');
  
  const evaluator = new HandEvaluator();
  
  try {
    // Test cases
    const testHands = [
      {
        name: 'Royal Flush',
        hole: 'Ah Kh',
        community: 'Qh Jh Th',
        expectedType: 9
      },
      {
        name: 'Two Pair',
        hole: 'Ah Ad',
        community: 'Kh Kd 2c',
        expectedType: 3
      },
      {
        name: 'High Card',
        hole: '2h 7d',
        community: '3s 4c 9h',
        expectedType: 1
      }
    ];

    for (const test of testHands) {
      const holeCards = convertHand(test.hole);
      const communityCards = convertHand(test.community);
      
      const result = evaluator.evaluateHand(holeCards, communityCards);
      console.log(`${test.name} Test:`, {
        holeCards: holeCards.map(cardToString),
        communityCards: communityCards.map(cardToString),
        evaluation: result,
        passed: result.handType === test.expectedType
      });

      // Test equity calculation
      const equity = evaluator.calculateEquity(holeCards, communityCards, 100);
      console.log('Equity calculation:', {
        hand: test.name,
        equity: equity,
        percentage: `${(equity * 100).toFixed(2)}%`
      });
    }

    return {
      success: true,
      message: 'Hand evaluation tests completed successfully'
    };
  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testHandEvaluation().then(result => {
  console.log('Test result:', result);
}); 