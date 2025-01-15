import * as tf from '@tensorflow/tfjs';

class PokerDataLoader {
  constructor(config = {}) {
    this.batchSize = config.batchSize || 32;
    this.validationSplit = config.validationSplit || 0.2;
    this.currentIndex = 0;
    this.data = {
      inputs: [],
      labels: []
    };
  }

  async loadData(numHands = 1000) {
    if (numHands <= 0) {
      console.warn('Invalid number of hands, using default of 1000');
      numHands = 1000;
    }

    // Generate sample training data
    for (let i = 0; i < numHands; i++) {
      const input = Array.from({length: 373}, () => Math.random());
      const label = Array.from({length: 4}, () => 0);
      label[Math.floor(Math.random() * 4)] = 1;
      
      this.data.inputs.push(input);
      this.data.labels.push(label);
    }

    // Shuffle data
    const indices = Array.from({length: numHands}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    this.data.inputs = indices.map(i => this.data.inputs[i]);
    this.data.labels = indices.map(i => this.data.labels[i]);
  }

  async nextBatch() {
    return tf.tidy(() => {
      const batchStart = this.currentIndex;
      const batchEnd = Math.min(batchStart + this.batchSize, this.data.inputs.length);
      
      const batchInputs = this.data.inputs.slice(batchStart, batchEnd);
      const batchLabels = this.data.labels.slice(batchStart, batchEnd);
      
      this.currentIndex = batchEnd % this.data.inputs.length;

      return {
        xs: tf.tensor2d(batchInputs),
        ys: tf.tensor2d(batchLabels)
      };
    });
  }

  reset() {
    this.currentIndex = 0;
  }

  dispose() {
    tf.dispose([this.data.inputs, this.data.labels]);
  }
}

export default PokerDataLoader; 