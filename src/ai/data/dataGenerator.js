import * as tf from '@tensorflow/tfjs';

class PokerDataGenerator {
  constructor(numHands = 100) {
    this.numHands = numHands;
  }

  generateDataset() {
    const dataset = [];
    
    for (let i = 0; i < this.numHands; i++) {
      const hand = this.generateHand();
      dataset.push({
        input: this.encodeInput(hand),
        output: this.encodeOutput(hand.action)
      });
    }
    
    return dataset;
  }

  generateHand() {
    // Generate 2 unique hole cards
    const holeCards = this.generateUniqueCards(2);
    // Generate up to 5 unique community cards
    const communityCards = this.generateUniqueCards(5, holeCards);
    
    return {
      holeCards,
      communityCards,
      position: Math.floor(Math.random() * 6), // 0-5 for BTN,SB,BB,UTG,MP,CO
      stackSize: 500 + Math.random() * 1500,  // 500-2000 chips
      potSize: 20 + Math.random() * 480,      // 20-500 chips
      action: Math.floor(Math.random() * 4)    // 0-3 for fold,check,call,raise
    };
  }

  generateUniqueCards(count, existingCards = []) {
    const cards = [];
    const usedCards = new Set(existingCards);
    
    while (cards.length < count) {
      const card = Math.floor(Math.random() * 52);
      if (!usedCards.has(card)) {
        cards.push(card);
        usedCards.add(card);
      }
    }
    
    return cards;
  }

  encodeInput(hand) {
    const input = new Float32Array(373);
    
    // Encode hole cards (0-103)
    hand.holeCards.forEach(card => {
      input[card] = 1;
    });
    
    // Encode community cards (104-363)
    hand.communityCards.forEach(card => {
      input[104 + card] = 1;
    });
    
    // Encode position (364-369)
    input[364 + hand.position] = 1;
    
    // Encode stack size (370)
    input[370] = hand.stackSize / 2000; // Normalize by max stack
    
    // Encode pot size (371)
    input[371] = hand.potSize / 500;    // Normalize by max pot
    
    // Encode pot odds (372)
    input[372] = hand.potSize > 0 ? (20 / hand.potSize) : 0;
    
    return input;
  }

  encodeOutput(action) {
    const output = new Float32Array(4);
    output[action] = 1;
    return output;
  }
}

export default PokerDataGenerator;