import * as tf from '@tensorflow/tfjs-node';
import PokerTrainer from './trainer';
import PokerModel from '../models/pokerModel';
import { ACTIONS } from '../utils/constants';
import LRScheduler from '../utils/lrScheduler';
import BatchSizeScheduler from '../utils/batchSizeScheduler';

class TrainingPipeline {
  constructor(options = {}) {
    // Ensure backend is initialized
    tf.engine().startScope();
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

    // Add batch size scheduler
    this.batchScheduler = new BatchSizeScheduler({
      initialBatchSize: options.batchSize || 32,
      minBatchSize: options.minBatchSize || 16,
      maxBatchSize: options.maxBatchSize || 256,
      growthFactor: options.batchGrowthFactor || 1.5,
      memoryThreshold: options.memoryThreshold || 0.8
    });

    // Training state
    this.state = {
      currentEpoch: 0,
      bestLoss: Infinity,
      bestMetrics: null,
      learningRate: options.learningRate || 0.0002,
      currentBatchSize: options.batchSize || 32,
      stepsWithoutImprovement: 0,
      checkpoints: [],
      history: {
        loss: [],
        accuracy: [],
        valLoss: [],
        valAccuracy: [],
        learningRates: [],
        memoryUsage: [],
        batchSizes: []
      }
    };

    // Add scheduler initialization
    this.scheduler = new LRScheduler(options.learningRate || 0.0002, {
      schedule: options.schedule,
      decayRate: options.decayRate,
      minLR: options.minLR,
      warmupSteps: options.warmupSteps
    });
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
      console.log('Starting data pipeline verification...');
      
      // Test data loading
      console.log('Fetching test batch...');
      const batchIterator = this.trainer.dataLoader.generateBatches(this.trainer.dataFetcher);
      const { value: tensors } = await batchIterator.next();
      
      console.log('Received batch:', {
        hasTensors: !!tensors,
        xs: tensors?.xs?.shape,
        ys: tensors?.ys?.shape
      });

      // Verify tensors
      if (!tensors || !tensors.xs || !tensors.ys) {
        throw new Error('Invalid tensors received');
      }

      const { xs, ys } = tensors;
      console.log('Tensor info:', {
        xs: {
          shape: xs.shape,
          dtype: xs.dtype,
          isValid: xs instanceof tf.Tensor
        },
        ys: {
          shape: ys.shape,
          dtype: ys.dtype,
          isValid: ys instanceof tf.Tensor
        }
      });

      console.log('Data pipeline verification:', {
        inputShape: xs.shape,
        outputShape: ys.shape,
        memoryUsage: tf.memory()
      });

      // Clean up
      tf.dispose([xs, ys]);
      
      return true;
    } catch (error) {
      console.error('Data pipeline verification failed:', {
        error,
        stack: error.stack,
        memoryState: tf.memory()
      });
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

    // Skip actual file saving during tests or Node environment
    if (process.env.NODE_ENV !== 'test' && typeof window !== 'undefined') {
      try {
        // In browser environment, use indexeddb
        await this.model.save(`indexeddb://${this.config.checkpointPath}-${tag}`);
      } catch (error) {
        // In Node environment or if indexeddb fails, use local file system
        const localPath = `file://${this.config.checkpointPath}-${tag}`;
        await this.model.save(localPath);
      }
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
    try {
      // Update learning rate each step
      console.log('\nTraining step:', {
        currentEpoch: this.state.currentEpoch,
        currentLR: this.state.learningRate
      });
      
      // Use a step counter instead of epoch
      if (!this.state.step) {
        this.state.step = 0;
      }
      this.state.step++;
      
      const newLR = this.scheduler.update(this.state.step);
      console.log('LR Update:', {
        previous: this.state.learningRate,
        new: newLR,
        step: this.state.step
      });

      try {
        if (this.model.model && this.model.model.optimizer) {
          // Update optimizer's learning rate directly if setLearningRate fails
          if (!(await this.model.setLearningRate(newLR))) {
            this.model.model.optimizer.learningRate = newLR;
          }
          // Update state
          this.state.learningRate = newLR;
          console.log('Optimizer updated:', {
            optimizerLR: this.model.model.optimizer.learningRate,
            stateLR: this.state.learningRate
          });
        }
      } catch (error) {
        console.warn('Failed to update learning rate:', error);
      }
      
      // Ensure model is built
      if (!this.model.model) {
        await this.model.buildModel();
      }
      
      const { xs, ys } = batch;
      let metrics;
      
      // Ensure tensors are on the correct backend
      const xsTensor = tf.tensor(await xs.array(), xs.shape);
      const ysTensor = tf.tensor(await ys.array(), ys.shape);
      
      try {
        metrics = tf.tidy(() => {
          // Forward pass needs to be inside the gradient tape
          const f = () => {
            const predictions = this.model.predict(xsTensor);
            return tf.losses.softmaxCrossEntropy(ysTensor, predictions);
          };
          
          // Calculate gradients with respect to model variables
          const { value, grads } = tf.variableGrads(f);
          
          // Calculate accuracy (outside gradient calculation)
          const predictions = this.model.predict(xsTensor);
          const predIndices = predictions.argMax(-1);
          const labelIndices = ysTensor.argMax(-1);
          const correctPredictions = predIndices.equal(labelIndices);
          const accuracy = correctPredictions.mean();
          
          // Apply gradients with optimizer
          const optimizer = this.model.model.optimizer;
          const vars = this.model.model.trainableWeights;
          
          // Apply gradients with momentum
          const gradAndVars = vars.map(v => ({
            name: v.name,
            tensor: grads[v.val.id] || null
          })).filter(g => g.tensor !== null);

          optimizer.applyGradients(gradAndVars);
          
          return {
            loss: value.dataSync()[0],
            accuracy: accuracy.dataSync()[0]
          };
        });
      } finally {
        // Clean up tensors
        tf.dispose([xsTensor, ysTensor]);
      }
      
      // Update batch size based on metrics
      const newBatchSize = this.batchScheduler.update({
        loss: metrics.loss,
        memoryUsage: tf.memory()
      });
      
      this.state.currentBatchSize = newBatchSize;
      this.state.history.batchSizes.push(newBatchSize);

      return metrics;
    } catch (error) {
      console.error('Training step failed:', error);
      throw error;
    }
  }

  // Add gradient accumulation for larger effective batch size
  async accumulateGradients(numBatches = 4) {
    let totalLoss = 0;
    let totalAccuracy = 0;
    let batchCount = 0;
    
    // Process each batch
    for (let i = 0; i < numBatches; i++) {
      const batch = await this.trainer.dataLoader.generateBatches(this.trainer.dataFetcher).next();
      
      // Validate batch
      if (!batch.value || !batch.value.xs || !batch.value.ys) {
        console.warn(`Skipping invalid batch ${i}`);
        continue;
      }
      
      // Train on batch
      const { loss, accuracy } = await this.trainStep(batch.value);
      
      if (loss !== undefined && accuracy !== undefined) {
        totalLoss += loss;
        totalAccuracy += accuracy;
        batchCount++;
      }
    }
    
    // Return averaged metrics
    if (batchCount === 0) {
      throw new Error('No valid batches processed');
    }
    
    return {
      loss: totalLoss / batchCount,
      accuracy: totalAccuracy / batchCount
    };
  }
}

export default TrainingPipeline; 