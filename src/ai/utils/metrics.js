import * as tf from '@tensorflow/tfjs';
import { ACTIONS } from './constants.js';

class ModelMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.predictions = [];
    this.trueLabels = [];
    this.losses = [];
    this.accuracies = [];
    this.streetMetrics = {
      preflop: { correct: 0, total: 0 },
      flop: { correct: 0, total: 0 },
      turn: { correct: 0, total: 0 },
      river: { correct: 0, total: 0 }
    };
    this.positionMetrics = {};
    this.betSizingErrors = [];
    this.handStrengthCorrelation = [];
  }

  update(predictions, labels) {
    // Convert tensors to arrays for storage
    const predArray = predictions.arraySync();
    const labelArray = labels.arraySync();
    
    this.predictions.push(...predArray);
    this.trueLabels.push(...labelArray);
    
    // Calculate accuracy
    const accuracy = this.calculateAccuracy(predArray, labelArray);
    this.accuracies.push(accuracy);
  }

  calculateAccuracy(predictions, labels) {
    let correct = 0;
    predictions.forEach((pred, i) => {
      const predAction = pred.indexOf(Math.max(...pred));
      const trueAction = labels[i].indexOf(Math.max(...labels[i]));
      if (predAction === trueAction) correct++;
    });
    return correct / predictions.length;
  }

  updateStreetAccuracy(street, predicted, actual) {
    if (!this.streetMetrics[street]) return;
    this.streetMetrics[street].total++;
    if (predicted === actual) {
      this.streetMetrics[street].correct++;
    }
  }

  updatePositionMetrics(position, predicted, actual) {
    if (!this.positionMetrics[position]) {
      this.positionMetrics[position] = { correct: 0, total: 0 };
    }
    this.positionMetrics[position].total++;
    if (predicted === actual) {
      this.positionMetrics[position].correct++;
    }
  }

  updateBetSizing(predictedSize, actualSize, potSize) {
    const relativeError = Math.abs(predictedSize - actualSize) / potSize;
    this.betSizingErrors.push(relativeError);
  }

  updateHandStrength(handStrength, action) {
    this.handStrengthCorrelation.push({
      strength: handStrength,
      action: action
    });
  }

  getStreetAccuracies() {
    const accuracies = {};
    for (const [street, data] of Object.entries(this.streetMetrics)) {
      accuracies[street] = data.total > 0 ? 
        data.correct / data.total : 0;
    }
    return accuracies;
  }

  getPositionAccuracies() {
    const accuracies = {};
    for (const [position, data] of Object.entries(this.positionMetrics)) {
      accuracies[position] = data.total > 0 ? 
        data.correct / data.total : 0;
    }
    return accuracies;
  }

  getBetSizingMetrics() {
    if (this.betSizingErrors.length === 0) {
      return { meanError: 0, maxError: 0, minError: 0 };
    }
    return {
      meanError: this.betSizingErrors.reduce((a, b) => a + b, 0) / this.betSizingErrors.length,
      maxError: Math.max(...this.betSizingErrors),
      minError: Math.min(...this.betSizingErrors)
    };
  }

  getHandStrengthCorrelation() {
    if (this.handStrengthCorrelation.length === 0) {
      return 0;
    }

    const actionValues = {
      [ACTIONS.FOLD]: 0,
      [ACTIONS.CHECK]: 1,
      [ACTIONS.CALL]: 2,
      [ACTIONS.RAISE]: 3
    };

    const strengths = this.handStrengthCorrelation.map(entry => entry.strength);
    const actions = this.handStrengthCorrelation.map(entry => actionValues[entry.action]);

    const strengthMean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    const actionMean = actions.reduce((a, b) => a + b, 0) / actions.length;

    let numerator = 0;
    let strengthDenominator = 0;
    let actionDenominator = 0;

    for (let i = 0; i < strengths.length; i++) {
      const strengthDiff = strengths[i] - strengthMean;
      const actionDiff = actions[i] - actionMean;
      
      numerator += strengthDiff * actionDiff;
      strengthDenominator += strengthDiff * strengthDiff;
      actionDenominator += actionDiff * actionDiff;
    }

    const correlation = numerator / Math.sqrt(strengthDenominator * actionDenominator);
    return isNaN(correlation) ? 0 : correlation;
  }

  getMetrics() {
    return {
      accuracy: this.accuracies.length > 0 ? 
        this.accuracies[this.accuracies.length - 1] : 0,
      streetAccuracies: this.getStreetAccuracies(),
      positionAccuracies: this.getPositionAccuracies(),
      betSizing: this.getBetSizingMetrics(),
      handStrengthCorrelation: this.getHandStrengthCorrelation()
    };
  }
}

export default ModelMetrics; 