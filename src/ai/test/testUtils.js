import * as tf from '@tensorflow/tfjs-node';

export async function verifyTensorCleanup(testFn) {
  const startTensors = tf.memory().numTensors;
  
  try {
    await testFn();
  } finally {
    // Force garbage collection
    tf.disposeVariables();
  }
  
  const endTensors = tf.memory().numTensors;
  const leaked = endTensors - startTensors;
  
  console.log('Tensor cleanup verification:', {
    start: startTensors,
    end: endTensors,
    leaked
  });
  
  if (leaked !== 0) {
    throw new Error(`Memory leak detected: ${leaked} tensors leaked`);
  }
}

// Add helper for calculating metrics
export function calculateMetrics(predictions, labels) {
  return tf.tidy(() => {
    const predIndices = predictions.argMax(-1);
    const labelIndices = labels.argMax(-1);
    const correct = predIndices.equal(labelIndices);
    return {
      accuracy: correct.mean().dataSync()[0],
      predictions: predIndices.dataSync(),
      labels: labelIndices.dataSync()
    };
  });
}

// Add helper for tensor validation
export function validateTensor(tensor, shape = null, dtype = null) {
  if (!tf.isTensor(tensor)) {
    throw new Error('Not a valid tensor');
  }
  if (shape && !shape.every((dim, i) => dim === tensor.shape[i])) {
    throw new Error(`Invalid tensor shape: expected ${shape}, got ${tensor.shape}`);
  }
  if (dtype && tensor.dtype !== dtype) {
    throw new Error(`Invalid tensor dtype: expected ${dtype}, got ${tensor.dtype}`);
  }
  return true;
} 