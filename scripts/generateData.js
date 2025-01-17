// Import the necessary modules
import PokerDataGenerator from '../src/ai/data/dataGenerator.js';
import { promises as fs } from 'fs';

// Function to generate and save dataset
async function generateAndSaveDataset(numHands, filePath) {
  // Step 1: Instantiate the PokerDataGenerator
  const dataGenerator = new PokerDataGenerator(numHands);

  // Step 2: Generate the dataset
  const dataset = dataGenerator.generateDataset();

  // Step 3: Convert the dataset to JSON
  const jsonData = JSON.stringify(dataset, null, 2);

  // Step 4: Save the JSON to a file
  try {
    await fs.writeFile(filePath, jsonData, 'utf8');
    console.log(`Dataset saved to ${filePath}`);
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

// Usage
generateAndSaveDataset(1000, './src/ai/data/poker_dataset.json');