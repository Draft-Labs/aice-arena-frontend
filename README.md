# Aice Arena Frontend

A React-based frontend application for the Aice Arena decentralized betting platform. This application provides user interfaces for various casino games and betting features, all running on the Avalanche blockchain.

## Overview

Aice Arena is a decentralized casino platform that offers various games with transparent, on-chain betting mechanics. The platform features:

- Smart contract-based treasury system
- Real-time game results using blockchain events
- Interactive UI with responsive design
- Integrated AI chat assistant (Aice)

### Available Games

1. **Roulette**
   - European style roulette with numbers 0-36 (CHANGE TO AMERICAN STYLE - ADD DOUBLE 0)
   - Multiple betting options (single numbers, red/black, odd/even, etc.)
   - Real-time result verification through smart contracts

2. **Blackjack**
   - Classic casino card game
   - Player vs House gameplay
   - Smart contract-based card deck and dealing

3. **Poker**
   - Texas Hold'em style
   - Multiplayer support
   - Decentralized card dealing and pot management

4. **Balatro** (Coming Soon)
   - Unique poker-style roguelike game
   - Single-player experience
   - Progressive difficulty system

## User Journey

1. **Wallet Connection**
   - Connect using MetaMask or other Web3 wallets
   - Must be connected to Avalanche network (Fuji testnet for development)

2. **Account Creation**
   - Create a casino account through the Treasury smart contract
   - Initial deposit required to start playing
   - Account management available in the Account page

3. **Customization**
   - Set betting limits and preferences
   - Configure notification settings
   - View transaction history

4. **Gameplay**
   - Select from available games
   - Place bets using AVAX
   - Real-time results and payouts
   - Transaction history tracking

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or similar Web3 wallet
- Access to Avalanche Fuji testnet

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/betting-dapp.git
cd betting-dapp/frontend
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

The project supports multiple environments:

#### Local Development
```bash
npm run start:local
```
- Connects to local Hardhat network
- Uses local backend API (port 3001)
- Hot-reloading enabled
- Default port: 3000

#### Fuji Testnet
```bash
npm run start:fuji
```
- Connects to Avalanche Fuji testnet
- Uses deployed testnet contracts
- Requires Fuji testnet AVAX
- Default port: 3000

### Environment Configuration

Create appropriate `.env` files for different environments:

```env
# .env.local
REACT_APP_CHAIN_ID=31337
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_BACKEND_URL=http://localhost:3001

# .env.fuji
REACT_APP_CHAIN_ID=43113
REACT_APP_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
REACT_APP_BACKEND_URL=https://your-backend-url
```

### Smart Contract Integration

The frontend interacts with several smart contracts:

- HouseTreasury.sol: Manages user accounts, deposits/withdrawals, and house funds
- Roulette.sol: Handles American style roulette game logic and betting (includes 0 and 00)
- Blackjack.sol: Manages blackjack game state, card deck, and betting mechanics
- Poker.sol: Implements Texas Hold'em poker with multiplayer support and pot management, as well as a server-run "house" player

Contract ABIs are stored in `src/contracts/abis/`

### Key Features

1. **Web3 Integration**
   - Wallet connection handling
   - Transaction management
   - Event listening and processing

2. **Game Interfaces**
   - Responsive game boards
   - Real-time updates
   - Betting controls

3. **AI Assistant (Aice)**
   - Natural language interaction
   - Game guidance
   - Support features

4. **Account Management**
   - Balance tracking
   - Transaction history
   - Settings configuration

## Testing

```bash
npm test
```
Runs the test suite, including:
- Component tests
- Integration tests
- Contract interaction tests

## Building for Production

```bash
npm run build
```
Creates an optimized production build in the `build` folder.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Troubleshooting

Common issues and solutions:

1. **MetaMask Connection Issues**
   - Ensure correct network is selected
   - Reset MetaMask account if transactions are stuck

2. **Transaction Failures**
   - Check wallet has sufficient AVAX
   - Verify correct network configuration
   - Check console for detailed error messages

3. **Game Loading Issues**
   - Clear browser cache
   - Ensure smart contracts are deployed
   - Verify backend API is accessible

## Additional Resources

- [Avalanche Documentation](https://docs.avax.network/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [React Documentation](https://reactjs.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)

## Support

For support, please:
1. Check existing GitHub issues
2. Create a new issue with detailed information
3. Join our Discord community (link coming soon)

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

# Getting Started with Create React App

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
