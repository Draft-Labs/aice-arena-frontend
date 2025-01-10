import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

class ArchitectureSearch {
  constructor(options = {}) {
    this.maxLayers = options.maxLayers || 5;
    this.minUnits = options.minUnits || 32;
    this.maxUnits = options.maxUnits || 512;
    this.populationSize = options.populationSize || 10;
    this.generations = options.generations || 5;
    this.mutationRate = options.mutationRate || 0.1;
    this.crossoverRate = options.crossoverRate || 0.7;
  }

  /**
   * Generate random architecture configuration
   * @returns {Object} Architecture config
   */
  generateArchitecture() {
    const numLayers = Math.floor(Math.random() * (this.maxLayers - 1)) + 2;
    const layers = [];

    for (let i = 0; i < numLayers; i++) {
      const units = Math.pow(2, Math.floor(Math.random() * 
        (Math.log2(this.maxUnits) - Math.log2(this.minUnits)) + 
        Math.log2(this.minUnits)));
      
      layers.push({
        units,
        activation: ['relu', 'tanh', 'sigmoid'][Math.floor(Math.random() * 3)],
        dropout: Math.random() * 0.5
      });
    }

    return {
      layers,
      learningRate: Math.pow(10, -Math.random() * 4 - 2), // 1e-2 to 1e-6
      batchSize: Math.pow(2, Math.floor(Math.random() * 5 + 4)) // 16 to 256
    };
  }

  /**
   * Create model from architecture config
   * @param {Object} config - Architecture configuration
   * @returns {tf.LayersModel} TensorFlow model
   */
  createModel(config) {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      units: config.layers[0].units,
      activation: config.layers[0].activation,
      inputShape: [INPUT_SIZE]
    }));
    
    if (config.layers[0].dropout > 0) {
      model.add(tf.layers.dropout({ rate: config.layers[0].dropout }));
    }

    // Hidden layers
    for (let i = 1; i < config.layers.length - 1; i++) {
      const layer = config.layers[i];
      model.add(tf.layers.dense({
        units: layer.units,
        activation: layer.activation
      }));
      
      if (layer.dropout > 0) {
        model.add(tf.layers.dropout({ rate: layer.dropout }));
      }
    }

    // Output layer
    model.add(tf.layers.dense({
      units: OUTPUT_SIZE,
      activation: 'softmax'
    }));

    return model;
  }

  /**
   * Evaluate architecture performance
   * @param {Object} config - Architecture configuration
   * @param {Array} trainData - Training data
   * @param {Array} validData - Validation data
   * @returns {number} Performance score
   */
  async evaluateArchitecture(config, trainData, validData) {
    const model = this.createModel(config);
    
    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    // Convert data to tensors and keep references for cleanup
    const xTrain = tf.tensor(trainData.x);
    const yTrain = tf.tensor(trainData.y);
    const xValid = tf.tensor(validData.x);
    const yValid = tf.tensor(validData.y);

    try {
      // Quick training to evaluate architecture
      const history = await model.fit(xTrain, yTrain, {
        epochs: 5,
        batchSize: config.batchSize,
        validationData: [xValid, yValid],
        verbose: 0
      });
      
      // Get final validation accuracy
      const valAccuracy = history.history.val_acc ? 
        history.history.val_acc[history.history.val_acc.length - 1] :
        history.history.val_accuracy[history.history.val_accuracy.length - 1];

      return valAccuracy || 0;
    } finally {
      // Cleanup tensors
      tf.dispose([xTrain, yTrain, xValid, yValid, model]);
    }
  }

  /**
   * Run architecture search
   * @param {Array} trainData - Training data
   * @param {Array} validData - Validation data
   * @returns {Object} Best architecture configuration
   */
  async search(trainData, validData) {
    let population = [];
    let bestConfig = null;
    
    try {
      // Initialize population
      population = Array(this.populationSize)
        .fill(null)
        .map(() => ({
          config: this.generateArchitecture(),
          score: 0
        }));

      for (let gen = 0; gen < this.generations; gen++) {
        console.log(`Generation ${gen + 1}/${this.generations}`);

        // Evaluate population
        for (let i = 0; i < population.length; i++) {
          population[i].score = await this.evaluateArchitecture(
            population[i].config,
            trainData,
            validData
          );
        }

        // Sort by score
        population.sort((a, b) => b.score - a.score);
        console.log(`Best score: ${population[0].score}`);

        if (gen === this.generations - 1) {
          bestConfig = {...population[0].config};  // Deep copy
          break;
        }

        // Create next generation
        const nextGen = [population[0]];  // Keep best

        while (nextGen.length < this.populationSize) {
          if (Math.random() < this.crossoverRate) {
            // Crossover
            const parent1 = this.select(population);
            const parent2 = this.select(population);
            const child = this.crossover(parent1.config, parent2.config);
            
            if (Math.random() < this.mutationRate) {
              this.mutate(child);
            }
            
            nextGen.push({ config: child, score: 0 });
          } else {
            // New random architecture
            nextGen.push({
              config: this.generateArchitecture(),
              score: 0
            });
          }
        }

        population = nextGen;
      }

      return bestConfig;
    } finally {
      // Ensure models in population are disposed
      for (const individual of population) {
        if (individual.model) {
          individual.model.dispose();
        }
      }
    }
  }

  // Helper methods for genetic algorithm
  select(population) {
    // Tournament selection
    const k = 3;
    let best = population[Math.floor(Math.random() * population.length)];
    
    for (let i = 1; i < k; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (candidate.score > best.score) {
        best = candidate;
      }
    }
    
    return best;
  }

  crossover(config1, config2) {
    // Layer-wise crossover
    const child = {
      layers: [],
      learningRate: Math.random() < 0.5 ? config1.learningRate : config2.learningRate,
      batchSize: Math.random() < 0.5 ? config1.batchSize : config2.batchSize
    };

    const len = Math.min(config1.layers.length, config2.layers.length);
    for (let i = 0; i < len; i++) {
      child.layers.push(Math.random() < 0.5 ? config1.layers[i] : config2.layers[i]);
    }

    return child;
  }

  mutate(config) {
    // Random mutation
    if (Math.random() < 0.3) {
      config.learningRate *= Math.exp(Math.random() * 2 - 1);
    }
    if (Math.random() < 0.3) {
      config.batchSize *= Math.pow(2, Math.floor(Math.random() * 3) - 1);
    }
    
    for (const layer of config.layers) {
      if (Math.random() < 0.3) {
        layer.units = Math.pow(2, Math.floor(Math.log2(layer.units) + Math.random() * 2 - 1));
      }
      if (Math.random() < 0.3) {
        layer.activation = ['relu', 'tanh', 'sigmoid'][Math.floor(Math.random() * 3)];
      }
      if (Math.random() < 0.3) {
        layer.dropout = Math.min(0.5, Math.max(0, layer.dropout + Math.random() * 0.2 - 0.1));
      }
    }
  }
}

export default ArchitectureSearch; 