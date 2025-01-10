import * as tf from '@tensorflow/tfjs';
import PokerTrainer from '../training/trainer.js';
import PokerModel from '../models/pokerModel.js';

async function testTrainer() {
  console.log('Testing trainer...');
  
  // Force browser/CPU backend
  await tf.setBackend('cpu');
  console.log('Using backend:', tf.getBackend());
  
  // Initialize model
  const model = new PokerModel();
  await model.buildModel();
  
  const trainer = new PokerTrainer(model, {
    epochs: 10,
    batchSize: 32,
    learningRate: 0.001
  });

  try {
    const metrics = await trainer.train();
    console.log('Training completed successfully');
    console.log('Final metrics:', metrics);
    
    // Log final model summary
    model.model.summary();
    
    return true;
  } catch (error) {
    console.error('Training failed:', error);
    throw error;
  } finally {
    trainer.dispose();
  }
}

// Run the test
console.log('Starting trainer test...');
testTrainer()
  .then(() => console.log('Test completed successfully'))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 