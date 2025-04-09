class MusicalChairsGame {
    constructor() {
        this.state = {
            players: 3,
            eliminated: [],
            currentRound: 0,
            isPlaying: false,
            isPaused: false,
            isSetupPhase: false
        };

        this.timers = {
            game: null,
            setup: null
        };
        this.currentLang = 'en';
        this.initializeElements();
        this.initializeEventListeners();
        this.updateDisplay();
        this.updateCurrentPlayersDisplay();
    }

    initializeElements() {
        this.langToggleButton = document.getElementById('langToggle');

        // Game controls
        this.startButton = document.getElementById('startGame');
        this.pauseButton = document.getElementById('pauseGame');
        this.resetButton = document.getElementById('resetGame');
        this.returnPlayerButton = document.getElementById('returnPlayer');
        this.closeModalButton = document.getElementById('closeModal');
        this.gameModal = document.getElementById('gameModal');

        // Player management
        this.playerCountInput = document.getElementById('playerCount');
        this.addPlayerButton = document.getElementById('addPlayer');
        this.removePlayerButton = document.getElementById('removePlayer');
        this.eliminatedPlayersDiv = document.getElementById('eliminatedPlayers');

        // Music controls
        this.musicFileInput = document.getElementById('musicFile');
        this.audioElement = document.getElementById('gameAudio');
        this.removeMusicButton = document.getElementById('removeMusic');

        // Timer settings
        this.minDurationInput = document.getElementById('minDuration');
        this.maxDurationInput = document.getElementById('maxDuration');
        this.setupTimeInput = document.getElementById('setupTime');

        // Display elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.gameStatus = document.getElementById('gameStatus');
        this.chairsDisplay = document.getElementById('chairsDisplay');
        this.playersDisplay = document.getElementById('playersDisplay');

                // Add new elements
                this.lastRoundToggle = document.getElementById('lastRoundToggle');
                this.lastRoundSettings = document.getElementById('lastRoundSettings');
                this.lastRoundDuration = document.getElementById('lastRoundDuration');

        this.currentPlayersContainer = document.getElementById('currentPlayersContainer');
    }

    initializeEventListeners() {
        this.startButton.addEventListener('click', () => {
            if (!this.audioElement.src) {
                alert('Please upload music first!');
                return;
            }
            if (this.state.players < 3) {
                alert('Minimum 3 players required!');
                return;
            }
            this.gameModal.style.display = 'block';
            this.startGame();
        });

        this.closeModalButton.addEventListener('click', () => {
            this.gameModal.style.display = 'none';
            this.resetGame();
        });

        this.langToggleButton.addEventListener('click', () => this.toggleLanguage());

        this.pauseButton.addEventListener('click', () => this.togglePause());
        this.resetButton.addEventListener('click', () => this.resetGame());
        this.returnPlayerButton.addEventListener('click', () => this.returnPlayer());

        this.addPlayerButton.addEventListener('click', () => this.addPlayer());
        this.removePlayerButton.addEventListener('click', () => this.removePlayer());
        
        this.musicFileInput.addEventListener('change', (e) => this.handleMusicUpload(e));
        this.removeMusicButton.addEventListener('click', () => this.removeMusic());

        this.playerCountInput.addEventListener('change', () => this.updatePlayersCount());

        this.lastRoundToggle.addEventListener('change', (e) => {
            this.lastRoundSettings.classList.toggle('hidden');
        });

        this.musicFileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'No file selected';
            const fileNameDiv = e.target.parentElement.querySelector('.file-name');
            if (fileNameDiv) {
                fileNameDiv.textContent = fileName;
            }
        });
    

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.gameModal) {
                this.gameModal.style.display = 'none';
                this.resetGame();
            }
        });
    }

    toggleLanguage() {
        this.currentLang = this.currentLang === 'en' ? 'si' : 'en';
        this.langToggleButton.textContent = this.currentLang === 'en' ? 'සිංහල' : 'English';
        this.updateAllText();
    }

    updateAllText() {
        // Update all static text elements
        document.querySelector('.game-header h1').textContent = translations[this.currentLang].title;
        
        // Update section headers
        const sections = document.querySelectorAll('.panel-section h2');
        sections[0].textContent = translations[this.currentLang].playerManagement;
        sections[1].textContent = translations[this.currentLang].musicControls;
        sections[2].textContent = translations[this.currentLang].timerSettings;

        // Update labels
        document.querySelector('label[for="playerCount"]').textContent = translations[this.currentLang].numberOfPlayers;
        document.querySelector('label[for="musicFile"]').textContent = translations[this.currentLang].uploadMusic;
        document.querySelector('label[for="minDuration"]').textContent = translations[this.currentLang].minDuration;
        document.querySelector('label[for="maxDuration"]').textContent = translations[this.currentLang].maxDuration;
        document.querySelector('label[for="setupTime"]').textContent = translations[this.currentLang].setupTime;
        document.querySelector('label[for="lastRoundDuration"]').textContent = translations[this.currentLang].lastRoundDuration;

        // Update buttons
        this.addPlayerButton.textContent = translations[this.currentLang].addPlayer;
        this.removePlayerButton.textContent = translations[this.currentLang].removePlayer;
        this.removeMusicButton.textContent = translations[this.currentLang].removeMusic;
        this.startButton.textContent = translations[this.currentLang].startGame;
        this.resetButton.textContent = translations[this.currentLang].reset;
        this.returnPlayerButton.textContent = translations[this.currentLang].return;
        
        // Update pause button based on current state
        this.pauseButton.textContent = this.state.isPaused ? 
            translations[this.currentLang].resume : 
            translations[this.currentLang].pause;

        // Update file upload label
        const fileUploadLabel = document.querySelector('.file-upload-label');
        if (fileUploadLabel) {
            fileUploadLabel.textContent = translations[this.currentLang].chooseMusicFile;
        }

        // Update eliminated players section
        const eliminatedHeader = document.querySelector('.modal-eliminated-section h3');
        if (eliminatedHeader) {
            eliminatedHeader.textContent = translations[this.currentLang].eliminatedPlayers;
        }

        // Update current game status
        this.updateGameStatus(this.gameStatus.textContent);
    }

    startGame() {
        if (!this.audioElement.src) {
            alert(translations[this.currentLang].pleaseUploadMusic);
            return;
        }
        if (this.state.players < 3) {
            alert(translations[this.currentLang].minimumPlayers);
            return;
        }
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.audioElement.play();

        let duration;
        
        // Check if it's the last round (2 players) and custom timer is enabled
        if (this.state.players === 2 && this.lastRoundToggle.checked) {
            duration = parseInt(this.lastRoundDuration.value) * 1000;
        } else {
            const minDuration = parseInt(this.minDurationInput.value) * 1000;
            const maxDuration = parseInt(this.maxDurationInput.value) * 1000;
            duration = Math.floor(Math.random() * (maxDuration - minDuration + 1) + minDuration);
        }

        this.timers.game = setTimeout(() => this.stopMusic(), duration);
        this.updateGameStatus('Game in progress...');
    }


    stopMusic() {
        this.audioElement.pause();
    
        // Check if this is the final round (2 players)
        if (this.state.players === 2) {
            // Last round finished - we have a winner!
            clearTimeout(this.timers.game);
            clearInterval(this.timers.setup);
            this.state.isPlaying = false;
            this.updateGameStatus('Game Over! Winner found!');
            this.eliminatePlayer();  // Eliminate the last losing player
            this.updateDisplay();
        } else {
            // Normal round
            this.state.isSetupPhase = true;
            this.startSetupPhase();
            this.updateGameStatus('Find a chair! Next round starting soon...');
        }
    }

    startSetupPhase() {
        let setupTime = parseInt(this.setupTimeInput.value);
        this.updateTimerDisplay(setupTime);

        this.timers.setup = setInterval(() => {
            setupTime--;
            this.updateTimerDisplay(setupTime);

            if (setupTime <= 0) {
                this.endRound();
            }
        }, 1000);
    }

    // Update the endRound method to properly handle the custom last round timer
endRound() {
    clearInterval(this.timers.setup);
    this.state.currentRound++;
    this.eliminatePlayer();
    this.state.isSetupPhase = false;
    
    // Continue to next round if there are players remaining
    if (this.state.players >= 2) {
        this.state.isPlaying = true;
        
        if (this.state.players === 2) {
            this.updateGameStatus('Final Round! One chair left...');
        } else {
            this.updateGameStatus('Next round starting...');
        }
        
        this.audioElement.play();
        
        // Check for custom last round timer
        let duration;
        if (this.state.players === 2 && this.lastRoundToggle.checked) {
            duration = parseInt(this.lastRoundDuration.value) * 1000;
        } else {
            const minDuration = parseInt(this.minDurationInput.value) * 1000;
            const maxDuration = parseInt(this.maxDurationInput.value) * 1000;
            duration = Math.floor(Math.random() * (maxDuration - minDuration + 1) + minDuration);
        }
        
        this.timers.game = setTimeout(() => this.stopMusic(), duration);
    } else {
        // Game over when only 1 player remains (winner)
        this.state.isPlaying = false;
        this.updateGameStatus('Game Over! Winner found!');
    }
    
    this.updateDisplay();
}

    eliminatePlayer() {
        const playerNumber = this.state.players;
        this.state.eliminated.push(`Player ${playerNumber}`);
        this.state.players--;
        this.updateEliminatedPlayers();
    }

    togglePause() {
        if (!this.state.isPlaying) return;

        this.state.isPaused = !this.state.isPaused;
        if (this.state.isPaused) {
            this.audioElement.pause();
            clearTimeout(this.timers.game);
            this.updateGameStatus('Game paused');
            this.pauseButton.textContent = 'Resume';
        } else {
            this.audioElement.play();
            this.startGame();
            this.updateGameStatus('Game resumed');
            this.pauseButton.textContent = 'Pause';
        }
    }

    resetGame() {
        this.state.players = parseInt(this.playerCountInput.value);
        this.state.eliminated = [];
        this.state.currentRound = 0;
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.isSetupPhase = false;

        clearTimeout(this.timers.game);
        clearInterval(this.timers.setup);

        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.pauseButton.textContent = 'Pause';

        this.updateDisplay();
        this.updateGameStatus('Game reset');
        this.updateTimerDisplay(0);
    }

    returnPlayer() {
        if (this.state.eliminated.length === 0) return;

        this.state.players++;
        this.state.eliminated.pop();
        this.updateDisplay();
        this.updateEliminatedPlayers();
        this.updateGameStatus('Player returned to game');
    }

    addPlayer() {
        this.state.players++;
        this.playerCountInput.value = this.state.players;
        this.updateDisplay();
        this.updateCurrentPlayersDisplay();
    }

    removePlayer() {
        if (this.state.players > 3) {
            this.state.players--;
            this.playerCountInput.value = this.state.players;
            this.updateDisplay();
            this.updateCurrentPlayersDisplay();
        }
    }

    updateCurrentPlayersDisplay() {
        this.currentPlayersContainer.innerHTML = '';
        
        for (let i = 1; i <= this.state.players; i++) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'current-player';
            
            // Create player avatar
            const player = document.createElement('div');
            player.className = 'player';
            
            const playerBody = document.createElement('div');
            playerBody.className = 'player-body';
            
            // Add number inside the body
            const numberDiv = document.createElement('div');
            numberDiv.className = 'player-number-display';
            numberDiv.textContent = i;
            playerBody.appendChild(numberDiv);
            
            const playerHead = document.createElement('div');
            playerHead.className = 'player-head';
            
            // Assemble player avatar
            playerBody.appendChild(playerHead);
            player.appendChild(playerBody);
            
            playerDiv.appendChild(player);
            this.currentPlayersContainer.appendChild(playerDiv);
        }
    }


    handleMusicUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            this.audioElement.src = url;
        }
    }

    removeMusic() {
        this.audioElement.src = '';
        this.musicFileInput.value = '';
        // Clear the file name display
        const fileNameDiv = this.musicFileInput.parentElement.querySelector('.file-name');
        if (fileNameDiv) {
            fileNameDiv.textContent = '';
        }
    }

    updatePlayersCount() {
        const newCount = parseInt(this.playerCountInput.value);
        if (newCount >= 3) {
            this.state.players = newCount;
            this.updateDisplay();
            this.updateCurrentPlayersDisplay();
        } else {
            alert('Minimum 3 players required!');
            this.playerCountInput.value = 3;
        }
    }

    updateDisplay() {
        // Update chairs display
        this.chairsDisplay.innerHTML = '';
        for (let i = 0; i < this.state.players - 1; i++) {
            const chair = document.createElement('div');
            chair.className = 'chair';
            
            // Add chair number
            const chairNumber = document.createElement('div');
            chairNumber.className = 'chair-number';
            chairNumber.textContent = i + 1;
            chair.appendChild(chairNumber);
            
            this.chairsDisplay.appendChild(chair);
        }
    
        // Update active players display
        this.playersDisplay.innerHTML = '';
        for (let i = 0; i < this.state.players; i++) {
            const player = document.createElement('div');
            player.className = 'player';
            
            const playerBody = document.createElement('div');
            playerBody.className = 'player-body';
            
            // Add player number
            const numberDiv = document.createElement('div');
            numberDiv.className = 'player-number-display';
            numberDiv.textContent = i + 1;
            playerBody.appendChild(numberDiv);
            
            const playerHead = document.createElement('div');
            playerHead.className = 'player-head';
            
            playerBody.appendChild(playerHead);
            player.appendChild(playerBody);
            
            this.playersDisplay.appendChild(player);
        }
    
        this.updateEliminatedPlayers();
    }
    
    updateEliminatedPlayers() {
        this.eliminatedPlayersDiv.innerHTML = '';
        
        if (this.state.eliminated.length === 0) {
            const message = document.createElement('div');
            message.className = 'eliminated-player-label';
            message.textContent = translations[this.currentLang].noEliminatedPlayers;
            this.eliminatedPlayersDiv.appendChild(message);
            return;
        }
        
        // Create container for eliminated players
        const container = document.createElement('div');
        container.className = 'eliminated-players-container';
        
        this.state.eliminated.forEach((playerLabel, index) => {
            const player = document.createElement('div');
            player.className = 'player';
            
            const playerBody = document.createElement('div');
            playerBody.className = 'player-body';
            
            // Add player number
            const numberDiv = document.createElement('div');
            numberDiv.className = 'player-number-display';
            // Extract number from playerLabel (e.g., "Player 5" -> 5)
            const playerNumber = parseInt(playerLabel.split(' ')[1]);
            numberDiv.textContent = playerNumber;
            playerBody.appendChild(numberDiv);
            
            const playerHead = document.createElement('div');
            playerHead.className = 'player-head';
            
            playerBody.appendChild(playerHead);
            player.appendChild(playerBody);
            container.appendChild(player);
        });
        
        this.eliminatedPlayersDiv.appendChild(container);
    }

    updateGameStatus(status) {
        // Map English status to corresponding translation key
        const statusKeys = {
            'Ready to start': 'readyToStart',
            'Game in progress...': 'gameInProgress',
            'Find a chair! Next round starting soon...': 'findChair',
            'Final Round! One chair left...': 'finalRound',
            'Game Over! Winner found!': 'gameOver',
            'Game paused': 'gamePaused',
            'Game resumed': 'gameResumed'
        };

        const key = statusKeys[status] || status;
        this.gameStatus.textContent = translations[this.currentLang][key] || status;
    }

    updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        this.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new MusicalChairsGame();
});