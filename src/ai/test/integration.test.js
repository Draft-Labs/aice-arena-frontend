import { TrainingPipeline } from '../training/trainingPipeline';
import { PerformanceMetrics } from '../utils/metrics';
import { ValidationSystem } from '../training/validationSystem';
import { TechnicalVerification } from '../test/technicalVerification';

async function testIntegration() {
  console.log('Starting integration test...');
  
  try {
    const pipeline = new TrainingPipeline({
      epochs: 2,
      batchSize: 32,
      validationFrequency: 1
    });

    // Verify components are properly initialized
    console.assert(pipeline.validationSystem instanceof ValidationSystem, 
      'ValidationSystem not properly initialized');
    console.assert(pipeline.metrics instanceof PerformanceMetrics,
      'PerformanceMetrics not properly initialized');

    // Run small training loop
    const results = await pipeline.train();

    // Verify metrics structure
    console.assert(results.training.loss.length > 0, 'No training loss recorded');
    console.assert(results.validation.streetAccuracy.preflop !== undefined, 
      'Street-specific metrics missing');

    return {
      success: true,
      message: 'Integration test completed successfully',
      results
    };
  } catch (error) {
    console.error('Integration test failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
} 