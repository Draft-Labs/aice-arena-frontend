import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import InputTransformer from '../utils/inputTransformer.js';

async function testModel() {
  console.log('Testing poker model...');
  
  try {
    // Force CPU backend for testing
    await tf.setBackend('cpu');
    console.log('\nBuilding model...\n');
    
    // Initialize and build model
    const model = new PokerModel();
    await model.buildModel();
    
    // Print model summary
    model.model.summary();
    
    console.log('\nTesting forward pass...');
    
    // Create dummy input
    const transformer = new InputTransformer();
    const dummyState = {
      holeCards: [
        { rank: 12, suit: 0 }, // Ah
        { rank: 11, suit: 0 }  // Kh
      ],
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
    
    // Transform state to input tensor
    const inputArray = transformer.transformState(dummyState);
    const inputTensor = tf.tensor2d([inputArray]);
    
    // Make prediction
    const prediction = model.predict(inputTensor);
    
    // Get action probabilities
    const probs = await prediction.data();
    
    console.log('\nPrediction shape:', prediction.shape);
    console.log('Action probabilities:', 
      Array.from(probs).map(p => p.toFixed(4))
    );
    
    // Clean up tensors
    tf.dispose([inputTensor, prediction]);
    
    return {
      success: true,
      message: 'Model test passed',
      shape: prediction.shape,
      outputSize: probs.length
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
console.log('Starting model test...');
testModel()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 