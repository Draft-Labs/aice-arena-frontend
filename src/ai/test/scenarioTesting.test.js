import * as tf from '@tensorflow/tfjs';
import ScenarioTesting from './scenarioTesting.js';
import PokerModel from '../models/pokerModel.js';
import { ACTIONS, POSITIONS } from '../utils/constants.js';

async function testScenarioFramework() {
  console.log('Starting scenario testing framework tests...');

  try {
    // Initialize model and build it
    const model = new PokerModel();
    await model.buildModel();
    
    // Wait for model to be ready
    await tf.ready();
    
    const scenarioTesting = new ScenarioTesting(model);

    // Test 1: Scenario Definition
    console.log('\n1. Testing scenario definitions...');
    console.assert(
      Object.keys(scenarioTesting.scenarios).length === 4,
      'Should have scenarios for all streets'
    );
    console.assert(
      scenarioTesting.scenarios.preflop.length > 0,
      'Should have preflop scenarios'
    );

    // Test 2: Input Creation
    console.log('\n2. Testing input creation...');
    const input = await scenarioTesting.createInput({
      holeCards: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      communityCards: [],
      position: POSITIONS.BTN,
      stackSize: 100,
      potSize: 10
    });

    console.assert(
      input instanceof tf.Tensor,
      'Should create valid tensor input'
    );
    console.assert(
      input.shape[1] === 373,
      'Should have correct input dimensions'
    );
    input.dispose();

    // Test 3: Single Scenario Testing
    console.log('\n3. Testing single scenario evaluation...');
    const testScenario = scenarioTesting.scenarios.preflop[0];
    const results = await scenarioTesting.testScenario(testScenario);

    console.assert(
      results.length === testScenario.hands.length,
      'Should evaluate all hands in scenario'
    );
    console.assert(
      typeof results[0].isCorrect === 'boolean',
      'Should determine correctness of decisions'
    );

    // Test 4: Full Test Suite
    console.log('\n4. Testing full scenario suite...');
    const allResults = await scenarioTesting.runAllScenarios();
    
    console.assert(
      Object.keys(allResults).length === 4,
      'Should have results for all streets'
    );

    // Test 5: Metrics Calculation
    console.log('\n5. Testing metrics calculation...');
    const metrics = scenarioTesting.calculateMetrics(allResults);

    console.assert(
      metrics.overall.total > 0,
      'Should calculate overall metrics'
    );
    console.assert(
      Object.keys(metrics.byStreet).length === 4,
      'Should have metrics for each street'
    );

    // Test 6: Memory Management
    console.log('\n6. Testing memory management...');
    const initialTensors = tf.memory().numTensors;
    
    const testScenarioMem = scenarioTesting.scenarios.preflop[0];
    const resultsMem = await scenarioTesting.testScenario(testScenarioMem);
    
    const finalTensors = tf.memory().numTensors;
    console.assert(
      finalTensors === initialTensors,
      `Tensor leak detected: ${finalTensors - initialTensors} tensors remaining`
    );

    console.log('\n✅ All scenario testing framework tests passed successfully!');
    
    return {
      success: true,
      message: 'Scenario testing framework validated successfully',
      metrics: metrics
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    // Clean up any remaining tensors
    tf.disposeVariables();
  }
}

testScenarioFramework().catch(console.error); 