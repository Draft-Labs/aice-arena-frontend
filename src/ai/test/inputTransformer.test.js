import InputTransformer from '../utils/inputTransformer.js';

async function testInputTransformation() {
  console.log('Testing input transformation...');
  
  const transformer = new InputTransformer();
  
  try {
    console.log('\nTesting individual components:');
    
    // Test card transformation with maxCards parameter
    const holeCards = [
      { rank: 12, suit: 0 }, // Ah
      { rank: 11, suit: 0 }  // Kh
    ];
    const cardEncoding = transformer.transformCards(holeCards, 2); // Specify maxCards=2 for hole cards
    console.log('Card encoding length:', cardEncoding.length);
    console.log('Number of 1s in card encoding:', cardEncoding.filter(x => x === 1).length);
    
    // Test position transformation
    const position = 'BTN';
    const positionEncoding = transformer.transformPosition(position);
    console.log('Position encoding:', positionEncoding);
    
    // Test full state transformation
    const gameState = {
      holeCards: holeCards,
      communityCards: [
        { rank: 10, suit: 0 }, // Qh
        { rank: 9, suit: 0 },  // Jh
        { rank: 8, suit: 0 }   // Th
      ],
      position: 'BTN',
      stack: 1000,
      potSize: 100,
      betAmount: 20
    };
    
    const stateEncoding = transformer.transformState(gameState);
    
    // Validate encoding
    if (stateEncoding.length !== transformer.inputDimension) {
      throw new Error(`Invalid encoding length: ${stateEncoding.length}, expected ${transformer.inputDimension}`);
    }
    
    // Check if values are in valid range
    const validRange = stateEncoding.every(value => value >= 0 && value <= 1);
    if (!validRange) {
      throw new Error('Encoding contains values outside [0,1] range');
    }
    
    console.log('\nEncoding dimensions:', {
      total: stateEncoding.length,
      holeCards: transformer.holeCardsSize,
      communityCards: transformer.communityCardsSize,
      position: transformer.positionSize,
      numeric: transformer.numericFeatures
    });
    
    return {
      success: true,
      message: 'Input transformation test passed',
      dimensions: {
        total: stateEncoding.length,
        holeCards: transformer.holeCardsSize,
        communityCards: transformer.communityCardsSize,
        position: transformer.positionSize,
        numeric: transformer.numericFeatures
      }
    };
    
  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Run the test
console.log('Starting input transformer test...');
testInputTransformation()
  .then(result => console.log('Test result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 