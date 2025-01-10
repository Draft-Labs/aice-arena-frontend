import { FETCH_CONFIG } from '../utils/constants.js';
import { INPUT_SIZE, OUTPUT_SIZE, ACTIONS, POSITIONS, POSITION_MAPPING } from '../utils/constants.js';
import { convertHand, convertCard } from '../utils/cardConverter.js';
import HandEvaluator from '../utils/handEvaluator.js';

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

  async loadPokerHands(batchSize = 1) {
    // Generate varied training data
    const hands = [];
    for (let i = 0; i < batchSize; i++) {
      hands.push({
        id: `hand_${i}`,
        players: [
          { 
            name: 'Player1', 
            position: 'SB', 
            cards: [
              Math.floor(Math.random() * 52), 
              Math.floor(Math.random() * 52)
            ] 
          },
          // ... other players
        ],
        communityCards: Array(5).fill(0).map(() => Math.floor(Math.random() * 52)),
        potSize: Math.random() * 1000,
        buttonPosition: Math.floor(Math.random() * 6),
        action: ['fold', 'check', 'call', 'raise'][Math.floor(Math.random() * 4)]
      });
    }
    return hands;
  }

  async fetchData(batchSize) {
    try {
      const hands = await this.loadPokerHands(batchSize);
      return hands.map(hand => ({
        input: this.preprocessInput(hand),
        output: this.createTargetVector(hand.action)
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  parseIRCFormat(data) {
    // For testing, return a simplified hand structure
    return [{
      id: '1234567890',
      players: [
        { name: 'Player1', position: 'SB', cards: [0, 12] }, // Ah, Kd
        { name: 'Player2', position: 'BB' },
        { name: 'Player3', position: 'UTG' },
        { name: 'Player4', position: 'MP' }
      ],
      actions: [
        { player: 'Player1', type: 'check' },
        { player: 'Player2', type: 'bet', amount: 40 },
        { player: 'Player4', type: 'fold' }
      ],
      communityCards: [7, 21, 35, 24, 41], // 7h 8d 9c Jd 2s
      positions: { Player1: 'SB', Player2: 'BB' },
      potSize: 130,
      stacks: {
        Player1: 950,
        Player2: 940,
        Player3: 1000,
        Player4: 980
      },
      complete: true,
      currentRound: 'river',
      buttonPosition: 5,
      relativePositions: this.calculateRelativePositions(6, 5),
      playerCount: 6,
      action: 'check' // The action we want to predict
    }];
  }

  preprocessInput(hand) {
    // Convert hand state to input vector
    const input = new Array(373).fill(0);
    
    // Encode cards (52 * 2 = 104 positions for hole cards)
    hand.players.forEach((player, i) => {
      if (player.cards) {
        player.cards.forEach(card => {
          input[card] = 1;
        });
      }
    });
    
    // Encode community cards (52 * 5 = 260 positions)
    if (hand.communityCards) {
      hand.communityCards.forEach(card => {
        input[104 + card] = 1;
      });
    }
    
    // Encode pot size and positions (9 additional features)
    input[364] = hand.potSize / 1000; // Normalize pot size
    input[365 + hand.buttonPosition] = 1;
    
    return input;
  }

  createTargetVector(action) {
    // One-hot encode the action
    const output = new Array(4).fill(0);
    switch(action) {
      case 'fold': output[0] = 1; break;
      case 'check': output[1] = 1; break;
      case 'call': output[2] = 1; break;
      case 'raise': case 'bet': output[3] = 1; break;
      default: output[1] = 1; // Default to check
    }
    return output;
  }

  calculateRelativePositions(playerCount, buttonPosition) {
    const positions = {};
    for (let i = 0; i < playerCount; i++) {
      const relativePos = (i - buttonPosition + playerCount) % playerCount;
      switch(relativePos) {
        case 0: positions[i] = 'BTN'; break;
        case 1: positions[i] = 'SB'; break;
        case 2: positions[i] = 'BB'; break;
        case 3: case 4: positions[i] = 'EARLY'; break;
        default: positions[i] = 'LATE';
      }
    }
    return positions;
  }
}

export default PokerDataFetcher; 