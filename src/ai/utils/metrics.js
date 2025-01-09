import * as tf from '@tensorflow/tfjs';
import { ACTIONS } from './constants';

class ModelMetrics {
  constructor() {
    this.reset();
  }

  // Reset all metrics
  reset() {
    this.predictions = [];
    this.trueLabels = [];
    this.losses = [];
    this.accuracies = [];
  }

  // Update metrics with new batch
  update(predictions, labels) {
    // Convert tensors to arrays
    const preds = Array.from(predictions.dataSync());
    const trues = Array.from(labels.dataSync());
    
    // Reshape arrays to match batch size
    const batchSize = predictions.shape[0];
    const predArray = [];
    const trueArray = [];
    
    // Reshape flat arrays into batches
    for (let i = 0; i < batchSize; i++) {
      predArray.push(preds.slice(i * 4, (i + 1) * 4));
      trueArray.push(trues.slice(i * 4, (i + 1) * 4));
    }
    
    this.predictions.push(...predArray);
    this.trueLabels.push(...trueArray);
    
    // Calculate batch metrics
    const loss = tf.losses.softmaxCrossEntropy(labels, predictions).dataSync()[0];
    const accuracy = this.calculateAccuracy(predArray, trueArray);
    
    this.losses.push(loss);
    this.accuracies.push(accuracy);
  }

  // Calculate accuracy
  calculateAccuracy(predictions, labels) {
    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
      const predIndex = predictions[i].indexOf(Math.max(...predictions[i]));
      const trueIndex = labels[i].indexOf(Math.max(...labels[i]));
      if (predIndex === trueIndex) correct++;
    }
    return correct / predictions.length;
  }

  // Calculate precision for each action
  calculatePrecision() {
    const precision = {};
    Object.keys(ACTIONS).forEach(action => {
      const actionIndex = ACTIONS[action];
      let tp = 0, fp = 0;
      
      this.predictions.forEach((pred, i) => {
        const predAction = pred.indexOf(Math.max(...pred));
        const trueAction = this.trueLabels[i].indexOf(Math.max(...this.trueLabels[i]));
        
        if (predAction === actionIndex) {
          if (trueAction === actionIndex) tp++;
          else fp++;
        }
      });
      
      precision[action] = tp / (tp + fp) || 0;
    });
    return precision;
  }

  // Calculate recall for each action
  calculateRecall() {
    const recall = {};
    Object.keys(ACTIONS).forEach(action => {
      const actionIndex = ACTIONS[action];
      let tp = 0, fn = 0;
      
      this.trueLabels.forEach((label, i) => {
        const predAction = this.predictions[i].indexOf(Math.max(...this.predictions[i]));
        const trueAction = label.indexOf(Math.max(...label));
        
        if (trueAction === actionIndex) {
          if (predAction === actionIndex) tp++;
          else fn++;
        }
      });
      
      recall[action] = tp / (tp + fn) || 0;
    });
    return recall;
  }

  // Calculate F1 score
  calculateF1() {
    const precision = this.calculatePrecision();
    const recall = this.calculateRecall();
    
    const f1 = {};
    Object.keys(ACTIONS).forEach(action => {
      const p = precision[action];
      const r = recall[action];
      f1[action] = 2 * (p * r) / (p + r) || 0;
    });
    return f1;
  }

  // Get all metrics
  getMetrics() {
    return {
      loss: this.losses.reduce((a, b) => a + b, 0) / this.losses.length,
      accuracy: this.accuracies.reduce((a, b) => a + b, 0) / this.accuracies.length,
      precision: this.calculatePrecision(),
      recall: this.calculateRecall(),
      f1: this.calculateF1()
    };
  }
}

export default ModelMetrics; 