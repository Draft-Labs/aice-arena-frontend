# Betting DApp Frontend

A React-based frontend application for the decentralized betting platform. This application provides user interfaces for various betting games and casino features.

## AI Poker Agent

The project includes a TensorFlow.js-based AI agent for poker gameplay. The AI implementation uses real poker hand data from the IRC Poker Database for training.

### Current Progress

#### ✅ Phase 1: Environment Setup (Completed)
- TensorFlow.js integration
- Directory structure for AI components
- Basic utilities implemented
- Test environment working

#### ✅ Phase 2: Data Processing (Completed)
- Card conversion utilities (`src/ai/utils/cardConverter.js`)
  - Converts between poker notation and numeric representations (1-52)
  - Handles hand string parsing ("Ah Kd" → [1, 26])
  - Supports debugging with human-readable formats

- Data fetching system (`src/ai/data/dataFetcher.js`)
  - Parses IRC poker hand histories
  - Tracks player positions and actions
  - Maintains stack sizes and pot size
  - Records betting rounds (preflop/flop/turn/river)

- Position tracking
  - Maps players to table positions (BTN/SB/BB/EARLY/MIDDLE/LATE)
  - Tracks relative positions for each action
  - Supports different table sizes (6-max implemented)

- Action history
  - Records all player actions with amounts
  - Maintains pot size after each action
  - Tracks stack sizes throughout the hand
  - Links actions to positions and betting rounds

#### ✅ Phase 3: Hand Evaluation (Completed)
- Hand strength calculation
  - Identifies all poker hands (High Card to Royal Flush)
  - Provides numeric ranking (0-36874)
  - Includes hand type classification
- Equity calculation
  - Monte Carlo simulation
  - Win probability against random hands
  - Adjusts for known cards
- Performance optimized
  - Fast evaluation (<1ms per hand)
  - Efficient memory usage
  - Handles incomplete hands

#### ✅ Phase 4: Neural Network Input Preparation (Completed)
- Feature engineering
  - One-hot encoding for cards (52 dimensions per card)
  - Position encoding (6 dimensions)
  - Stack/pot normalization (0-1 range)
  - Pot odds calculation
  - Action history encoding
- Input validation
  - Dimension verification (373 total dimensions)
  - Value range checks (0-1)
  - Card slot verification
  - Position bit validation
- Edge cases handled
  - Invalid cards (0, 53+)
  - Invalid positions (-1, 6+)
  - Empty hands
  - Oversized values
  - Partial community cards
- Test coverage
  - Individual component tests
  - Full state transformation tests
  - Edge case validation
  - Normalization verification

#### ✅ Phase 5: Model Architecture (Completed)
- ✅ Network Architecture
  - Input layer (373 dimensions)
  - Residual Network with Skip Connections
    - First Block: Dense(256) → BatchNorm → ReLU
    - ResBlock1: Dense(256) → BatchNorm → ReLU → Dropout(0.1)
    - ResBlock2: Dense(256) → BatchNorm → ReLU → Dropout(0.1)
  - Output layer (4 actions)
  - Total Parameters: 231,428

- ✅ Training Configuration
  - Optimizer: Adam with gradient clipping
    - Learning rate: 0.0002
    - Beta1: 0.9, Beta2: 0.999
    - Gradient clipnorm: 1.0
    - Value clipvalue: 0.5
  - Loss: Categorical Crossentropy
  - Metrics: Accuracy, Precision, Recall, F1

- ✅ Model Performance
  ```
  Overall Metrics:
  - Loss: 1.3019
  - Accuracy: 43.75%

  Per-Action Performance:
  FOLD:  F1: 0.6846 (Precision: 0.7391, Recall: 0.6375)
  CHECK: F1: 0.2989 (Precision: 0.2766, Recall: 0.3250)
  CALL:  F1: 0.2174 (Precision: 0.8333, Recall: 0.1250)
  RAISE: F1: 0.4711 (Precision: 0.3655, Recall: 0.6625)
  ```

#### 🔄 Phase 6: Training Pipeline (In Progress)
- ⏳ Data Loading System
  - Batch processing
  - Memory management
  - Data augmentation
- ⏳ Training Loop
  - Early stopping
  - Model checkpointing
  - Validation monitoring
- ⏳ Performance Optimization
  - TensorFlow.js Node backend
  - GPU acceleration
  - Memory optimization

#### ⏳ Phase 7: Game Integration (Not Started)
- Model Serving
  - Real-time inference
  - State management
  - Action validation
- Performance Optimization
  - Batch prediction
  - Caching strategies
  - Load balancing
- UI/UX Integration
  - Action visualization
  - Confidence display
  - Decision explanation

### Project Structure
```
src/ai/
├── models/
│   └── pokerModel.js        # Neural network with residual connections
├── utils/
│   ├── constants.js         # Model configuration
│   ├── metrics.js          # Performance tracking
│   ├── callbacks.js        # Training callbacks
│   └── inputTransformer.js  # State preprocessing
├── test/
│   ├── modelTest.js        # Architecture testing
│   └── inputTransformer.test.js  # Input validation
└── training/               # Training pipeline (WIP)
```

### Next Steps
1. Training Pipeline Development
   - Implement data loading system
   - Add model checkpointing
   - Optimize memory usage

2. Performance Optimization
   - Install TensorFlow.js Node backend
   - Enable GPU acceleration
   - Implement batch processing

3. Game Integration
   - Design inference API
   - Add state management
   - Implement action validation

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## AI Poker Agent

### Model Architecture

The poker agent uses a deep neural network implemented in TensorFlow.js with the following architecture:

```
Input Layer (373 dimensions)
├── Card encoding (364)
│   ├── Hole cards (2 × 52)
│   └── Community cards (5 × 52)
├── Position encoding (6)
├── Stack size (1)
├── Pot size (1)
└── Pot odds (1)

Hidden Layers
├── Dense Layer 1 (512 units)
│   ├── Batch Normalization
│   └── ReLU Activation
├── Dense Layer 2 (256 units)
│   ├── Batch Normalization
│   ├── ReLU Activation
│   └── Dropout (0.3)
└── Dense Layer 3 (128 units)
    ├── Batch Normalization
    ├── ReLU Activation
    └── Dropout (0.3)

Output Layer (4 dimensions)
└── Softmax Activation
    ├── FOLD  (0)
    ├── CHECK (1)
    ├── CALL  (2)
    └── RAISE (3)
```

### Training Configuration

- **Optimizer**: Adam
  - Initial learning rate: 0.001
  - Beta1: 0.9
  - Beta2: 0.999
  - Learning rate decay: 1e-5

- **Loss Function**: Categorical Crossentropy
  - Suitable for multi-class classification
  - Optimizes probability distribution

- **Metrics**:
  - Accuracy
  - Validation loss
  - Validation accuracy

### Forward Pass

1. **Input Processing**
   - Cards are one-hot encoded (52 dimensions per card)
   - Position is one-hot encoded (6 dimensions)
   - Stack and pot values are normalized to [0,1]

2. **Hidden Layer Processing**
   - Each dense layer applies linear transformation
   - Batch normalization stabilizes training
   - ReLU activation adds non-linearity
   - Dropout prevents overfitting

3. **Output Generation**
   - Softmax produces action probabilities
   - Values sum to 1.0
   - Highest probability indicates recommended action

### Memory Management

- Tensor disposal after predictions
- Batch processing for efficiency
- Automatic garbage collection
- Memory-efficient forward pass

### Model Usage

```javascript
// Create and build model
const model = new PokerModel();
model.buildModel();

// Make prediction
const gameState = {
  holeCards: ['Ah', 'Kh'],
  communityCards: ['Qh', 'Jh', 'Th'],
  position: POSITIONS.BTN,
  stack: 1000,
  potSize: 100,
  betAmount: 20
};

// Transform state to input tensor
const input = transformer.transformState(gameState);

// Get action probabilities
const probs = await model.predict(input);
// Example output: [0.1, 0.2, 0.3, 0.4]

// Get best action
const action = await model.getBestAction(input);
// Example output: 3 (RAISE)
```

### Performance

- Forward pass: <1ms
- Memory usage: ~350KB
- Parameters: 356,228
  - Input → Dense1: 191,488
  - Dense1 → Dense2: 131,328
  - Dense2 → Dense3: 32,896
  - Dense3 → Output: 516

# Poker AI Training Pipeline

## Overview
A TensorFlow.js-based training pipeline for a poker AI agent.

## Project Structure
```
betting-dapp-frontend/
├── src/
│   ├── ai/
│   │   ├── models/
│   │   │   └── pokerModel.js
│   │   ├── training/
│   │   │   ├── trainingPipeline.js
│   │   │   ├── trainer.js
│   │   │   └── dataLoader.js
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── metrics.js
│   │   │   └── callbacks.js
│   │   └── test/
│   │       └── trainingPipeline.test.js
```

## Development Phases

### Phase 1: ✅ Basic Infrastructure
- [x] Project structure setup
- [x] Basic model architecture
- [x] Data loading pipeline

### Phase 2: ✅ Training Pipeline Core
- [x] Training loop implementation
- [x] Batch processing
- [x] Basic metrics tracking

### Phase 3: ✅ Model Architecture
- [x] Input layer design
- [x] Hidden layers configuration
- [x] Output layer setup

### Phase 4: ✅ Data Management
- [x] Data preprocessing
- [x] Batch generation
- [x] Memory management

### Phase 5: ✅ Training Metrics & Validation
- [x] Loss calculation
- [x] Accuracy metrics
- [x] Validation pipeline
- [x] Checkpoint management
- [x] Memory leak prevention

### Phase 6: 🚧 Training Optimization
- [ ] Gradient updates for faster training
- [ ] Expanded test dataset
- [ ] Early stopping implementation
- [ ] Learning rate scheduling
- [ ] Batch size optimization
- [ ] Model architecture tuning

### Phase 7: Model Deployment
- [ ] Model serialization
- [ ] Loading/saving functionality
- [ ] Browser integration
- [ ] Performance optimization

## Current Status
- Training pipeline operational
- Basic metrics tracking implemented
- Memory management optimized
- Validation pipeline working
- Current accuracy: ~36%
- Loss trending downward

## Next Steps
1. Implement gradient updates
2. Expand test dataset
3. Add early stopping
4. Optimize hyperparameters
5. Improve model architecture

## Usage
```javascript
const pipeline = new TrainingPipeline({
  learningRate: 0.0002,
  batchSize: 32,
  maxEpochs: 100
});

await pipeline.train();
```
