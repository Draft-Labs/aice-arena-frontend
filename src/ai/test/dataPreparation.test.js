import * as tf from '@tensorflow/tfjs';
import PokerDataGenerator from '../data/dataGenerator.js';

async function testDataPreparation() {
  console.log('\n=== Starting Data Preparation Test ===\n');
  
  try {
    const generator = new PokerDataGenerator(100);
    const dataset = generator.generateDataset();
    
    // 1. Basic Dataset Validation
    console.log('1. Dataset Structure:');
    console.log(`- Total examples generated: ${dataset.length}`);
    console.log(`- Input dimensions: ${dataset[0].input.length}`);
    console.log(`- Output dimensions: ${dataset[0].output.length}`);
    
    if (dataset[0].input.length !== 373) {
      throw new Error(`Invalid input dimension: ${dataset[0].input.length}, expected 373`);
    }
    if (dataset[0].output.length !== 4) {
      throw new Error(`Invalid output dimension: ${dataset[0].output.length}, expected 4`);
    }

    // 2. Card Encoding Check
    console.log('\n2. Card Distribution:');
    const cardCounts = new Array(52).fill(0);
    let totalCards = 0;
    
    dataset.forEach(example => {
      // Count hole cards (0-103)
      for (let i = 0; i < 104; i += 2) {
        if (example.input[i] === 1) {
          cardCounts[Math.floor(i/2)]++;
          totalCards++;
        }
      }
      // Count community cards (104-363)
      for (let i = 104; i < 364; i++) {
        if (example.input[i] === 1) {
          cardCounts[Math.floor((i-104)/7)]++;
          totalCards++;
        }
      }
    });
    
    console.log(`- Total cards used: ${totalCards}`);
    console.log(`- Average cards per example: ${(totalCards/dataset.length).toFixed(2)}`);
    console.log(`- Cards appearing more than once: ${cardCounts.filter(c => c > 1).length}`);

    // 3. Position Distribution
    console.log('\n3. Position Distribution:');
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
    const positionCounts = new Array(6).fill(0);
    
    dataset.forEach(example => {
      for (let i = 364; i < 370; i++) {
        if (example.input[i] === 1) positionCounts[i-364]++;
      }
    });
    
    positions.forEach((pos, i) => {
      console.log(`- ${pos}: ${(positionCounts[i]/dataset.length*100).toFixed(1)}%`);
    });

    // 4. Action Distribution
    console.log('\n4. Action Distribution:');
    const actions = ['Fold', 'Check', 'Call', 'Raise'];
    const actionCounts = new Array(4).fill(0);
    
    dataset.forEach(example => {
      const actionIndex = example.output.indexOf(1);
      if (actionIndex !== -1) actionCounts[actionIndex]++;
    });
    
    actions.forEach((action, i) => {
      console.log(`- ${action}: ${(actionCounts[i]/dataset.length*100).toFixed(1)}%`);
    });

    // 5. Value Range Check
    console.log('\n5. Value Statistics:');
    const xs = tf.tensor2d(dataset.map(d => d.input));
    const ys = tf.tensor2d(dataset.map(d => d.output));
    
    const stats = {
      min: tf.min(xs).dataSync()[0],
      max: tf.max(xs).dataSync()[0],
      mean: tf.mean(xs).dataSync()[0]
    };
    
    console.log('Input ranges:', stats);
    
    if (stats.min < 0 || stats.max > 1) {
      throw new Error(`Values out of range [0,1]: min=${stats.min}, max=${stats.max}`);
    }

    // Cleanup
    tf.dispose([xs, ys]);
    
    console.log('\n=== Data Preparation Test Passed ===\n');
    return { success: true, stats };

  } catch (error) {
    console.error('\n=== Data Preparation Test Failed ===');
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Add main execution block
(async () => {
  try {
    const result = await testDataPreparation();
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})();

export default testDataPreparation;