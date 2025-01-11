import HandEvaluator from '../utils/handEvaluator.js';
import CardConverter from '../utils/cardConverter.js';

async function testHandEvaluation() {
  console.log('Testing hand evaluation...');
  
  const evaluator = new HandEvaluator();
  
  try {
    // Test basic hand evaluation with different suits
    const holeCards = [
      { rank: 12, suit: 0 }, // Ah
      { rank: 11, suit: 1 }  // Kd
    ];
    
    const communityCards = [
      { rank: 10, suit: 2 }, // Qc
      { rank: 9, suit: 3 },  // Js
      { rank: 8, suit: 0 }   // Th
    ];

    // Convert cards to strings for display
    const holeStrings = CardConverter.convertToStrings(holeCards);
    const communityStrings = CardConverter.convertToStrings(communityCards);
    
    console.log('Testing hand:', {
      hole: holeStrings,
      community: communityStrings
    });

    // Evaluate hand
    const handResult = evaluator.evaluateHand(holeCards, communityCards);
    console.log('Hand evaluation:', handResult);

    // Calculate equity
    const equity = evaluator.calculateEquity(holeCards, communityCards);
    console.log('Equity calculation:', equity);

    return {
      success: true,
      message: 'Hand evaluation test passed',
      results: {
        handResult,
        equity
      }
    };

  } catch (error) {
    console.error('Hand evaluation error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Run the test
console.log('Starting hand evaluator test...');
testHandEvaluation()
  .then(result => console.log('Test result:', result))
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  }); 