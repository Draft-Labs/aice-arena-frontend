import { MODEL_CONFIG } from '../utils/constants.js';
import { convertCardToIndex } from '../utils/cardConverter.js';

class HandHistoryParser {
  constructor() {
    this.currentHand = null;
    this.players = new Map();
  }

  parseIRCFormat(rawText) {
    const hands = [];
    const lines = rawText.split('\n');
    
    try {
      for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Start of new hand
        if (line.startsWith('Game #')) {
          if (this.currentHand && this.currentHand.actions.length > 0) {
            try {
              hands.push(this.finalizeHand());
            } catch (error) {
              console.warn('Failed to finalize hand:', error);
            }
          }
          this.initializeNewHand(line);
          continue;
        }

        // Skip if no current hand
        if (!this.currentHand) continue;

        try {
          // Parse different types of lines
          if (line.startsWith('Dealt to')) {
            this.parseHoleCards(line);
          } else if (line.includes('posts')) {
            this.parseBlind(line);
          } else if (line.includes('*** ')) {
            this.parseStreet(line);
          } else if (line.includes(': ')) {
            this.parseAction(line);
          }
        } catch (error) {
          console.warn('Failed to parse line:', line, error);
          // Reset current hand on parsing error
          this.currentHand = null;
          continue;
        }
      }

      // Add final hand if valid
      if (this.currentHand && 
          this.currentHand.actions.length > 0 && 
          this.currentHand.holeCards.length === 2) {  // Ensure we have valid hole cards
        try {
          hands.push(this.finalizeHand());
        } catch (error) {
          console.warn('Failed to finalize final hand:', error);
        }
      }

    } catch (error) {
      console.error('Error parsing hand history:', error);
    } finally {
      // Reset state
      this.currentHand = null;
      this.players.clear();
    }

    return hands;
  }

  initializeNewHand(line) {
    // Reset state from previous hand
    this.players.clear();
    
    const handId = line.match(/Game #(\d+)/)[1];
    this.currentHand = {
      id: handId,
      players: [],
      holeCards: [],
      communityCards: [],
      actions: [],
      potSize: 0,
      position: 'BTN', // Default position
      streets: ['preflop', 'flop', 'turn', 'river'],
      currentStreet: 'preflop'
    };

    console.log(`\nInitializing new hand #${handId}`);  // Debug log
  }

  parseHoleCards(line) {
    // Example: "Dealt to Hero [ Ah Kd ]"
    const cardMatch = line.match(/\[(.*?)\]/);
    if (!cardMatch) {
      throw new Error('Invalid hole cards format');
    }
    
    const cards = cardMatch[1].trim().split(' ');
    if (cards.length !== 2) {
      throw new Error('Expected exactly 2 hole cards');
    }
    
    try {
      // Debug log
      console.log('Parsing hole cards:', cards);
      
      const cardIndices = cards.map(card => {
        const index = convertCardToIndex(card);
        console.log(`Converting ${card} to index ${index}`);
        return index;
      });
      
      this.currentHand.holeCards = cardIndices;
      
      // Verify encoding
      console.log('Hole cards encoded as:', this.currentHand.holeCards);
    } catch (error) {
      throw new Error(`Failed to convert hole cards: ${error.message}`);
    }
  }

  parseBlind(line) {
    // Example: "Player1: posts small blind 10"
    const player = line.split(':')[0].trim();
    const action = line.includes('small blind') ? 'sb' : 'bb';
    
    // Extract the blind amount using a more specific regex
    const blindMatch = line.match(/posts (?:small|big) blind (\d+)/);
    const blindAmount = blindMatch ? parseInt(blindMatch[1]) : 0;
    
    console.log(`Blind action: ${player} ${action} ${blindAmount}`);  // Debug log
    
    this.currentHand.actions.push({
      player,
      action,
      amount: blindAmount,
      street: 'preflop'
    });

    // Add to pot size
    this.currentHand.potSize += blindAmount;
    console.log(`Pot after blind: ${this.currentHand.potSize}`);  // Debug log

    // Track player position
    if (action === 'sb') {
      this.players.set(player, 'SB');
    } else if (action === 'bb') {
      this.players.set(player, 'BB');
    }
  }

  parseStreet(line) {
    // Example: "*** FLOP *** [ 2h 3d 4c ]"
    const street = line.toLowerCase().match(/\*\*\* (.*?) \*\*\*/)[1];
    this.currentHand.currentStreet = street;
    
    if (line.includes('[')) {
      const cards = line.match(/\[(.*?)\]/)[1].trim().split(' ');
      this.currentHand.communityCards.push(...cards.map(card => convertCardToIndex(card)));
    }
  }

  parseAction(line) {
    // Example: "Player1: raises 50" or "Player2: bets 40"
    const [player, action, amount] = this.extractPlayerAction(line);
    
    const oldPotSize = this.currentHand.potSize;
    
    // Add to pot based on action type
    if (action === 'call') {
      this.currentHand.potSize += amount;
    } else if (action === 'raise' || action === 'bet') {
      // For raises/bets, we need to add the full amount
      this.currentHand.potSize += amount;
    }
    
    console.log(`Action: ${player} ${action} ${amount}, Pot: ${oldPotSize} -> ${this.currentHand.potSize}`);
    
    this.currentHand.actions.push({
      player,
      action,
      amount,
      street: this.currentHand.currentStreet
    });
  }

  extractPlayerAction(line) {
    const [player, actionPart] = line.split(': ');
    const actionWords = actionPart.split(' ');
    const rawAction = actionWords[0].toLowerCase();
    
    // Extract amount with a more specific regex
    const amountMatch = actionPart.match(/(?:calls|raises|bets) (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : null;
    
    // Normalize action names
    let mappedAction;
    switch (rawAction) {
      case 'bets':
      case 'bet':
        mappedAction = 'raise';  // Treat bets as raises
        break;
      case 'calls':
      case 'call':
        mappedAction = 'call';
        break;
      case 'raises':
      case 'raise':
        mappedAction = 'raise';
        break;
      case 'folds':
      case 'fold':
        mappedAction = 'fold';
        break;
      case 'checks':
      case 'check':
        mappedAction = 'check';
        break;
      default:
        mappedAction = rawAction;
    }
    
    return [player, mappedAction, amount];
  }

  finalizeHand() {
    // Convert hand data to model input format
    const result = {
      input: this.convertToModelInput(this.currentHand),
      output: this.convertToModelOutput(this.currentHand),
      metadata: {
        id: this.currentHand.id,
        potSize: this.currentHand.potSize,
        numPlayers: this.currentHand.players.length,
        actions: this.currentHand.actions,  // Add actions to metadata
        street: this.currentHand.currentStreet
      }
    };

    // Debug output
    console.log('\nFinalizing hand:', {
      id: this.currentHand.id,
      inputLength: result.input.length,
      outputLength: result.output.length,
      expectedInputLength: MODEL_CONFIG.INPUT_SIZE,
      expectedOutputLength: MODEL_CONFIG.OUTPUT_SIZE,
      potSize: this.currentHand.potSize,
      numActions: this.currentHand.actions.length
    });

    return result;
  }

  convertToModelInput(hand) {
    // Calculate correct offsets
    const CARD_BITS = 52;
    const POSITION_BITS = 6;
    const POT_BITS = 1;
    const ACTION_BITS = 2;

    const offsets = {
      cards: 0,                    // All cards in one 52-bit section
      communityCards: CARD_BITS,   // Community cards start at index 52
      position: CARD_BITS * 6,     // Position (6 bits)
      potSize: CARD_BITS * 6 + POSITION_BITS,  // Pot size (1 bit)
      actions: CARD_BITS * 6 + POSITION_BITS + POT_BITS  // Actions (2 bits)
    };

    // Create input vector with exact size
    const input = new Array(MODEL_CONFIG.INPUT_SIZE).fill(0);

    // Debug hole cards encoding
    console.log('Converting hole cards:', {
      cards: hand.holeCards,
      offset: offsets.cards
    });

    // Encode hole cards in the first 52-bit section
    hand.holeCards.forEach(cardIndex => {
      if (cardIndex >= 0 && cardIndex < CARD_BITS) {
        input[cardIndex] = 1;
        console.log(`Encoded card ${cardIndex} at position ${cardIndex}`);
      }
    });

    // Debug community cards encoding
    console.log('Converting community cards:', {
      cards: hand.communityCards,
      offset: offsets.communityCards
    });

    // Encode community cards - each card gets its own 52-bit section
    hand.communityCards.forEach((cardIndex, i) => {
      if (cardIndex >= 0 && cardIndex < CARD_BITS) {
        const position = offsets.communityCards + (i * CARD_BITS) + cardIndex;
        input[position] = 1;
        console.log(`Encoded community card ${cardIndex} at position ${position} (section ${i + 1})`);
      }
    });

    // Encode position
    const position = MODEL_CONFIG.POSITION_MAP[hand.position] || 0;
    if (position < POSITION_BITS) {
      input[offsets.position + position] = 1;
    }

    // Encode pot size
    input[offsets.potSize] = Math.min(hand.potSize / MODEL_CONFIG.MAX_POT_SIZE, 1);

    // Encode last action
    if (hand.actions && hand.actions.length > 0) {
      const lastAction = hand.actions[hand.actions.length - 1];
      const actionIndex = MODEL_CONFIG.ACTION_MAP[lastAction.action];
      if (actionIndex !== undefined && actionIndex < ACTION_BITS) {
        input[offsets.actions + actionIndex] = 1;
      }
    }

    // Verify vector size
    if (input.length !== MODEL_CONFIG.INPUT_SIZE) {
      console.error('Input vector size mismatch:', {
        actual: input.length,
        expected: MODEL_CONFIG.INPUT_SIZE,
        offsets,
        totalBits: CARD_BITS * 6 + POSITION_BITS + POT_BITS + ACTION_BITS
      });
    }

    return input;
  }

  convertToModelOutput(hand) {
    const output = new Array(MODEL_CONFIG.OUTPUT_SIZE).fill(0);
    
    if (hand.actions && hand.actions.length > 0) {
      const lastAction = hand.actions[hand.actions.length - 1];
      const actionIndex = MODEL_CONFIG.ACTION_MAP[lastAction.action];
      if (actionIndex !== undefined) {
        output[actionIndex] = 1;
      }
    }
    
    return output;
  }

  // Add debug method
  logHandState() {
    console.log('Current Hand State:', {
      id: this.currentHand.id,
      potSize: this.currentHand.potSize,
      street: this.currentHand.currentStreet,
      actions: this.currentHand.actions.map(a => ({
        player: a.player,
        action: a.action,
        amount: a.amount
      }))
    });
  }
}

export default HandHistoryParser; 