import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel';
import PokerDataLoader from '../training/dataLoader';
import { verifyTensorCleanup } from '../test/testUtils';

async function trainSmallScale() {
  console.log('Starting small-scale training...');

  const model = new PokerModel();
  const dataLoader = new PokerDataLoader({
    batchSize: 32,
    validationSplit: 0.2
  });

  try {
    // Initialize model
    await model.buildModel();
    console.log('Model initialized');

    // Load small dataset
    await dataLoader.loadData(1000); // Start with 1000 hands
    console.log('Data loaded');

    // Training configuration
    const trainConfig = {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
        }
      }
    };

    // Train model
    const history = await model.train(dataLoader.getTrainingData(), trainConfig);
    
    // Evaluate model
    const evalResult = await model.evaluate(dataLoader.getValidationData());
    console.log('Evaluation results:', {
      loss: evalResult[0].toFixed(4),
      accuracy: evalResult[1].toFixed(4)
    });

    return history;

  } catch (error) {
    console.error('Training error:', error);
    throw error;
  } finally {
    // Cleanup
    model.dispose();
    dataLoader.dispose();
  }
}

// Run training
verifyTensorCleanup(() => trainSmallScale())
  .then(history => console.log('Training completed'))
  .catch(console.error); 