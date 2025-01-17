import * as tf from '@tensorflow/tfjs-node';
import PokerTrainer from './trainer';
import PokerModel from '../models/pokerModel';
import LRScheduler from '../utils/lrScheduler';
import BatchSizeScheduler from '../utils/batchSizeScheduler';
import PerformanceMetrics from '../utils/performanceMetrics.js';

class TrainingPipeline {
  constructor(options = {}) {
    tf.engine().startScope();
    this.model = new PokerModel();
    this.trainer = new PokerTrainer(this.model, options);

    this.config = {
      initialLearningRate: options.learningRate || 0.0002,
      minLearningRate: options.minLearningRate || 0.00001,
      batchSize: options.batchSize || 32,
      maxEpochs: options.maxEpochs || 100,
      earlyStoppingPatience: options.patience || 5,
      validationFrequency: options.validationFrequency || 10,
      checkpointFrequency: options.checkpointFrequency || 5,
      checkpointPath: options.checkpointPath || 'poker-model',
    };

    this.lrScheduler = new LRScheduler(this.config.initialLearningRate, {
      schedule: 'exponential',
      decayRate: 0.95,
      minLR: this.config.minLearningRate,
    });

    this.batchScheduler = new BatchSizeScheduler({
      initialBatchSize: this.config.batchSize,
      minBatchSize: 16,
      maxBatchSize: 256,
      growthFactor: 1.5,
    });

    this.state = {
      currentEpoch: 0,
      bestLoss: Infinity,
      learningRate: this.config.initialLearningRate,
      currentBatchSize: this.config.batchSize,
      stepsWithoutImprovement: 0,
      history: {
        loss: [],
        accuracy: [],
        valLoss: [],
        valAccuracy: [],
        learningRates: [],
        batchSizes: [],
      },
    };
  }

  async train() {
    try {
      await this.model.buildModel();
      console.log('Training pipeline initialized');

      while (this.shouldContinueTraining()) {
        const metrics = await this.trainer.trainEpoch({
          batchSize: this.state.currentBatchSize,
          learningRate: this.state.learningRate,
        });

        this.updateHistory(metrics);
        this.logProgress();

        if (this.state.currentEpoch % this.config.validationFrequency === 0) {
          const valMetrics = await this.trainer.validate();
          this.updateValidationMetrics(valMetrics);
        }

        this.updateLearningRate();
        this.updateBatchSize();
        this.state.currentEpoch++;
      }

      return this.state.history;
    } catch (error) {
      console.error('Training error:', error);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  updateHistory(metrics) {
    this.state.history.loss.push(metrics.loss);
    this.state.history.accuracy.push(metrics.accuracy);
    this.state.history.learningRates.push(this.state.learningRate);
    this.state.history.batchSizes.push(this.state.currentBatchSize);
  }

  updateValidationMetrics(metrics) {
    this.state.history.valLoss.push(metrics.loss);
    this.state.history.valAccuracy.push(metrics.accuracy);

    if (metrics.loss < this.state.bestLoss) {
      this.state.bestLoss = metrics.loss;
      this.state.stepsWithoutImprovement = 0;
    } else {
      this.state.stepsWithoutImprovement++;
    }
  }

  updateLearningRate() {
    this.state.learningRate = this.lrScheduler.update(this.state.currentEpoch);
  }

  updateBatchSize() {
    this.state.currentBatchSize = this.batchScheduler.update(this.state.history.accuracy.slice(-1)[0]);
  }

  logProgress() {
    console.log(`Epoch ${this.state.currentEpoch}/${this.config.maxEpochs}:`, {
      loss: this.state.history.loss.slice(-1)[0].toFixed(4),
      accuracy: this.state.history.accuracy.slice(-1)[0].toFixed(4),
      learningRate: this.state.learningRate.toFixed(6),
      batchSize: this.state.currentBatchSize,
    });
  }

  shouldContinueTraining() {
    return (
      this.state.currentEpoch < this.config.maxEpochs &&
      this.state.stepsWithoutImprovement < this.config.earlyStoppingPatience &&
      this.state.learningRate >= this.config.minLearningRate
    );
  }

  cleanup() {
    tf.disposeVariables();
    this.trainer.dispose();
    console.log('Cleanup completed:', tf.memory());
  }
}

export default TrainingPipeline; 