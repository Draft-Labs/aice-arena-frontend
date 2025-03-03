import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import Phaser from 'phaser';
import '../styles/PhaserGame.css';

function PhaserGame() {
  const { account, connectWallet } = useWeb3();
  const [isGameInitialized, setIsGameInitialized] = useState(false);
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  
  // Game state management
  const [playerStats, setPlayerStats] = useState({
    health: 100,
    level: 1,
    experience: 0,
    gold: 0
  });
  
  const [gameLog, setGameLog] = useState([]);
  const logContainerRef = useRef(null);

  // Add a log message
  const addLogMessage = (message) => {
    setGameLog(prev => [...prev, { message, timestamp: Date.now() }]);
    // Scroll to bottom of log
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  // Initialize Phaser game
  useEffect(() => {
    if (!account || isGameInitialized) return;
    
    // Classes for our game scenes
    class BootScene extends Phaser.Scene {
      constructor() {
        super({ key: 'BootScene' });
      }
      
      preload() {
        // Load assets
        this.load.spritesheet('player', '/assets/game/player.png', { 
          frameWidth: 32, 
          frameHeight: 32 
        });
        this.load.spritesheet('tiles', '/assets/game/dungeon_tiles.png', { 
          frameWidth: 32, 
          frameHeight: 32 
        });
        this.load.spritesheet('enemies', '/assets/game/enemies.png', { 
          frameWidth: 32, 
          frameHeight: 32 
        });
        this.load.spritesheet('items', '/assets/game/items.png', { 
          frameWidth: 32, 
          frameHeight: 32 
        });
        
        // Loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.make.text({
          x: width / 2,
          y: height / 2 - 50,
          text: 'Loading...',
          style: {
            font: '20px monospace',
            fill: '#ffffff'
          }
        });
        loadingText.setOrigin(0.5, 0.5);
        
        this.load.on('progress', (value) => {
          progressBar.clear();
          progressBar.fillStyle(0xffffff, 1);
          progressBar.fillRect(250, 280, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
          progressBar.destroy();
          progressBox.destroy();
          loadingText.destroy();
          addLogMessage('Game assets loaded successfully');
        });
      }
      
      create() {
        this.scene.start('DungeonScene');
      }
    }
    
    class DungeonScene extends Phaser.Scene {
      constructor() {
        super({ key: 'DungeonScene' });
        this.map = null;
        this.player = null;
        this.cursors = null;
        this.enemies = [];
        this.items = [];
        this.level = 1;
        this.playerTurn = true;
      }
      
      create() {
        addLogMessage('Entered dungeon level ' + this.level);
        
        // Generate dungeon
        this.generateDungeon();
        
        // Create player
        this.player = this.physics.add.sprite(400, 300, 'player', 0);
        this.player.setCollideWorldBounds(true);
        
        // Create animations
        this.anims.create({
          key: 'player_idle',
          frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
          frameRate: 6,
          repeat: -1
        });
        
        this.anims.create({
          key: 'player_walk',
          frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
          frameRate: 10,
          repeat: -1
        });
        
        this.player.anims.play('player_idle');
        
        // Set up camera
        this.cameras.main.setBounds(0, 0, 800, 600);
        this.cameras.main.startFollow(this.player);
        
        // Set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Add some enemies
        this.createEnemies();
        
        // Add some items
        this.createItems();
        
        addLogMessage('Your turn - use arrow keys to move');
      }
      
      generateDungeon() {
        // Simplified dungeon generation
        // In a real game, you'd use a more sophisticated algorithm
        
        // Create a simple grid for now
        this.add.grid(400, 300, 800, 600, 32, 32, 0x000000, 0, 0xcccccc, 0.2);
        
        // Add some walls and floors
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 15; j++) {
            if (i === 0 || i === 19 || j === 0 || j === 14) {
              // Walls around the edges
              this.add.image(i * 32 + 80, j * 32 + 60, 'tiles', 1);
            } else if (Math.random() < 0.1) {
              // Random obstacles
              this.add.image(i * 32 + 80, j * 32 + 60, 'tiles', 2);
            } else {
              // Floor
              this.add.image(i * 32 + 80, j * 32 + 60, 'tiles', 0);
            }
          }
        }
      }
      
      createEnemies() {
        // Add some enemies
        for (let i = 0; i < 5; i++) {
          const x = Phaser.Math.Between(100, 700);
          const y = Phaser.Math.Between(100, 500);
          const enemy = this.physics.add.sprite(x, y, 'enemies', Phaser.Math.Between(0, 3));
          enemy.health = 20;
          this.enemies.push(enemy);
          
          // Add collision with player
          this.physics.add.collider(this.player, enemy, this.handleCombat, null, this);
        }
      }
      
      createItems() {
        // Add some items
        for (let i = 0; i < 3; i++) {
          const x = Phaser.Math.Between(100, 700);
          const y = Phaser.Math.Between(100, 500);
          const item = this.physics.add.sprite(x, y, 'items', Phaser.Math.Between(0, 3));
          item.type = ['health', 'gold', 'experience', 'weapon'][Phaser.Math.Between(0, 3)];
          this.items.push(item);
          
          // Add overlap with player
          this.physics.add.overlap(this.player, item, this.handleItemPickup, null, this);
        }
      }
      
      handleCombat(player, enemy) {
        if (this.playerTurn) {
          // Player attacks enemy
          enemy.health -= 10;
          addLogMessage('You attack the enemy for 10 damage!');
          
          if (enemy.health <= 0) {
            // Enemy defeated
            addLogMessage('Enemy defeated! Gained experience and gold.');
            enemy.destroy();
            this.enemies = this.enemies.filter(e => e !== enemy);
            
            // Update player stats
            setPlayerStats(prev => ({
              ...prev,
              experience: prev.experience + 10,
              gold: prev.gold + Phaser.Math.Between(5, 15)
            }));
            
            // Check for level up
            if (playerStats.experience >= playerStats.level * 20) {
              setPlayerStats(prev => ({
                ...prev,
                level: prev.level + 1,
                health: 100 // Heal on level up
              }));
              addLogMessage('Level up! You are now level ' + (playerStats.level + 1));
            }
          }
          
          this.playerTurn = false;
          this.processEnemyTurns();
        }
      }
      
      handleItemPickup(player, item) {
        switch(item.type) {
          case 'health':
            setPlayerStats(prev => ({
              ...prev,
              health: Math.min(prev.health + 20, 100)
            }));
            addLogMessage('Picked up a health potion! +20 health');
            break;
          case 'gold':
            setPlayerStats(prev => ({
              ...prev,
              gold: prev.gold + Phaser.Math.Between(10, 30)
            }));
            addLogMessage('Found some gold!');
            break;
          case 'experience':
            setPlayerStats(prev => ({
              ...prev,
              experience: prev.experience + 15
            }));
            addLogMessage('Found an ancient scroll! +15 experience');
            break;
          case 'weapon':
            addLogMessage('Found a better weapon! Damage increased.');
            break;
        }
        
        item.destroy();
        this.items = this.items.filter(i => i !== item);
      }
      
      processEnemyTurns() {
        addLogMessage('Enemies are moving...');
        
        // Move each enemy toward the player
        this.enemies.forEach(enemy => {
          // Simple AI: move toward player
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          const speed = 32; // Move one tile
          
          // Only move if not too close to player
          const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          if (distance > 40) {
            enemy.x += Math.cos(angle) * speed;
            enemy.y += Math.sin(angle) * speed;
          } else {
            // Attack player
            setPlayerStats(prev => ({
              ...prev,
              health: prev.health - 5
            }));
            addLogMessage('Enemy attacks you for 5 damage!');
          }
        });
        
        // Check if player is defeated
        if (playerStats.health <= 0) {
          addLogMessage('You have been defeated! Game over.');
          // Reset game or show game over screen
          setPlayerStats({
            health: 100,
            level: 1,
            experience: 0,
            gold: 0
          });
          this.scene.restart();
          return;
        }
        
        // After all enemies have moved, return to player's turn
        setTimeout(() => {
          this.playerTurn = true;
          addLogMessage('Your turn - use arrow keys to move');
        }, 1000);
      }
      
      update() {
        if (!this.playerTurn) return;
        
        let moved = false;
        
        if (this.cursors.left.isDown) {
          this.player.x -= 32;
          this.player.anims.play('player_walk', true);
          moved = true;
        } else if (this.cursors.right.isDown) {
          this.player.x += 32;
          this.player.anims.play('player_walk', true);
          moved = true;
        } else if (this.cursors.up.isDown) {
          this.player.y -= 32;
          this.player.anims.play('player_walk', true);
          moved = true;
        } else if (this.cursors.down.isDown) {
          this.player.y += 32;
          this.player.anims.play('player_walk', true);
          moved = true;
        } else {
          this.player.anims.play('player_idle', true);
        }
        
        // If player moved, it's the enemies' turn
        if (moved) {
          this.playerTurn = false;
          this.processEnemyTurns();
        }
      }
    }

    // Configure the game
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'phaser-game',
      backgroundColor: '#000000',
      scene: [BootScene, DungeonScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      pixelArt: true
    };

    // Create the new Phaser game
    phaserGameRef.current = new Phaser.Game(config);
    setIsGameInitialized(true);
    addLogMessage('Welcome to the Dungeon Crawler!');
    addLogMessage('Connect your wallet to save your progress.');
    
    // Cleanup
    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        setIsGameInitialized(false);
      }
    };
  }, [account, isGameInitialized]);

  return (
    <div className="phaser-game-container">
      <h1>Dungeon Crawler</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <p>Connect your wallet to play and save your progress</p>
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : (
        <div className="game-interface">
          <div className="game-stats">
            <div className="stat-item">
              <span className="stat-label">Health:</span>
              <div className="health-bar">
                <div 
                  className="health-fill" 
                  style={{ width: `${playerStats.health}%` }}
                ></div>
                <span className="health-text">{playerStats.health}/100</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-label">Level:</span>
              <span className="stat-value">{playerStats.level}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">XP:</span>
              <span className="stat-value">{playerStats.experience}/{playerStats.level * 20}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Gold:</span>
              <span className="stat-value">{playerStats.gold}</span>
            </div>
          </div>
          
          <div className="game-area">
            <div id="phaser-game" ref={gameRef} className="phaser-canvas"></div>
          </div>
          
          <div className="game-log" ref={logContainerRef}>
            {gameLog.map((entry, index) => (
              <div key={index} className="log-entry">
                {entry.message}
              </div>
            ))}
          </div>
          
          <div className="game-controls">
            <div className="control-help">
              <h3>Controls:</h3>
              <p>Arrow Keys: Move</p>
              <p>Move onto enemies to attack them</p>
              <p>Collect items by walking over them</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhaserGame; 