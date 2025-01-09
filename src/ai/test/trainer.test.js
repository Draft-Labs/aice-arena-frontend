import PokerTrainer from '../training/trainer';
import PokerModel from '../models/pokerModel';

async function testTrainer() {
  console.log('Testing poker trainer...');
  
  try {
    const model = new PokerModel();
    model.buildModel();
    
    const trainer = new PokerTrainer(model, {
      epochs: 2,
      stepsPerEpoch: 5,
      batchSize: 16
    });
    
    // Test one epoch
    console.log('\nTesting training loop...');
    await trainer.train();
    
    trainer.dispose();
    
    return {
      success: true,
      message: 'Trainer tests completed successfully'
    };
    
  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testTrainer().then(result => {
  console.log('\nTest result:', result);
}); 