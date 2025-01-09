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

### Project Structure

```
src/ai/
├── data/
│   └── dataFetcher.js       # Poker hand parsing and processing
├── models/
│   └── ...                  # Will contain neural network models
├── training/
│   └── ...                  # Will contain training scripts
├── utils/
│   ├── constants.js         # Configuration and constants
│   ├── cardConverter.js     # Card notation utilities
│   └── testEnvironment.js   # Testing setup
└── test/
    ├── test.js             # Main test suite
    └── dataTest.js         # Data processing tests
```

### Data Format

The AI processes poker hands in the following structured format:
```javascript
{
  id: "gameId",
  players: [{
    name: "playerName",
    cards: [card1, card2],     // 1-52 representation
    position: "SB",            // Table position
    relativePosition: "SB",    // Relative to button
    stack: 1000               // Current stack size
  }],
  communityCards: [card1, card2, card3, card4, card5],
  actions: [{
    player: "playerName",
    action: "RAISE",          // FOLD/CHECK/CALL/RAISE
    amount: 20,
    position: "SB",
    relativePosition: "SB",
    potAfterAction: 40,
    stackAfterAction: 980
  }],
  currentRound: "flop",       // preflop/flop/turn/river
  buttonPosition: 0,          // Button position
  potSize: 100               // Current pot size
}
```

### Running Tests

```bash
# Test environment setup
npm run test:ai

# Test data processing
npm run test:ai-data
```

### Next Steps
1. Data transformation for neural network input
2. Model architecture design
3. Training pipeline implementation
4. Integration with game interface

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
