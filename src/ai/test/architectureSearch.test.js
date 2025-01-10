import ArchitectureSearch from '../utils/architectureSearch';
import { verifyTensorCleanup } from './testUtils';
import * as tf from '@tensorflow/tfjs';

async function testArchitectureSearch() {
  await verifyTensorCleanup(async () => {
    console.log('Testing architecture search...');

    let trainXTensor, trainYTensor, validXTensor, validYTensor;
    try {
      // Create tensors
      trainXTensor = tf.randomNormal([100, 373]);
      trainYTensor = tf.randomUniform([100, 4]);
      validXTensor = tf.randomNormal([20, 373]);
      validYTensor = tf.randomUniform([20, 4]);

      const trainData = {
        x: trainXTensor.arraySync(),
        y: trainYTensor.arraySync()
      };
      const validData = {
        x: validXTensor.arraySync(),
        y: validYTensor.arraySync()
      };

      const searcher = new ArchitectureSearch({
        maxLayers: 3,
        populationSize: 4,
        generations: 2
      });

      // Test architecture generation
      console.log('\n1. Testing architecture generation...');
      const config = searcher.generateArchitecture();
      console.assert(
        config.layers.length >= 2 && config.layers.length <= 3,
        'Should generate valid number of layers'
      );
      console.assert(
        config.layers.every(l => l.units >= 32 && l.units <= 512),
        'Layer units should be within bounds'
      );
      console.log('Generated architecture:', config);

      // Test model creation
      console.log('\n2. Testing model creation...');
      const model = searcher.createModel(config);
      console.assert(
        model.layers.length >= 3,  // Including dropout layers
        'Model should have correct number of layers'
      );

      // Test architecture evaluation
      console.log('\n3. Testing architecture evaluation...');
      const score = await searcher.evaluateArchitecture(config, trainData, validData);
      console.assert(
        score >= 0 && score <= 1,
        'Evaluation score should be between 0 and 1'
      );
      console.log('Evaluation score:', score);

      // Test genetic operations
      console.log('\n4. Testing genetic operations...');
      const population = [
        { config: searcher.generateArchitecture(), score: 0.8 },
        { config: searcher.generateArchitecture(), score: 0.6 }
      ];

      // Test selection
      const selected = searcher.select(population);
      console.assert(selected.score >= 0.6, 'Should select high scoring architecture');

      // Test crossover
      const child = searcher.crossover(population[0].config, population[1].config);
      console.assert(
        child.layers.length > 0,
        'Crossover should produce valid architecture'
      );

      // Test mutation
      const beforeMutation = JSON.stringify(child);
      searcher.mutate(child);
      const afterMutation = JSON.stringify(child);
      console.assert(
        beforeMutation !== afterMutation,
        'Mutation should modify architecture'
      );

      // Test full search
      console.log('\n5. Testing full architecture search...');
      const bestConfig = await searcher.search(trainData, validData);
      console.assert(
        bestConfig && bestConfig.layers,
        'Search should return valid architecture'
      );
      console.log('Best architecture found:', bestConfig);

      console.log('\nAll architecture search tests passed!');
    } finally {
      // Cleanup tensors
      tf.dispose([trainXTensor, trainYTensor, validXTensor, validYTensor]);
    }
  });
}

testArchitectureSearch().catch(console.error); 