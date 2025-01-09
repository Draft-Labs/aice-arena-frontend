import * as tf from '@tensorflow/tfjs-node';
import PokerTrainer from './trainer';
import PokerModel from '../models/pokerModel';
import { ACTIONS } from '../utils/constants';

class TrainingPipeline {
  constructor(options = {}) {
    this.model = new PokerModel();
    this.trainer = new PokerTrainer(this.model, options);
    
    // Training configuration
    this.config = {
      initialLearningRate: options.learningRate || 0.0002,
      minLearningRate: options.minLearningRate || 0.00001,
      batchSize: options.batchSize || 32,
      maxEpochs: options.maxEpochs || 100,
      earlyStoppingPatience: options.patience || 5,
      validationFrequency: options.validationFrequency || 10,
      checkpointFrequency: options.checkpointFrequency || 5,
      checkpointPath: options.checkpointPath || 'poker-model',
      classWeights: options.classWeights || {
        [ACTIONS.FOLD]: 1.0,
        [ACTIONS.CHECK]: 1.0,
        [ACTIONS.CALL]: 1.2,
        [ACTIONS.RAISE]: 1.5
      }
    };

    // Training state
    this.state = {
      currentEpoch: 0,
      bestLoss: Infinity,
      bestMetrics: null,
      learningRate: this.config.initialLearningRate,
      stepsWithoutImprovement: 0,
      checkpoints: [],
      history: {
        loss: [],
        accuracy: [],
        valLoss: [],
        valAccuracy: [],
        learningRates: [],
        memoryUsage: []
      }
    };
  }

  async train() {
    console.log('Initializing training pipeline...');
    await this.initializeTraining();

    try {
      while (this.shouldContinueTraining()) {
        await this.runEpoch();
        await this.validateAndSave();
        this.updateLearningRate();
        this.logProgress();
      }

      console.log('Training completed');
      return this.state;

    } catch (error) {
      console.error('Training error:', error);
      await this.handleError(error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async initializeTraining() {
    // Initialize model and verify data pipeline
    await this.model.buildModel();
    await this.verifyDataPipeline();
    
    // Save initial checkpoint
    await this.saveCheckpoint('initial');
    
    console.log('Training pipeline initialized:', {
      model: 'Ready',
      data: 'Verified',
      config: this.config,
      backend: tf.getBackend()
    });
  }

  async runEpoch() {
    const epochStartTime = Date.now();
    const metrics = await this.trainer.train();
    
    // Update state
    this.state.currentEpoch++;
    this.updateHistory(metrics);
    
    // Log memory usage
    const memoryInfo = tf.memory();
    this.state.history.memoryUsage.push({
      numTensors: memoryInfo.numTensors,
      numBytes: memoryInfo.numBytes
    });
  }

  async validateAndSave() {
    if (this.state.currentEpoch % this.config.checkpointFrequency === 0) {
      await this.saveCheckpoint(`epoch-${this.state.currentEpoch}`);
    }

    if (this.state.currentEpoch % this.config.validationFrequency === 0) {
      const valMetrics = await this.validate();
      this.updateValidationMetrics(valMetrics);
    }
  }

  shouldContinueTraining() {
    // Check stopping conditions
    return (
      this.state.currentEpoch < this.config.maxEpochs &&
      this.state.stepsWithoutImprovement < this.config.earlyStoppingPatience &&
      this.state.learningRate >= this.config.minLearningRate
    );
  }

  async verifyDataPipeline() {
    try {
      // Test data loading
      const batch = await this.trainer.dataLoader.generateBatches(this.trainer.dataFetcher).next();
      
      // Verify shapes
      const { xs, ys } = batch.value;
      console.log('Data pipeline verification:', {
        inputShape: xs.shape,
        outputShape: ys.shape,
        memoryUsage: tf.memory()
      });

      // Clean up
      xs.dispose();
      ys.dispose();
      
      return true;
    } catch (error) {
      console.error('Data pipeline verification failed:', error);
      throw error;
    }
  }

  updateHistory(metrics) {
    const { loss, accuracy } = metrics;
    this.state.history.loss.push(loss);
    this.state.history.accuracy.push(accuracy);
    this.state.history.learningRates.push(this.state.learningRate);
  }

  async updateValidationMetrics(metrics) {
    const { loss, accuracy } = metrics;
    this.state.history.valLoss.push(loss);
    this.state.history.valAccuracy.push(accuracy);

    // Check for improvement
    if (loss < this.state.bestLoss) {
      this.state.bestLoss = loss;
      this.state.bestMetrics = metrics;
      this.state.stepsWithoutImprovement = 0;
      await this.saveCheckpoint('best');
    } else {
      this.state.stepsWithoutImprovement++;
    }
  }

  updateLearningRate() {
    // Implement learning rate decay
    if (this.state.stepsWithoutImprovement > 0) {
      const decay = 0.95;
      this.state.learningRate = Math.max(
        this.config.minLearningRate,
        this.state.learningRate * decay
      );
      
      // Update model's optimizer if it exists
      if (this.model.model && this.model.model.optimizer) {
        this.model.model.optimizer.learningRate = this.state.learningRate;
      }
    }
  }

  async saveCheckpoint(tag) {
    const checkpoint = {
      epoch: this.state.currentEpoch,
      metrics: {
        loss: this.state.history.loss[this.state.currentEpoch - 1],
        accuracy: this.state.history.accuracy[this.state.currentEpoch - 1]
      },
      learningRate: this.state.learningRate,
      timestamp: new Date().toISOString()
    };

    // For testing, just log the checkpoint without saving
    console.log(`Would save checkpoint: ${tag}`, checkpoint);
    this.state.checkpoints.push(checkpoint);

    // Skip actual file saving during tests
    if (process.env.NODE_ENV !== 'test') {
      await this.model.save(`indexeddb://${this.config.checkpointPath}-${tag}`);
    }
  }

  logProgress() {
    const epoch = this.state.currentEpoch;
    console.log(`Epoch ${epoch}/${this.config.maxEpochs}:`, {
      loss: this.state.history.loss[epoch - 1].toFixed(4),
      accuracy: this.state.history.accuracy[epoch - 1].toFixed(4),
      learningRate: this.state.learningRate.toFixed(6),
      memoryUsage: `${(tf.memory().numBytes / 1024 / 1024).toFixed(2)}MB`
    });
  }

  async handleError(error) {
    // Save current state for recovery
    await this.saveCheckpoint('error-recovery');
    console.error('Training error:', {
      epoch: this.state.currentEpoch,
      error: error.message,
      state: this.state
    });
  }

  async cleanup() {
    // Dispose of any remaining tensors
    tf.disposeVariables();
    this.trainer.dispose();
    console.log('Cleanup completed:', tf.memory());
  }

  async validate() {
    try {
      // Get a validation batch
      const batch = await this.trainer.dataLoader.generateBatches(this.trainer.dataFetcher).next();
      const { xs, ys } = batch.value;
      
      if (!xs || !ys) {
        console.error('Invalid validation batch:', { xs, ys });
        return { loss: NaN, accuracy: NaN };
      }

      // Calculate metrics using tf.tidy
      const metrics = tf.tidy(() => {
        const predictions = this.model.predict(xs);
        
        // Calculate loss
        const loss = tf.losses.softmaxCrossEntropy(ys, predictions).asScalar();
        
        // Calculate accuracy
        const predIndices = predictions.argMax(-1);
        const labelIndices = ys.argMax(-1);
        const correctPredictions = predIndices.equal(labelIndices);
        const accuracy = correctPredictions.mean();
        
        return {
          loss: loss.dataSync()[0],
          accuracy: accuracy.dataSync()[0]
        };
      });

      // Clean up
      xs.dispose();
      ys.dispose();
      
      return metrics;

    } catch (error) {
      console.error('Validation error:', error);
      return { loss: NaN, accuracy: NaN };
    }
  }

  // Add helper method for accuracy calculation
  calculateAccuracy(predictions, labels) {
    return tf.tidy(() => {
      const predIndices = predictions.argMax(1);
      const labelIndices = labels.argMax(1);
      
      const correct = predIndices.equal(labelIndices).sum().dataSync()[0];
      const total = labelIndices.size;
      
      return correct / total;
    });
  }

  async trainStep(batch) {
    const { xs, ys } = batch;
    
    const metrics = tf.tidy(() => {
      // Get predictions
      const predictions = this.model.predict(xs);
      
      // Calculate loss
      const loss = tf.losses.softmaxCrossEntropy(ys, predictions).asScalar();
      
      // Calculate accuracy using argMax comparison
      const predIndices = predictions.argMax(-1);  // Changed to -1 for last dimension
      const labelIndices = ys.argMax(-1);
      const correctPredictions = predIndices.equal(labelIndices);
      const accuracy = correctPredictions.mean();
      
      // Get values synchronously
      return {
        loss: loss.dataSync()[0],
        accuracy: accuracy.dataSync()[0]
      };
    });
    
    return metrics;
  }
}

export default TrainingPipeline; 