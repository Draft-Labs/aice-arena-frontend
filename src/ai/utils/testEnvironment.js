import * as tf from '@tensorflow/tfjs';
import { encodeGameState } from './stateEncoder';
import { INPUT_SIZE, OUTPUT_SIZE } from './constants';

export async function testEnvironmentSetup() {
  try {
    // Test TensorFlow.js
    const tensor = tf.tensor1d([1, 2, 3]);
    console.log('TensorFlow.js working:', tensor.shape);
    tensor.dispose();

    // Test state encoding
    const mockGameState = {
      playerCards: [1, 2],  // Ace and 2 of spades
      communityCards: [3, 4, 5, 6, 7],  // Full board of 5 cards
      position: 2,
      potSize: 100,
      stackSize: 500,
      lastAction: 1
    };

    const encodedState = encodeGameState(mockGameState);
    console.log('State encoding working:', {
      expectedLength: INPUT_SIZE,
      actualLength: encodedState.length
    });

    return {
      success: true,
      message: 'Environment setup successful'
    };
  } catch (error) {
    console.error('Environment setup failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
} 