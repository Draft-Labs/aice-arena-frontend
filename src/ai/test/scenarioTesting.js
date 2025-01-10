import * as tf from '@tensorflow/tfjs';
import { ACTIONS, POSITIONS } from '../utils/constants.js';
import { convertHand } from '../utils/cardConverter.js';

class ScenarioTesting {
  constructor(model) {
    this.model = model;
    this.scenarios = this.defineScenarios();
  }

  defineScenarios() {
    return {
      // Preflop scenarios
      preflop: [
        {
          name: 'Premium Pairs',
          hands: ['As Ah', 'Ks Kh', 'Qs Qh'],
          position: POSITIONS.BTN,
          expectedActions: [ACTIONS.RAISE],
          stackSize: 100,
          potSize: 1.5
        },
        {
          name: 'Small Pocket Pairs',
          hands: ['2s 2h', '3s 3h', '4s 4h'],
          position: POSITIONS.UTG,
          expectedActions: [ACTIONS.FOLD, ACTIONS.CALL],
          stackSize: 100,
          potSize: 1.5
        }
      ],
      
      // Flop scenarios
      flop: [
        {
          name: 'Set on Wet Board',
          hands: ['Ah As'],
          community: ['Ad Kh Qh'],
          position: POSITIONS.BB,
          expectedActions: [ACTIONS.RAISE],
          stackSize: 80,
          potSize: 12
        },
        {
          name: 'Draw Heavy Board',
          hands: ['Jh Th'],
          community: ['9h 8d 2h'],
          position: POSITIONS.CO,
          expectedActions: [ACTIONS.CALL, ACTIONS.RAISE],
          stackSize: 60,
          potSize: 15
        }
      ],
      
      // Turn scenarios
      turn: [
        {
          name: 'Flush Draw + Pair',
          hands: ['Ah 7h'],
          community: ['Kh 2h 9c 3d'],
          position: POSITIONS.BTN,
          expectedActions: [ACTIONS.CALL, ACTIONS.RAISE],
          stackSize: 50,
          potSize: 30
        }
      ],
      
      // River scenarios
      river: [
        {
          name: 'Value Betting Nuts',
          hands: ['Ah Kh'],
          community: ['Qh Jh Th 9h 2c'],
          position: POSITIONS.CO,
          expectedActions: [ACTIONS.RAISE],
          stackSize: 100,
          potSize: 60
        }
      ]
    };
  }

  async testScenario(scenario) {
    const results = [];
    
    // Handle both single hands and arrays of hands
    const handsToTest = Array.isArray(scenario.hands) ? 
      scenario.hands : 
      [scenario.hand || scenario.hands]; // fallback to single hand
    
    // Test each hand in the scenario
    for (const hand of handsToTest) {
      if (!hand) {
        console.warn('Invalid hand in scenario:', scenario.name);
        continue;
      }

      try {
        // Create input tensor outside of tidy
        const input = await this.createInput({
          holeCards: convertHand(hand),
          communityCards: scenario.community ? convertHand(scenario.community) : [],
          position: scenario.position,
          stackSize: scenario.stackSize,
          potSize: scenario.potSize
        });

        // Use tidy only for the prediction
        const prediction = tf.tidy(() => {
          const pred = this.model.predict(input);
          return pred.arraySync()[0];
        });

        // Clean up input tensor
        input.dispose();
        
        // Get predicted action
        const predictedAction = this.getPredictedAction(prediction);
        
        // Check if prediction matches expected actions
        const isCorrect = scenario.expectedActions.includes(predictedAction);

        results.push({
          hand,
          predictedAction,
          confidence: prediction[predictedAction],
          isCorrect,
          prediction
        });
      } catch (error) {
        console.error(`Error processing hand ${hand} in scenario ${scenario.name}:`, error);
      }
    }

    return results;
  }

  getPredictedAction(prediction) {
    return prediction.indexOf(Math.max(...prediction));
  }

  async createInput({ holeCards, communityCards, position, stackSize, potSize }) {
    // Create input tensor based on your model's expected format
    const input = new Float32Array(373); // Your input size
    
    // Encode cards
    holeCards.forEach((card, i) => {
      input[i] = card;
    });
    
    communityCards.forEach((card, i) => {
      input[i + 104] = card;
    });
    
    // Encode position
    input[364 + position] = 1;
    
    // Encode stack and pot sizes
    input[371] = stackSize / 100; // Normalize
    input[372] = potSize / 100;  // Normalize
    
    return tf.tensor2d([Array.from(input)]);
  }

  async runAllScenarios() {
    const results = {
      preflop: [],
      flop: [],
      turn: [],
      river: []
    };

    for (const [street, scenarios] of Object.entries(this.scenarios)) {
      for (const scenario of scenarios) {
        const scenarioResults = await this.testScenario(scenario);
        results[street].push({
          name: scenario.name,
          results: scenarioResults
        });
      }
    }

    return results;
  }

  calculateMetrics(results) {
    const metrics = {
      overall: { correct: 0, total: 0 },
      byStreet: {},
      byScenarioType: {}
    };

    for (const [street, scenarios] of Object.entries(results)) {
      metrics.byStreet[street] = { correct: 0, total: 0 };
      
      scenarios.forEach(scenario => {
        scenario.results.forEach(result => {
          // Update overall metrics
          metrics.overall.total++;
          if (result.isCorrect) metrics.overall.correct++;
          
          // Update street-specific metrics
          metrics.byStreet[street].total++;
          if (result.isCorrect) metrics.byStreet[street].correct++;
          
          // Update scenario-type metrics
          if (!metrics.byScenarioType[scenario.name]) {
            metrics.byScenarioType[scenario.name] = { correct: 0, total: 0 };
          }
          metrics.byScenarioType[scenario.name].total++;
          if (result.isCorrect) metrics.byScenarioType[scenario.name].correct++;
        });
      });
    }

    // Calculate percentages
    for (const category of Object.values(metrics)) {
      if (category.total > 0) {
        category.accuracy = (category.correct / category.total * 100).toFixed(2) + '%';
      }
    }

    return metrics;
  }
}

export default ScenarioTesting; 