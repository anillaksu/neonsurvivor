// NeonSurvivor - Mobile Survival Game
// Enhanced with touch controls, virtual joystick, and mobile UI

class NeonSurvivor {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.config = {};
        this.defaultConfig = {
            enemySpawnRate: 2,
            bulletSpeed: 7,
            playerSpeed: 5
        };
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'paused', 'gameOver', 'levelUp', 'upgrading'
        this.score = 0;
        this.enemies = [];
        this.bullets = [];
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.bulletFireTimer = 0;
        
        // Level and upgrade system
        this.level = 1;
        this.levelStartTime = 0;
        this.levelDuration = 30000; // 30 seconds per level
        this.showLevelUpBanner = false;
        this.levelUpBannerTimer = 0;
        this.levelUpBannerDuration = 3000; // 3 seconds
        
        // Upgrade system
        this.upgrades = {
            speed: 0,
            bulletSpeed: 0,
            extraDirections: 0
        };
        this.availableUpgrades = [
            { type: 'speed', name: 'Speed Boost', description: '+10% movement speed' },
            { type: 'bulletSpeed', name: 'Bullet Speed', description: '+20% bullet velocity' },
            { type: 'extraDirections', name: 'Extra Bullets', description: '+1 diagonal direction' }
        ];
        this.currentUpgradeOptions = [];
        this.selectedUpgradeIndex = 0;
        
        // Player
        this.player = {
            x: 400,
            y: 300,
            size: 20,
            speed: 5
        };
        
        // Touch and joystick controls
        this.joystick = {
            active: false,
            centerX: 0,
            centerY: 0,
            knobX: 0,
            knobY: 0,
            maxDistance: 50,
            angle: 0,
            distance: 0
        };
        this.touchInput = { x: 0, y: 0 };
        this.isMobile = this.detectMobile();
        
        // Input handling
        this.keys = {};
        
        // Initialize
        this.setupCanvas();
        this.setupEventListeners();
        this.loadConfig();
        
        // AdMob placeholders (commented for future integration)
        // this.initializeAdMob();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    setupCanvas() {
        // Make canvas responsive
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        if (this.isMobile) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight - 100;
        } else {
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Upgrade selection with arrow keys and enter
            if (this.gameState === 'upgrading') {
                if (e.key === 'ArrowUp' || e.key === 'w') {
                    this.selectedUpgradeIndex = Math.max(0, this.selectedUpgradeIndex - 1);
                } else if (e.key === 'ArrowDown' || e.key === 's') {
                    this.selectedUpgradeIndex = Math.min(this.currentUpgradeOptions.length - 1, this.selectedUpgradeIndex + 1);
                } else if (e.key === 'Enter' || e.key === ' ') {
                    this.selectUpgrade(this.selectedUpgradeIndex);
                }
            }
            
            // Fullscreen toggle with F key
            if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        // Fullscreen change event
        document.addEventListener('fullscreenchange', () => {
            this.onFullscreenChange();
        });
        
        // Touch events for joystick
        this.setupJoystickEvents();
        
        // Canvas click for restart
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'gameOver') {
                this.restart();
            }
        });
    }
    
    setupJoystickEvents() {
        const joystickContainer = document.getElementById('joystick-container');
        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');
        
        if (!joystickContainer) return;
        
        // Touch start
        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickBase.getBoundingClientRect();
            
            this.joystick.active = true;
            this.joystick.centerX = rect.left + rect.width / 2;
            this.joystick.centerY = rect.top + rect.height / 2;
            
            this.updateJoystick(touch.clientX, touch.clientY);
        });
        
        // Touch move
        joystickContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.joystick.active) return;
            
            const touch = e.touches[0];
            this.updateJoystick(touch.clientX, touch.clientY);
        });
        
        // Touch end
         joystickContainer.addEventListener('touchend', (e) => {
             e.preventDefault();
             this.joystick.active = false;
             this.joystick.distance = 0;
             this.touchInput.x = 0;
             this.touchInput.y = 0;
             
             // Reset knob position
             joystickKnob.style.transform = 'translate(-50%, -50%)';
         });
     }
     
     updateJoystick(touchX, touchY) {
         const dx = touchX - this.joystick.centerX;
         const dy = touchY - this.joystick.centerY;
         const distance = Math.sqrt(dx * dx + dy * dy);
         
         this.joystick.distance = Math.min(distance, this.joystick.maxDistance);
         this.joystick.angle = Math.atan2(dy, dx);
         
         // Calculate normalized input
         if (distance > 0) {
             const normalizedDistance = this.joystick.distance / this.joystick.maxDistance;
             this.touchInput.x = Math.cos(this.joystick.angle) * normalizedDistance;
             this.touchInput.y = Math.sin(this.joystick.angle) * normalizedDistance;
         }
         
         // Update knob position
         const knobX = Math.cos(this.joystick.angle) * this.joystick.distance;
         const knobY = Math.sin(this.joystick.angle) * this.joystick.distance;
         
         const joystickKnob = document.getElementById('joystick-knob');
         if (joystickKnob) {
             joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
         }
     }
     
     async loadConfig() {
         try {
             const response = await fetch('config.json');
             if (response.ok) {
                 this.config = await response.json();
             } else {
                 this.config = { ...this.defaultConfig };
             }
         } catch (error) {
             console.warn('Failed to load config, using defaults:', error);
             this.config = { ...this.defaultConfig };
         }
         
         this.levelStartTime = performance.now();
         this.startGameLoop();
     }
     
     startGameLoop() {
         this.lastTime = performance.now();
         this.gameLoop();
     }
     
     gameLoop() {
         const currentTime = performance.now();
         const deltaTime = (currentTime - this.lastTime) / 1000;
         this.lastTime = currentTime;
         
         this.update(deltaTime);
         this.render();
         
         requestAnimationFrame(() => this.gameLoop());
     }
     
     update(deltaTime) {
         if (this.gameState === 'playing') {
             this.checkLevelUp();
             this.updatePlayer(deltaTime);
             this.spawnEnemies(deltaTime);
             this.updateEnemies(deltaTime);
             this.fireBullets(deltaTime);
             this.updateBullets(deltaTime);
             this.checkCollisions();
         } else if (this.gameState === 'levelUp') {
             this.levelUpBannerTimer += deltaTime * 1000;
             if (this.levelUpBannerTimer >= this.levelUpBannerDuration) {
                 this.showUpgradeMenu();
             }
         }
     }
     
     checkLevelUp() {
         const currentTime = performance.now();
         const timeSinceLevel = currentTime - this.levelStartTime;
         
         if (timeSinceLevel >= this.levelDuration) {
             this.levelUp();
         }
     }
     
     levelUp() {
         this.level++;
         this.levelStartTime = performance.now();
         this.levelUpBannerTimer = 0;
         this.showLevelUpBanner = true;
         
         // Increase enemy spawn rate
         this.config.enemySpawnRate = this.defaultConfig.enemySpawnRate + (this.level - 1) * 0.5;
         
         this.gameState = 'levelUp';
     }
     
     showUpgradeMenu() {
         this.gameState = 'upgrading';
         this.showLevelUpBanner = false;
         
         // Generate 3 random upgrade options
         const shuffled = [...this.availableUpgrades].sort(() => Math.random() - 0.5);
         this.currentUpgradeOptions = shuffled.slice(0, 3);
         this.selectedUpgradeIndex = 0;
     }
     
     selectUpgrade(index) {
         if (index >= 0 && index < this.currentUpgradeOptions.length) {
             const upgrade = this.currentUpgradeOptions[index];
             this.upgrades[upgrade.type]++;
             
             console.log(`Applied upgrade: ${upgrade.name}`);
             
             this.gameState = 'playing';
             this.currentUpgradeOptions = [];
         }
     }
     
     updatePlayer(deltaTime) {
         const baseSpeed = this.player.speed + (this.upgrades.speed * 0.5);
         const speed = baseSpeed * 60 * deltaTime;
         
         let moveX = 0, moveY = 0;
         
         // Desktop keyboard input
         if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
         if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
         if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
         if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
         
         // Mobile touch input
         if (this.joystick.active) {
             moveX = this.touchInput.x;
             moveY = this.touchInput.y;
         }
         
         // Apply movement with boundary checking
         this.player.x = Math.max(this.player.size / 2, 
                         Math.min(this.canvas.width - this.player.size / 2, 
                         this.player.x + moveX * speed));
         this.player.y = Math.max(this.player.size / 2, 
                         Math.min(this.canvas.height - this.player.size / 2, 
                         this.player.y + moveY * speed));
     }
     
     spawnEnemies(deltaTime) {
         this.enemySpawnTimer += deltaTime;
         
         if (this.enemySpawnTimer >= 1 / this.config.enemySpawnRate) {
             this.enemySpawnTimer = 0;
             
             // Spawn from random edge
             const edge = Math.floor(Math.random() * 4);
             let x, y;
             
             switch (edge) {
                 case 0: // Top
                     x = Math.random() * this.canvas.width;
                     y = -20;
                     break;
                 case 1: // Right
                     x = this.canvas.width + 20;
                     y = Math.random() * this.canvas.height;
                     break;
                 case 2: // Bottom
                     x = Math.random() * this.canvas.width;
                     y = this.canvas.height + 20;
                     break;
                 case 3: // Left
                     x = -20;
                     y = Math.random() * this.canvas.height;
                     break;
             }
             
             this.enemies.push({
                 x: x,
                 y: y,
                 size: 15,
                 speed: 2 + this.level * 0.1
             });
         }
     }
     
     updateEnemies(deltaTime) {
         for (let i = this.enemies.length - 1; i >= 0; i--) {
             const enemy = this.enemies[i];
             
             // Move towards player
             const dx = this.player.x - enemy.x;
             const dy = this.player.y - enemy.y;
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             if (distance > 0) {
                 const speed = enemy.speed * 60 * deltaTime;
                 enemy.x += (dx / distance) * speed;
                 enemy.y += (dy / distance) * speed;
             }
             
             // Remove off-screen enemies
             if (enemy.x < -100 || enemy.x > this.canvas.width + 100 ||
                 enemy.y < -100 || enemy.y > this.canvas.height + 100) {
                 this.enemies.splice(i, 1);
             }
         }
     }
     
     fireBullets(deltaTime) {
         this.bulletFireTimer += deltaTime;
         
         if (this.bulletFireTimer >= 0.3) {
             this.bulletFireTimer = 0;
             
             // Base 4 directions
             const directions = [
                 { x: 0, y: -1 }, // Up
                 { x: 1, y: 0 },  // Right
                 { x: 0, y: 1 },  // Down
                 { x: -1, y: 0 }  // Left
             ];
             
             // Add diagonal directions based on upgrades
             if (this.upgrades.extraDirections > 0) {
                 directions.push(
                     { x: 1, y: -1 },  // Up-Right
                     { x: 1, y: 1 },   // Down-Right
                     { x: -1, y: 1 },  // Down-Left
                     { x: -1, y: -1 }  // Up-Left
                 );
             }
             
             const bulletSpeed = this.config.bulletSpeed + (this.upgrades.bulletSpeed * 1.5);
             
             directions.forEach(dir => {
                 this.bullets.push({
                     x: this.player.x,
                     y: this.player.y,
                     vx: dir.x * bulletSpeed,
                     vy: dir.y * bulletSpeed,
                     size: 4
                 });
             });
         }
     }
     
     updateBullets(deltaTime) {
         for (let i = this.bullets.length - 1; i >= 0; i--) {
             const bullet = this.bullets[i];
             
             bullet.x += bullet.vx * 60 * deltaTime;
             bullet.y += bullet.vy * 60 * deltaTime;
             
             // Remove off-screen bullets
             if (bullet.x < 0 || bullet.x > this.canvas.width ||
                 bullet.y < 0 || bullet.y > this.canvas.height) {
                 this.bullets.splice(i, 1);
             }
         }
     }
     
     checkCollisions() {
         // Bullet-Enemy collisions
         for (let i = this.bullets.length - 1; i >= 0; i--) {
             const bullet = this.bullets[i];
             
             for (let j = this.enemies.length - 1; j >= 0; j--) {
                 const enemy = this.enemies[j];
                 
                 const dx = bullet.x - enemy.x;
                 const dy = bullet.y - enemy.y;
                 const distance = Math.sqrt(dx * dx + dy * dy);
                 
                 if (distance < (bullet.size + enemy.size) / 2) {
                     this.bullets.splice(i, 1);
                     this.enemies.splice(j, 1);
                     this.score += 10;
                     break;
                 }
             }
         }
         
         // Player-Enemy collisions
         for (const enemy of this.enemies) {
             const dx = this.player.x - enemy.x;
             const dy = this.player.y - enemy.y;
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             if (distance < (this.player.size + enemy.size) / 2) {
                 this.gameOver();
                 break;
             }
         }
     }
     
     gameOver() {
         this.gameState = 'gameOver';
         this.showMobileRestartButton();
     }
     
     showMobileRestartButton() {
         const restartBtn = document.getElementById('mobile-restart-btn');
         if (restartBtn) {
             restartBtn.style.display = 'block';
             restartBtn.onclick = () => this.restart();
         }
     }
     
     restart() {
         // Reset game state
         this.gameState = 'playing';
         this.score = 0;
         this.level = 1;
         this.levelStartTime = performance.now();
         this.enemySpawnTimer = 0;
         this.bulletFireTimer = 0;
         this.showLevelUpBanner = false;
         this.levelUpBannerTimer = 0;
         
         // Reset upgrades
         this.upgrades = {
             speed: 0,
             bulletSpeed: 0,
             extraDirections: 0
         };
         
         // Reset config
         this.config = { ...this.defaultConfig };
         
         // Reset player
         this.player.x = this.canvas.width / 2;
         this.player.y = this.canvas.height / 2;
         
         // Clear arrays
         this.enemies = [];
         this.bullets = [];
         this.currentUpgradeOptions = [];
         
         // Hide restart button
         const restartBtn = document.getElementById('mobile-restart-btn');
         if (restartBtn) {
             restartBtn.style.display = 'none';
         }
     }
     
     // Fullscreen functionality
     toggleFullscreen() {
         if (!document.fullscreenElement) {
             // Enter fullscreen
             const gameContainer = document.querySelector('.game-container');
             if (gameContainer.requestFullscreen) {
                 gameContainer.requestFullscreen();
             } else if (gameContainer.webkitRequestFullscreen) {
                 gameContainer.webkitRequestFullscreen();
             } else if (gameContainer.msRequestFullscreen) {
                 gameContainer.msRequestFullscreen();
             }
         } else {
             // Exit fullscreen
             if (document.exitFullscreen) {
                 document.exitFullscreen();
             } else if (document.webkitExitFullscreen) {
                 document.webkitExitFullscreen();
             } else if (document.msExitFullscreen) {
                 document.msExitFullscreen();
             }
         }
     }
     
     onFullscreenChange() {
         const fullscreenBtn = document.getElementById('fullscreen-btn');
         const fullscreenIcon = fullscreenBtn?.querySelector('.fullscreen-icon');
         
         if (document.fullscreenElement) {
             // In fullscreen mode
             if (fullscreenIcon) {
                 fullscreenIcon.textContent = '⛶'; // Exit fullscreen icon
             }
             if (fullscreenBtn) {
                 fullscreenBtn.title = 'Tam Ekrandan Çık';
             }
             
             // Resize canvas for fullscreen
             this.canvas.width = window.innerWidth;
             this.canvas.height = window.innerHeight;
             
             // Adjust player position if needed
             this.player.x = Math.min(this.player.x, this.canvas.width - this.player.size);
             this.player.y = Math.min(this.player.y, this.canvas.height - this.player.size);
         } else {
             // Not in fullscreen mode
             if (fullscreenIcon) {
                 fullscreenIcon.textContent = '⛶'; // Enter fullscreen icon
             }
             if (fullscreenBtn) {
                 fullscreenBtn.title = 'Tam Ekran';
             }
             
             // Restore original canvas size
             this.resizeCanvas();
             
             // Adjust player position if needed
             this.player.x = Math.min(this.player.x, this.canvas.width - this.player.size);
             this.player.y = Math.min(this.player.y, this.canvas.height - this.player.size);
         }
     }
     
     render() {
         // Clear canvas
         this.ctx.fillStyle = '#000011';
         this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
         
         // Draw grid
         this.drawGrid();
         
         // Draw game objects
         this.drawPlayer();
         this.drawEnemies();
         this.drawBullets();
         
         // Draw UI
         this.drawUI();
         
         // Draw overlays
         if (this.showLevelUpBanner) {
             this.drawLevelUpBanner();
         }
         
         if (this.gameState === 'upgrading') {
             this.drawUpgradeMenu();
         }
         
         if (this.gameState === 'gameOver') {
             this.drawGameOver();
         }
     }
     
     drawGrid() {
         this.ctx.strokeStyle = '#001133';
         this.ctx.lineWidth = 1;
         
         for (let x = 0; x < this.canvas.width; x += 40) {
             this.ctx.beginPath();
             this.ctx.moveTo(x, 0);
             this.ctx.lineTo(x, this.canvas.height);
             this.ctx.stroke();
         }
         
         for (let y = 0; y < this.canvas.height; y += 40) {
             this.ctx.beginPath();
             this.ctx.moveTo(0, y);
             this.ctx.lineTo(this.canvas.width, y);
             this.ctx.stroke();
         }
     }
     
     drawPlayer() {
         this.ctx.fillStyle = '#00ffff';
         this.ctx.shadowColor = '#00ffff';
         this.ctx.shadowBlur = 10;
         this.ctx.fillRect(
             this.player.x - this.player.size / 2,
             this.player.y - this.player.size / 2,
             this.player.size,
             this.player.size
         );
         this.ctx.shadowBlur = 0;
     }
     
     drawEnemies() {
         this.enemies.forEach(enemy => {
             this.ctx.fillStyle = '#ff3366';
             this.ctx.shadowColor = '#ff3366';
             this.ctx.shadowBlur = 8;
             this.ctx.fillRect(
                 enemy.x - enemy.size / 2,
                 enemy.y - enemy.size / 2,
                 enemy.size,
                 enemy.size
             );
         });
         this.ctx.shadowBlur = 0;
     }
     
     drawBullets() {
         this.bullets.forEach(bullet => {
             this.ctx.fillStyle = '#ffff00';
             this.ctx.shadowColor = '#ffff00';
             this.ctx.shadowBlur = 5;
             this.ctx.fillRect(
                 bullet.x - bullet.size / 2,
                 bullet.y - bullet.size / 2,
                 bullet.size,
                 bullet.size
             );
         });
         this.ctx.shadowBlur = 0;
     }
     
     drawUI() {
         const fontSize = this.isMobile ? 16 : 20;
         this.ctx.fillStyle = '#00ffff';
         this.ctx.font = `${fontSize}px monospace`;
         this.ctx.textAlign = 'left';
         this.ctx.shadowColor = '#00ffff';
         this.ctx.shadowBlur = 5;
         
         const spacing = this.isMobile ? 25 : 30;
         let y = this.isMobile ? 25 : 40;
         
         this.ctx.fillText(`Score: ${this.score}`, 10, y);
         y += spacing;
         this.ctx.fillText(`Level: ${this.level}`, 10, y);
         y += spacing;
         this.ctx.fillText(`Enemies: ${this.enemies.length}`, 10, y);
         y += spacing;
         
         const directions = this.upgrades.extraDirections > 0 ? '8-Way' : '4-Way';
         this.ctx.fillText(`Bullets: ${directions}`, 10, y);
         y += spacing;
         
         // Level progress
         const timeSinceLevel = (performance.now() - this.levelStartTime) / 1000;
         const timeLeft = Math.max(0, this.levelDuration / 1000 - timeSinceLevel);
         this.ctx.fillText(`Next: ${timeLeft.toFixed(1)}s`, 10, y);
         
         this.ctx.shadowBlur = 0;
     }
     
     drawLevelUpBanner() {
         this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
         this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
         
         this.ctx.fillStyle = '#ffff00';
         this.ctx.font = this.isMobile ? 'bold 32px monospace' : 'bold 48px monospace';
         this.ctx.textAlign = 'center';
         this.ctx.shadowColor = '#ffff00';
         this.ctx.shadowBlur = 20;
         
         this.ctx.fillText('LEVEL UP!', this.canvas.width / 2, this.canvas.height / 2 - 20);
         
         this.ctx.font = this.isMobile ? '18px monospace' : '24px monospace';
         this.ctx.fillText(`Level ${this.level}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
         
         this.ctx.shadowBlur = 0;
     }
     
     drawUpgradeMenu() {
         this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
         this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
         
         this.ctx.fillStyle = '#00ffff';
         this.ctx.font = this.isMobile ? 'bold 24px monospace' : 'bold 32px monospace';
         this.ctx.textAlign = 'center';
         this.ctx.shadowColor = '#00ffff';
         this.ctx.shadowBlur = 10;
         this.ctx.fillText('CHOOSE UPGRADE', this.canvas.width / 2, this.isMobile ? 80 : 150);
         
         const fontSize = this.isMobile ? 16 : 20;
         this.ctx.font = `${fontSize}px monospace`;
         
         for (let i = 0; i < this.currentUpgradeOptions.length; i++) {
             const option = this.currentUpgradeOptions[i];
             const y = (this.isMobile ? 150 : 250) + i * (this.isMobile ? 60 : 80);
             const margin = this.isMobile ? 20 : 100;
             
             this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
             this.ctx.fillRect(margin, y - 25, this.canvas.width - margin * 2, this.isMobile ? 50 : 60);
             
             this.ctx.strokeStyle = '#00ffff';
             this.ctx.lineWidth = 2;
             this.ctx.strokeRect(margin, y - 25, this.canvas.width - margin * 2, this.isMobile ? 50 : 60);
             
             this.ctx.fillStyle = '#00ffff';
             this.ctx.textAlign = 'left';
             this.ctx.fillText(`${i + 1}. ${option.name}`, margin + 10, y - 5);
             
             this.ctx.font = `${fontSize - 2}px monospace`;
             this.ctx.fillStyle = '#aaaaaa';
             this.ctx.fillText(option.description, margin + 10, y + 15);
             this.ctx.font = `${fontSize}px monospace`;
         }
         
         this.ctx.fillStyle = '#ffff00';
         this.ctx.font = `${fontSize - 2}px monospace`;
         this.ctx.textAlign = 'center';
         const instructionText = this.isMobile ? 'Tap 1, 2, or 3' : 'Press 1, 2, or 3';
         this.ctx.fillText(instructionText, this.canvas.width / 2, this.canvas.height - 30);
         
         this.ctx.shadowBlur = 0;
     }
     
     drawGameOver() {
         this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
         this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
         
         this.ctx.fillStyle = '#ff0066';
         this.ctx.font = this.isMobile ? 'bold 32px monospace' : 'bold 48px monospace';
         this.ctx.textAlign = 'center';
         this.ctx.shadowColor = '#ff0066';
         this.ctx.shadowBlur = 20;
         
         this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);
         
         this.ctx.font = this.isMobile ? '18px monospace' : '24px monospace';
         this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
         this.ctx.fillText(`Level Reached: ${this.level}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
         
         const restartText = this.isMobile ? 'Tap to Restart' : 'Click to Restart';
         this.ctx.fillText(restartText, this.canvas.width / 2, this.canvas.height / 2 + 50);
         
         this.ctx.shadowBlur = 0;
     }
     
     // AdMob Integration Placeholders (commented for future use)
     /*
     initializeAdMob() {
         // Initialize AdMob SDK
         // document.addEventListener('deviceready', () => {
         //     if (window.AdMob) {
         //         AdMob.setOptions({
         //             publisherId: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
         //             interstitialAdId: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
         //             bannerAdId: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
         //             autoShowBanner: true,
         //             autoShowInterstitial: false
         //         });
         //     }
         // });
     }
     
     showRewardedAd() {
         // Show rewarded ad for extra lives or upgrades
         // if (window.AdMob) {
         //     AdMob.showRewardedAd((success) => {
         //         if (success) {
         //             // Grant reward (extra life, coins, etc.)
         //             this.grantReward();
         //         }
         //     });
         // }
     }
     
     showBannerAd() {
         // Show banner ad
         // if (window.AdMob) {
         //     AdMob.showBanner();
         // }
     }
     
     grantReward() {
         // Grant player reward from watching ad
         // this.score += 100;
         // or this.player.lives++;
     }
     */
 }
 
 // Start the game when page loads
 window.addEventListener('load', () => {
     console.log('Starting NeonSurvivor...');
     new NeonSurvivor();
 });
