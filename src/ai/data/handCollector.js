import fs from 'fs/promises';
import path from 'path';

class HandCollector {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'data/hands';
    this.sources = {
      tournament: options.tournamentSources || [],
      cashGame: options.cashGameSources || []
    };
    this.stats = {
      totalHands: 0,
      byGameType: { tournament: 0, cashGame: 0 },
      byStage: { preflop: 0, flop: 0, turn: 0, river: 0 },
      byPlayerLevel: { beginner: 0, intermediate: 0, advanced: 0 }
    };
  }

  /**
   * Parse hand history files and extract training data
   * @param {string} source - Path to hand history file/directory
   * @returns {Array} Processed hand data
   */
  async parseHandHistory(source) {
    const hands = [];
    try {
      const content = await fs.readFile(source, 'utf-8');
      const rawHands = this.splitIntoHands(content);

      for (const rawHand of rawHands) {
        const processed = this.processHand(rawHand);
        if (processed) {
          hands.push(processed);
          this.updateStats(processed);
        }
      }
    } catch (error) {
      console.error(`Error processing ${source}:`, error);
    }
    return hands;
  }

  /**
   * Split raw hand history into individual hands
   * @param {string} content - Raw hand history content
   * @returns {Array<string>} Individual hands
   */
  splitIntoHands(content) {
    // Split on standard hand markers
    return content.split(/(?=PokerStars Hand #|Full Tilt Hand #)/g)
      .filter(hand => hand.trim().length > 0);
  }

  /**
   * Process a single hand into training format
   * @param {string} rawHand - Raw hand text
   * @returns {Object} Processed hand data
   */
  processHand(rawHand) {
    try {
      // Extract basic info
      const gameType = this.detectGameType(rawHand);
      const playerLevel = this.assessPlayerLevel(rawHand);
      const stages = this.extractStages(rawHand);
      const actions = this.extractActions(rawHand);
      const results = this.extractResults(rawHand);

      const hand = {
        gameType,
        playerLevel,
        stages,
        actions: this.extractActions(rawHand),
        results: this.extractResults(rawHand)
      };

      // Update stats when hand is successfully processed
      this.updateStats(hand);
      return hand;

    } catch (error) {
      console.warn('Failed to process hand:', error);
      return null;
    }
  }

  /**
   * Update collection statistics
   * @param {Object} hand - Processed hand data
   */
  updateStats(hand) {
    this.stats.totalHands++;
    this.stats.byGameType[hand.gameType]++;
    
    for (const stage of hand.stages) {
      this.stats.byStage[stage.type]++;
    }
    
    this.stats.byPlayerLevel[hand.playerLevel]++;
  }

  /**
   * Save collected hands to disk
   * @param {Array} hands - Processed hands
   */
  async saveHands(hands) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hands_${timestamp}.json`;
    
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(
      path.join(this.outputDir, filename),
      JSON.stringify(hands, null, 2)
    );
    
    // Save statistics
    await fs.writeFile(
      path.join(this.outputDir, `stats_${timestamp}.json`),
      JSON.stringify(this.stats, null, 2)
    );
  }

  // Helper methods
  detectGameType(rawHand) {
    if (rawHand.includes('Tournament')) return 'tournament';
    return 'cashGame';
  }

  assessPlayerLevel(rawHand) {
    // Implement player level assessment based on stakes/buyins
    return 'intermediate';  // Placeholder
  }

  extractStages(rawHand) {
    const stages = [];
    
    // Extract preflop
    if (rawHand.includes('*** HOLE CARDS ***')) {
      const preflop = {
        type: 'preflop',
        cards: [],
        actions: this.extractStreetActions(rawHand, '*** HOLE CARDS ***', '*** FLOP ***')
      };
      stages.push(preflop);
    }
    
    // Extract flop
    if (rawHand.includes('*** FLOP ***')) {
      const flopMatch = rawHand.match(/\*\*\* FLOP \*\*\* \[(.*?)\]/);
      const flop = {
        type: 'flop',
        cards: flopMatch ? flopMatch[1].split(' ') : [],
        actions: this.extractStreetActions(rawHand, '*** FLOP ***', '*** TURN ***')
      };
      stages.push(flop);
    }
    
    // Extract turn
    if (rawHand.includes('*** TURN ***')) {
      const turnMatch = rawHand.match(/\*\*\* TURN \*\*\*.*\] \[(.*?)\]/);
      const turn = {
        type: 'turn',
        cards: turnMatch ? [turnMatch[1]] : [],
        actions: this.extractStreetActions(rawHand, '*** TURN ***', '*** RIVER ***')
      };
      stages.push(turn);
    }
    
    // Extract river
    if (rawHand.includes('*** RIVER ***')) {
      const riverMatch = rawHand.match(/\*\*\* RIVER \*\*\*.*\] \[(.*?)\]/);
      const river = {
        type: 'river',
        cards: riverMatch ? [riverMatch[1]] : [],
        actions: this.extractStreetActions(rawHand, '*** RIVER ***', '*** SHOW DOWN ***')
      };
      stages.push(river);
    }

    return stages;
  }

  /**
   * Extract actions for a specific street
   * @param {string} rawHand - Full hand text
   * @param {string} startMarker - Start of street marker
   * @param {string} endMarker - End of street marker
   * @returns {Array} Actions on this street
   */
  extractStreetActions(rawHand, startMarker, endMarker) {
    const actions = [];
    const start = rawHand.indexOf(startMarker);
    if (start === -1) return actions;

    const end = endMarker ? rawHand.indexOf(endMarker) : rawHand.length;
    const streetText = rawHand.substring(
      start + startMarker.length,
      end === -1 ? rawHand.length : end
    );

    const actionLines = streetText.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('***'));

    for (const line of actionLines) {
      const action = this.parseAction(line);
      if (action) actions.push(action);
    }

    return actions;
  }

  /**
   * Parse a single action line
   * @param {string} line - Raw action text
   * @returns {Object|null} Parsed action
   */
  parseAction(line) {
    // Match common action patterns
    const foldMatch = line.match(/(.*?): folds/);
    const checkMatch = line.match(/(.*?): checks/);
    const callMatch = line.match(/(.*?): calls (\d+)/);
    const betMatch = line.match(/(.*?): bets (\d+)/);
    const raiseMatch = line.match(/(.*?): raises (\d+) to (\d+)/);

    if (foldMatch) {
      return { player: foldMatch[1], type: 'fold' };
    }
    if (checkMatch) {
      return { player: checkMatch[1], type: 'check' };
    }
    if (callMatch) {
      return { 
        player: callMatch[1], 
        type: 'call',
        amount: parseInt(callMatch[2])
      };
    }
    if (betMatch) {
      return {
        player: betMatch[1],
        type: 'bet',
        amount: parseInt(betMatch[2])
      };
    }
    if (raiseMatch) {
      return {
        player: raiseMatch[1],
        type: 'raise',
        amount: parseInt(raiseMatch[3]),
        increment: parseInt(raiseMatch[2])
      };
    }

    return null;
  }

  extractActions(rawHand) {
    // Collect actions from all stages
    const stages = this.extractStages(rawHand);
    return stages.reduce((actions, stage) => 
      actions.concat(stage.actions), []);
  }

  extractResults(rawHand) {
    // Implement result extraction
    return {};  // Placeholder
  }
}

export default HandCollector; 