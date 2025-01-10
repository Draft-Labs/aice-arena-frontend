import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import TrainingPipeline from '../training/trainingPipeline';
import PokerModel from '../models/pokerModel';
import { MODEL_CONFIG } from '../utils/constants';

describe('Validation System', () => {
  let trainingPipeline;
  let model;

  beforeEach(async () => {
    // Set backend to CPU for testing
    await tf.setBackend('cpu');
    
    // Initialize model and build it
    model = new PokerModel();
    await model.buildModel();
    
    // Create synthetic validation data
    const mockData = {
      inputs: tf.ones([100, MODEL_CONFIG.INPUT_SIZE]),
      labels: tf.ones([100, MODEL_CONFIG.OUTPUT_SIZE])
    };

    trainingPipeline = new TrainingPipeline({
      model,
      batchSize: 32,
      epochs: 10,
      validationSplit: 0.2,
      learningRate: 0.001
    });

    // Mock the trainer's getValidationData method
    vi.spyOn(trainingPipeline.trainer, 'getValidationData').mockResolvedValue(mockData);
  });

  afterEach(() => {
    // Clean up tensors after each test
    tf.disposeVariables();
    model = null;
    trainingPipeline = null;
  });

  it('should initialize validation components', () => {
    expect(trainingPipeline).toBeDefined();
    expect(trainingPipeline.model).toBeDefined();
    expect(trainingPipeline.trainer).toBeDefined();
  });

  it('should perform cross-validation with synthetic data', async () => {
    const metrics = await trainingPipeline.validate();
    
    // Check if metrics are numbers and in valid ranges
    expect(metrics.loss).toBeFinite();
    expect(metrics.accuracy).toBeFinite();
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(metrics.accuracy).toBeLessThanOrEqual(1);
  });

  it('should handle validation with empty data', async () => {
    // Mock empty validation data
    vi.spyOn(trainingPipeline.trainer, 'getValidationData').mockResolvedValue({
      inputs: tf.tensor2d([], [0, MODEL_CONFIG.INPUT_SIZE]),
      labels: tf.tensor2d([], [0, MODEL_CONFIG.OUTPUT_SIZE])
    });
    
    await expect(trainingPipeline.validate()).rejects.toThrow('No validation data available');
  });

  it('should properly clean up tensors after validation', async () => {
    const initialTensors = tf.memory().numTensors;
    
    try {
      await trainingPipeline.validate();
    } catch (error) {
      // Even if validation fails, tensors should be cleaned up
      console.error('Validation error:', error);
    } finally {
      // Force cleanup of any remaining tensors
      tf.disposeVariables();
    }
    
    const finalTensors = tf.memory().numTensors;
    expect(finalTensors).toBe(initialTensors);
  });

  it('should maintain consistent metrics across validation runs', async () => {
    // Run validation twice with same data
    const firstRun = await trainingPipeline.validate();
    const secondRun = await trainingPipeline.validate();
    
    // Metrics should be similar (within reasonable epsilon)
    const epsilon = 0.1;
    expect(firstRun.loss).toBeFinite();
    expect(secondRun.loss).toBeFinite();
    expect(Math.abs(firstRun.loss - secondRun.loss)).toBeLessThan(epsilon);
    expect(Math.abs(firstRun.accuracy - secondRun.accuracy)).toBeLessThan(epsilon);
  });

  it('should handle model prediction errors gracefully', async () => {
    // Mock model to throw error during prediction
    vi.spyOn(model, 'predict').mockImplementation(() => {
      throw new Error('Prediction failed');
    });
    
    await expect(trainingPipeline.validate()).rejects.toThrow('Prediction failed');
  });

  it('should validate input shapes', async () => {
    // Create a validation data spy
    const validationSpy = vi.spyOn(trainingPipeline.trainer, 'getValidationData');
    
    try {
      await trainingPipeline.validate();
      
      // Verify validation data was called
      expect(validationSpy).toHaveBeenCalled();
      
      // Get the validation data
      const validationData = await validationSpy.mock.results[0].value;
      
      // Check input shapes
      expect(validationData.inputs.shape[1]).toBe(MODEL_CONFIG.INPUT_SIZE);
      expect(validationData.labels.shape[1]).toBe(MODEL_CONFIG.OUTPUT_SIZE);
    } finally {
      validationSpy.mockRestore();
    }
  });
}); 