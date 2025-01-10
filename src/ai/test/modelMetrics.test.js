import * as tf from '@tensorflow/tfjs';
import ModelMetrics from '../utils/metrics.js';
import { ACTIONS } from '../utils/constants.js';

async function testModelMetrics() {
  console.log('Starting ModelMetrics tests...');
  
  try {
    const metrics = new ModelMetrics();
    
    // Test 1: Basic metrics initialization
    console.log('\n1. Testing metrics initialization...');
    console.assert(
      metrics.predictions.length === 0,
      'Should start with empty predictions'
    );
    console.assert(
      metrics.streetMetrics.preflop.total === 0,
      'Should start with zero street metrics'
    );

    // Test 2: Street accuracy tracking
    console.log('\n2. Testing street accuracy tracking...');
    metrics.updateStreetAccuracy('preflop', 1, 1);
    metrics.updateStreetAccuracy('preflop', 1, 0);
    const streetAccuracies = metrics.getStreetAccuracies();
    console.assert(
      streetAccuracies.preflop === 0.5,
      'Should calculate correct street accuracy'
    );

    // Test 3: Position metrics
    console.log('\n3. Testing position metrics...');
    metrics.updatePositionMetrics('BTN', 1, 1);
    metrics.updatePositionMetrics('BTN', 0, 0);
    const positionAccuracies = metrics.getPositionAccuracies();
    console.assert(
      positionAccuracies.BTN === 1.0,
      'Should calculate correct position accuracy'
    );

    // Test 4: Bet sizing metrics
    console.log('\n4. Testing bet sizing metrics...');
    metrics.updateBetSizing(100, 120, 1000);
    const betMetrics = metrics.getBetSizingMetrics();
    console.assert(
      betMetrics.meanError < 0.1,
      'Should have reasonable bet sizing error'
    );

    // Test 5: Hand strength correlation
    console.log('\n5. Testing hand strength correlation...');
    
    // Test with empty data first
    console.assert(
      metrics.getHandStrengthCorrelation() === 0,
      'Should handle empty correlation data'
    );
    
    // Add test data
    metrics.updateHandStrength(0.8, ACTIONS.RAISE);  // Strong hand -> aggressive action
    metrics.updateHandStrength(0.7, ACTIONS.RAISE);
    metrics.updateHandStrength(0.4, ACTIONS.CALL);   // Medium hand -> medium action
    metrics.updateHandStrength(0.2, ACTIONS.FOLD);   // Weak hand -> passive action
    metrics.updateHandStrength(0.1, ACTIONS.FOLD);
    
    const correlation = metrics.getHandStrengthCorrelation();
    console.assert(
      correlation > 0.8,  // Should show strong positive correlation
      `Hand strength correlation should be strongly positive, got ${correlation}`
    );

    // Test 6: Memory management
    console.log('\n6. Testing memory management...');
    const initialTensors = tf.memory().numTensors;
    
    tf.engine().startScope();  // Start a new scope for tensor operations
    
    // Create test tensors
    const predictions = tf.tensor2d([[0.7, 0.1, 0.1, 0.1]]);
    const labels = tf.tensor2d([[1, 0, 0, 0]]);
    
    metrics.update(predictions, labels);
    
    // Clean up tensors
    predictions.dispose();
    labels.dispose();
    
    tf.engine().endScope();  // End scope and clean up any remaining tensors
    
    const finalTensors = tf.memory().numTensors;
    console.assert(
      finalTensors === initialTensors,
      `Should clean up all tensors (initial: ${initialTensors}, final: ${finalTensors})`
    );

    // Test 7: Full metrics report
    console.log('\n7. Testing full metrics report...');
    const fullMetrics = metrics.getMetrics();
    console.assert(
      typeof fullMetrics === 'object',
      'Should return metrics object'
    );
    console.assert(
      fullMetrics.streetAccuracies !== undefined,
      'Should include street accuracies'
    );
    console.assert(
      fullMetrics.positionAccuracies !== undefined,
      'Should include position accuracies'
    );

    console.log('\n✅ All ModelMetrics tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

testModelMetrics().catch(console.error); 