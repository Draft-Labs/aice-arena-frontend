import StrategyVerifier from '../utils/strategyVerifier.js';
import { ACTIONS, POSITIONS } from '../utils/constants.js';

async function testStrategyVerifier() {
  console.log('Starting strategy verifier tests...');

  try {
    const verifier = new StrategyVerifier();

    // Test 1: Premium Hand Strategy
    console.log('\n1. Testing premium hand strategy...');
    const premiumHandResult = verifier.verifyDecision(
      {
        street: 'preflop',
        position: POSITIONS.UTG,
        hand: ['As', 'Ah'],
        stackSize: 100,
        potOdds: 0.1
      },
      ACTIONS.RAISE
    );

    console.assert(
      premiumHandResult.passed,
      'Should approve raising premium hands'
    );

    // Test 2: Position Play
    console.log('\n2. Testing position-based play...');
    const positionResult = verifier.verifyDecision(
      {
        street: 'preflop',
        position: POSITIONS.BTN,
        hand: ['Ts', '9s'],
        stackSize: 100,
        potOdds: 0.1
      },
      ACTIONS.CALL
    );

    console.assert(
      positionResult.passed,
      'Should approve wider range in position'
    );

    // Test 3: Stack Depth Strategy
    console.log('\n3. Testing stack depth strategy...');
    const shortStackResult = verifier.verifyDecision(
      {
        street: 'preflop',
        position: POSITIONS.MP,
        hand: ['Js', 'Th'],
        stackSize: 15,
        potOdds: 0.1
      },
      ACTIONS.FOLD
    );

    console.assert(
      shortStackResult.passed,
      'Should approve tight play with short stack'
    );

    // Test 4: Draw Continuation
    console.log('\n4. Testing draw continuation...');
    const drawResult = verifier.verifyDecision(
      {
        street: 'postflop',
        position: POSITIONS.BB,
        hand: ['Ah', 'Kh'],
        board: ['Th', '9h', '2s'],
        stackSize: 100,
        potOdds: 0.25
      },
      ACTIONS.CALL
    );

    console.assert(
      drawResult.passed,
      'Should approve continuing with strong draws'
    );

    // Test 5: Strategic Consistency
    console.log('\n5. Testing strategic consistency...');
    const decisions = [
      {
        gameState: {
          street: 'preflop',
          position: POSITIONS.UTG,
          hand: ['As', 'Ah'],
          stackSize: 100,
          potOdds: 0.1
        },
        action: ACTIONS.RAISE
      },
      {
        gameState: {
          street: 'postflop',
          position: POSITIONS.BTN,
          hand: ['Ks', 'Kh'],
          board: ['Kc', '7h', '2d'],
          stackSize: 100,
          potOdds: 0.2
        },
        action: ACTIONS.RAISE
      }
    ];

    const consistencyResults = verifier.verifyStrategicConsistency(decisions);
    
    console.assert(
      consistencyResults.overall.averageCompliance > 0.8,
      'Should maintain high strategic consistency'
    );

    // Test 6: Violation Detection
    console.log('\n6. Testing violation detection...');
    const violationResult = verifier.verifyDecision(
      {
        street: 'preflop',
        position: POSITIONS.UTG,
        hand: ['As', 'Ah'],
        stackSize: 100,
        potOdds: 0.1
      },
      ACTIONS.FOLD
    );

    if (violationResult.passed) {
      throw new Error('Expected violation for folding AA preflop, but got passed');
    }

    if (violationResult.violations.length === 0) {
      throw new Error('Expected violations array to be non-empty');
    }

    console.assert(
      !violationResult.passed,
      'Should detect strategic violations: ' + 
      JSON.stringify(violationResult, null, 2)
    );

    console.assert(
      violationResult.violations.length > 0,
      'Should report specific violations: ' + 
      JSON.stringify(violationResult.violations, null, 2)
    );

    // Log the actual results for debugging
    console.log('Violation test results:', {
      passed: violationResult.passed,
      violations: violationResult.violations,
      score: violationResult.score,
      totalWeight: violationResult.totalWeight
    });

    console.log('\n✅ All strategy verifier tests passed successfully!');
    
    return {
      success: true,
      message: 'Strategy verification system validated successfully'
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

testStrategyVerifier().catch(console.error);