import { INPUT_SIZE, OUTPUT_SIZE, ACTIONS, POSITIONS, POSITION_MAPPING } from '../utils/constants';
import { convertHand, convertCard } from '../utils/cardConverter';
import HandEvaluator from '../utils/handEvaluator';

class PokerDataFetcher {
  constructor() {
    this.sampleData = `
Game #1234567890 starting at table 'Table1' with 6 players
Dealt to Player1 [ Ah Kd ]
Player1: posts small blind 10
Player2: posts big blind 20
Player3: folds
Player4: calls 20
*** FLOP *** [ 7h 8d 9c ]
Player1: checks
Player2: bets 40
Player4: folds
*** TURN *** [ 7h 8d 9c ] [ Jd ]
Player1: calls 40
Player2: checks
*** RIVER *** [ 7h 8d 9c Jd ] [ 2s ]
Player1: checks
Player2: checks
`;
    this.batchSize = 1000;
    this.defaultStackSize = 1000;
    this.evaluator = new HandEvaluator();
  }

  async fetchData() {
    try {
      console.log('Using sample poker data...');
      const hands = this.parseIRCFormat(this.sampleData);
      console.log(`Loaded ${hands.length} poker hands`);
      return hands;
    } catch (error) {
      console.error('Error processing poker data:', error);
      throw error;
    }
  }

  calculateRelativePositions(playerCount, buttonPosition) {
    const positions = {};
    
    // Calculate positions based on player count
    for (let i = 0; i < playerCount; i++) {
      const relativePos = (i - buttonPosition + playerCount) % playerCount;
      positions[i] = POSITION_MAPPING[playerCount]?.[relativePos] || POSITIONS.EARLY;
    }
    
    return positions;
  }

  parseIRCFormat(text) {
    const hands = [];
    const lines = text.split('\n');
    let currentHand = null;
    let seenPlayers = new Set();

    const ensurePlayerStack = (player) => {
      if (!(player in currentHand.stacks)) {
        currentHand.stacks[player] = this.defaultStackSize;
      }
      return currentHand.stacks[player];
    };

    const addOrUpdatePlayer = (player) => {
      if (!seenPlayers.has(player)) {
        seenPlayers.add(player);
        const position = seenPlayers.size - 1;
        currentHand.players.push({
          name: player,
          position,
          cards: []
        });
        // Initialize stack for new player
        ensurePlayerStack(player);
        return position;
      }
      return currentHand.players.findIndex(p => p.name === player);
    };

    // Helper function to create an action with relative position
    const createAction = (player, actionType, amount, position) => {
      const playerEntry = currentHand.players.find(p => p.name === player);
      const handStrength = this.evaluator.evaluateHand(
        playerEntry.cards,
        currentHand.communityCards
      );
      const equity = this.evaluator.calculateEquity(
        playerEntry.cards,
        currentHand.communityCards
      );

      return {
        player,
        action: actionType,
        amount,
        position,
        relativePosition: currentHand.relativePositions[position],
        potAfterAction: currentHand.potSize,
        stackAfterAction: currentHand.stacks[player],
        handStrength: handStrength.handRank,
        handType: handStrength.handType,
        equity: equity
      };
    };

    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.startsWith('Game #')) {
        if (currentHand && currentHand.players.length > 0) {
          currentHand.complete = true;
          hands.push(currentHand);
        }
        const playerCountMatch = line.match(/with (\d+) players/);
        const playerCount = playerCountMatch ? parseInt(playerCountMatch[1]) : 6;

        currentHand = {
          id: line.split('#')[1].split(' ')[0],
          players: [],
          actions: [],
          communityCards: [],
          positions: {},
          potSize: 0,
          stacks: {},
          complete: false,
          currentRound: 'preflop',
          buttonPosition: -1,
          relativePositions: {},
          playerCount: playerCount,
        };
        seenPlayers = new Set();
      }
      else if (line.startsWith('Dealt to')) {
        const matches = line.match(/Dealt to (\w+) \[ (.*?) \]/);
        if (matches) {
          const [_, player, cards] = matches;
          const position = addOrUpdatePlayer(player);
          const playerEntry = currentHand.players[position];
          playerEntry.cards = convertHand(cards);
        }
      }
      else if (line.includes('posts small blind')) {
        const matches = line.match(/(\w+): posts small blind (\d+)/);
        if (matches) {
          const [_, player, amount] = matches;
          const position = addOrUpdatePlayer(player);
          const blindAmount = parseInt(amount);
          
          currentHand.buttonPosition = (position - 1 + currentHand.playerCount) % currentHand.playerCount;
          
          for (let i = 0; i < currentHand.playerCount; i++) {
            const relativePos = (i - currentHand.buttonPosition + currentHand.playerCount) % currentHand.playerCount;
            currentHand.relativePositions[i] = POSITION_MAPPING[currentHand.playerCount][relativePos];
          }
          
          currentHand.positions[player] = 'SB';
          currentHand.potSize += blindAmount;
          currentHand.stacks[player] -= blindAmount;

          currentHand.actions.push(createAction(player, ACTIONS.RAISE, blindAmount, position));
        }
      }
      else if (line.includes('posts big blind')) {
        const matches = line.match(/(\w+): posts big blind (\d+)/);
        if (matches) {
          const [_, player, amount] = matches;
          const position = addOrUpdatePlayer(player);
          const blindAmount = parseInt(amount);
          
          currentHand.positions[player] = 'BB';
          currentHand.potSize += blindAmount;
          currentHand.stacks[player] -= blindAmount;

          currentHand.actions.push(createAction(player, ACTIONS.RAISE, blindAmount, position));
        }
      }
      else if (line.match(/(\w+): (calls|raises|bets|checks|folds)/)) {
        const actionMatch = line.match(/(\w+): (\w+)( \d+)?/);
        if (actionMatch) {
          const [_, player, action, amount] = actionMatch;
          const position = addOrUpdatePlayer(player);
          const betAmount = amount ? parseInt(amount.trim()) : 0;
          
          if (betAmount > 0) {
            currentHand.potSize += betAmount;
            currentHand.stacks[player] -= betAmount;
          }
          
          currentHand.actions.push(createAction(player, this.convertAction(action), betAmount, position));
        }
      }
      else if (line.includes('*** FLOP ***')) {
        currentHand.currentRound = 'flop';
        const matches = line.match(/\[ (.*?) \]/);
        if (matches) {
          const cards = matches[1];
          currentHand.communityCards = convertHand(cards);
        }
      }
      else if (line.includes('*** TURN ***')) {
        currentHand.currentRound = 'turn';
        const matches = line.match(/\[ (.*?) \]/g);
        if (matches && matches.length > 1) {
          const card = matches[1].slice(2, -2);
          currentHand.communityCards.push(convertCard(card));
        }
      }
      else if (line.includes('*** RIVER ***')) {
        currentHand.currentRound = 'river';
        const matches = line.match(/\[ (.*?) \]/g);
        if (matches && matches.length > 1) {
          const card = matches[1].slice(2, -2);
          currentHand.communityCards.push(convertCard(card));
        }
      }
    }

    // Process last hand
    if (currentHand && currentHand.players.length > 0) {
      currentHand.complete = true;
      hands.push(currentHand);
    }

    return hands;
  }

  convertAction(action) {
    switch (action.toLowerCase()) {
      case 'folds': return ACTIONS.FOLD;
      case 'checks': return ACTIONS.CHECK;
      case 'calls': return ACTIONS.CALL;
      case 'raises':
      case 'bets': return ACTIONS.RAISE;
      default: throw new Error(`Unknown action: ${action}`);
    }
  }
}

export default PokerDataFetcher; 