class MusicalChairsGame {
    constructor() {
        this.state = {
            players: 3,
            eliminated: [],
            currentRound: 0,
            isPlaying: false,
            isSetupPhase: false
        };
        
        this.currentLang = 'en'; // Set default language to English

        this.timers = {
            game: null,
            setup: null
        };
        
        // Create bound handler references
        this.resetHandler = this.resetGame.bind(this);
        this.restartHandler = this.restartGame.bind(this);
        this.returnHandler = this.returnPlayer.bind(this);
        this.returnStartHandler = this.returnStartGame.bind(this);
        
        this.initializeElements();
        this.initializeEventListeners();
        
        // Try to load saved settings first
        const loadedSettings = this.loadSettingsFromLocalStorage();
        
        // Only run these if settings weren't loaded
        if (!loadedSettings) {
            this.updateDisplay();
            this.updateCurrentPlayersDisplay();
            this.updateRemovePlayerButtonState();
            this.updateStartButtonState(false);
            this.validateTimerSettings();
        }
        
        this.preCalculatedDurations = this.preCalculatedDurations || [];
        this.hasCalculatedDurations = false; // Add this flag
    }

    initializeElements() {
        this.langToggleButton = document.getElementById('langToggle');

        // Game controls
        this.startButton = document.getElementById('startGame');
        this.resetButton = document.getElementById('resetGame');
        this.returnPlayerButton = document.getElementById('returnPlayer');
        this.returnPlayerButton.disabled = true; // Initially disable the return button
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
        this.removeMusicButton.disabled = !this.audioElement.src; // Initially disable the remove music button if no music is selected

        // Timer settings
        this.minDurationMinInput = document.getElementById('minDurationMin');
        this.minDurationSecInput = document.getElementById('minDurationSec');
        this.maxDurationMinInput = document.getElementById('maxDurationMin');
        this.maxDurationSecInput = document.getElementById('maxDurationSec');
        this.setupTimeMinInput = document.getElementById('setupTimeMin');
        this.setupTimeSecInput = document.getElementById('setupTimeSec');
        
        // Add these missing display elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.gameStatus = document.getElementById('gameStatus');
        this.chairsDisplay = document.getElementById('chairsDisplay');
        this.playersDisplay = document.getElementById('playersDisplay');
        
        // Last round elements
        this.lastRoundToggle = document.getElementById('lastRoundToggle');
        this.lastRoundSettings = document.getElementById('lastRoundSettings');
        
        // Last round min/max duration inputs
        this.lastRoundMinDurationMinInput = document.getElementById('lastRoundMinDurationMin');
        this.lastRoundMinDurationSecInput = document.getElementById('lastRoundMinDurationSec');
        this.lastRoundMaxDurationMinInput = document.getElementById('lastRoundMaxDurationMin');
        this.lastRoundMaxDurationSecInput = document.getElementById('lastRoundMaxDurationSec');

        this.currentPlayersContainer = document.getElementById('currentPlayersContainer');
        
        // Song duration estimate
        this.songDurationEstimateDisplay = document.getElementById('songDurationEstimate');
        
        // Pre-calculate durations elements
        this.calculateDurationsButton = document.getElementById('calculateDurations');
        this.exactDurationDisplay = document.getElementById('exactDurationDisplay');
        this.exactDurationResult = document.getElementById('exactDurationResult');
        this.regenerateDurationsButton = document.getElementById('regenerateDurations');
        this.saveTimerSettingsButton = document.getElementById('saveTimerSettings'); // Add this line

        // Settings management buttons
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
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
            
            // Add this line to update the display before starting the game
            this.updateDisplay();
            
            this.startGame();
        });

        this.closeModalButton.addEventListener('click', () => {
            this.gameModal.style.display = 'none';
            this.resetGame();
        });

        this.resetButton.addEventListener('click', this.resetHandler);
        this.returnPlayerButton.addEventListener('click', this.returnHandler);


        this.removePlayerButton.addEventListener('click', () => this.removePlayer());
        
        this.musicFileInput.addEventListener('change', (e) => this.handleMusicUpload(e));
        this.removeMusicButton.addEventListener('click', () => this.removeMusic());

        this.playerCountInput.addEventListener('change', () => this.updatePlayersCount());

        this.musicFileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'No file selected';
            const fileNameDiv = e.target.parentElement.querySelector('.file-name');
            if (fileNameDiv) {
                fileNameDiv.textContent = fileName;
            }
        });
    
        // Add these event listeners for the minimum duration inputs
        this.minDurationMinInput.addEventListener('change', () => this.syncMaxDuration());
        this.minDurationSecInput.addEventListener('change', () => this.syncMaxDuration());

        // Also do the same for last round min duration if needed
        this.lastRoundMinDurationMinInput.addEventListener('change', () => {
            this.syncLastRoundMaxDuration();
            this.updateSongDurationEstimate();
            if (this.preCalculatedDurations.length > 0) {
                this.preCalculateRoundDurations(false);
            }
        });
        this.lastRoundMinDurationSecInput.addEventListener('change', () => {
            this.syncLastRoundMaxDuration();
            this.updateSongDurationEstimate();
            if (this.preCalculatedDurations.length > 0) {
                this.preCalculateRoundDurations(false);
            }
        });
        this.lastRoundMaxDurationMinInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
            if (this.preCalculatedDurations.length > 0) {
                this.preCalculateRoundDurations(false);
            }
        });
        this.lastRoundMaxDurationSecInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
            if (this.preCalculatedDurations.length > 0) {
                this.preCalculateRoundDurations(false);
            }
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.gameModal) {
                this.gameModal.style.display = 'none';
                this.resetGame();
            }
        });

        // Add this event listener for player count changes
        this.playerCountInput.addEventListener('change', () => {
            this.state.players = parseInt(this.playerCountInput.value);
            if (this.state.players < 3) {
                this.state.players = 3;
                this.playerCountInput.value = 3;
            }
            this.updateCurrentPlayersDisplay();
            this.updateRemovePlayerButtonState(); // Add this line
            this.updateSongDurationEstimate();
            
            // Auto-recalculate if previously calculated
            if (this.hasCalculatedDurations) {
                this.preCalculateRoundDurations(false);
            }
        });

        // Update duration estimate when player count changes
        this.playerCountInput.addEventListener('change', () => {
            // existing code
            this.updateSongDurationEstimate();
        });
        
        this.addPlayerButton.addEventListener('click', () => {
            this.addPlayer();
            this.updateSongDurationEstimate();
            
            // Auto-recalculate if previously calculated
            if (this.hasCalculatedDurations) {
                this.preCalculateRoundDurations(false);
            }
        });
        
        this.removePlayerButton.addEventListener('click', () => {
            this.removePlayer();
            this.updateSongDurationEstimate();
            
            // Auto-recalculate if previously calculated
            if (this.hasCalculatedDurations) {
                this.preCalculateRoundDurations(false);
            }
        });

        // Update duration estimate when timer settings change
        this.minDurationMinInput.addEventListener('change', () => {
            this.syncMaxDuration();
            this.updateSongDurationEstimate();
        });
        this.minDurationSecInput.addEventListener('change', () => {
            this.syncMaxDuration();
            this.updateSongDurationEstimate();
        });
        this.maxDurationMinInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
        });
        this.maxDurationSecInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
        });
        this.setupTimeMinInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
        });
        this.setupTimeSecInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
        });

        // Update when last round toggle changes
        this.lastRoundToggle.addEventListener('change', (e) => {
            this.lastRoundSettings.classList.toggle('hidden');
            this.updateSongDurationEstimate();
            
            // Auto recalculate exact durations if they were already calculated
            if (this.preCalculatedDurations.length > 0) {
                // Recalculate durations without showing toast notification
                this.preCalculateRoundDurations(false);
            }
        });

        // Add listeners for the new calculate durations functionality
        if (this.calculateDurationsButton) {
            this.calculateDurationsButton.addEventListener('click', () => this.preCalculateRoundDurations());
        }
        
        // Add event listener for the Save button in Timer Settings
        if (this.saveTimerSettingsButton) {
            this.saveTimerSettingsButton.addEventListener('click', () => {
                this.saveTimerSettings();
            });
        }

        // Update timer validation when inputs change
        this.minDurationMinInput.addEventListener('change', () => {
            this.syncMaxDuration();
            this.updateSongDurationEstimate();
            this.validateTimerSettings();
        });
        this.minDurationSecInput.addEventListener('change', () => {
            this.syncMaxDuration();
            this.updateSongDurationEstimate();
            this.validateTimerSettings();
        });
        this.maxDurationMinInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
            this.validateTimerSettings();
        });
        this.maxDurationSecInput.addEventListener('change', () => {
            this.updateSongDurationEstimate();
            this.validateTimerSettings();
        });

        // Add listeners for settings management
        this.resetSettingsBtn.addEventListener('click', () => this.clearLocalStorage());
        
        // Auto-save settings when they change
        const settingsInputs = [
            this.playerCountInput,
            this.minDurationMinInput, this.minDurationSecInput,
            this.maxDurationMinInput, this.maxDurationSecInput,
            this.setupTimeMinInput, this.setupTimeSecInput,
            this.lastRoundToggle,
            this.lastRoundMinDurationMinInput, this.lastRoundMinDurationSecInput,
            this.lastRoundMaxDurationMinInput, this.lastRoundMaxDurationSecInput
        ];
        
        settingsInputs.forEach(input => {
            input.addEventListener('change', () => {
                setTimeout(() => this.saveSettingsToLocalStorage(), 500);
            });
        });

        // Modify timer settings listeners
        const durationInputs = [
            this.minDurationMinInput, 
            this.minDurationSecInput,
            this.maxDurationMinInput, 
            this.maxDurationSecInput,
            this.lastRoundMinDurationMinInput, 
            this.lastRoundMinDurationSecInput,
            this.lastRoundMaxDurationMinInput, 
            this.lastRoundMaxDurationSecInput
        ];
        
        durationInputs.forEach(input => {
            if (!input) return; // Skip if element doesn't exist
            
            // Add auto-recalculation to each input's change event
            const originalListener = input.onchange;
            input.addEventListener('change', () => {
                // Call original functionality first
                if (originalListener) originalListener();
                
                // Apply validation and update estimate
                this.updateSongDurationEstimate();
                this.validateTimerSettings();
                
                // Auto-recalculate if previously calculated
                if (this.hasCalculatedDurations) {
                    this.preCalculateRoundDurations(false);
                }
            });
        });
    }

    // Helper method to get total seconds from minutes and seconds inputs
    getSecondsFromInputs(minutesInput, secondsInput) {
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        return (minutes * 60) + seconds;
    }

    startGame() {
        if (!this.audioElement.src) {
            this.showToast(translations[this.currentLang].pleaseUploadMusic, "warning");
            return;
        }
        if (this.state.players < 3) {
            alert(translations[this.currentLang].minimumPlayers);
            return;
        }
        
        this.state.isPlaying = true;
        this.audioElement.play();
        
        let duration;
        
        // Use pre-calculated duration if available for current round
        if (this.preCalculatedDurations.length > 0 && 
            this.preCalculatedDurations[this.state.currentRound] !== undefined) {
            
            duration = this.preCalculatedDurations[this.state.currentRound];
        } else {
            // Fall back to generating a random duration (existing code)
            if (this.state.players === 2 && this.lastRoundToggle.checked) {
                // Use min and max durations for the last round
                const minLastRoundDuration = this.getSecondsFromInputs(
                    this.lastRoundMinDurationMinInput, 
                    this.lastRoundMinDurationSecInput
                ) * 1000;
                
                const maxLastRoundDuration = this.getSecondsFromInputs(
                    this.lastRoundMaxDurationMinInput, 
                    this.lastRoundMaxDurationSecInput
                ) * 1000;
                
                // Ensure max is not less than min
                const actualMaxDuration = Math.max(maxLastRoundDuration, minLastRoundDuration);
                
                // Choose a random duration between min and max
                duration = Math.floor(Math.random() * (actualMaxDuration - minLastRoundDuration + 1) + minLastRoundDuration);
            } else {
                // Regular rounds - using existing min/max settings
                const minDuration = this.getSecondsFromInputs(
                    this.minDurationMinInput, 
                    this.minDurationSecInput
                ) * 1000;
                const maxDuration = this.getSecondsFromInputs(
                    this.maxDurationMinInput, 
                    this.maxDurationSecInput
                ) * 1000;
                
                // Make sure maxDuration is always >= minDuration
                const actualMaxDuration = Math.max(maxDuration, minDuration);
                duration = Math.floor(Math.random() * (actualMaxDuration - minDuration + 1) + minDuration);
            }
        }
        
        this.timers.game = setTimeout(() => this.stopMusic(), duration);
        this.updateGameStatus("Game in progress...");
    }


    stopMusic() {
        this.audioElement.pause();

        // Eliminate a player immediately when music stops
        if (this.state.players > 1) {
            this.eliminatePlayer();
            this.updateDisplay();
        }

        // Check if this is the final round (2 players initially, 1 after elimination)
        if (this.state.players === 1) {
            // Last round finished - we have a winner!
            clearTimeout(this.timers.game);
            clearInterval(this.timers.setup);
            this.state.isPlaying = false;
            this.updateGameStatus('Game Over! Winner found!');
        } else {
            // Normal round
            this.state.isSetupPhase = true;
            this.startSetupPhase();
            this.updateGameStatus('Find a chair! Next round starting soon...');
        }
    }

    startSetupPhase() {
        let setupTime = this.getSecondsFromInputs(
            this.setupTimeMinInput,
            this.setupTimeSecInput
        );
        this.updateTimerDisplay(setupTime);

        this.timers.setup = setInterval(() => {
            setupTime--;
            this.updateTimerDisplay(setupTime);

            if (setupTime <= 0) {
                this.endRound();
            }
        }, 1000);
    }

    // Update the endRound method to not eliminate a player again
    endRound() {
        clearInterval(this.timers.setup);
        this.state.currentRound++;
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
                // Use min and max durations for the last round
                const minLastRoundDuration = this.getSecondsFromInputs(
                    this.lastRoundMinDurationMinInput, 
                    this.lastRoundMinDurationSecInput
                ) * 1000;
                
                const maxLastRoundDuration = this.getSecondsFromInputs(
                    this.lastRoundMaxDurationMinInput, 
                    this.lastRoundMaxDurationSecInput
                ) * 1000;
                
                // Ensure max is not less than min
                const actualMaxDuration = Math.max(maxLastRoundDuration, minLastRoundDuration);
                
                // Choose a random duration between min and max
                duration = Math.floor(Math.random() * (actualMaxDuration - minLastRoundDuration + 1) + minLastRoundDuration);
            } else {
                const minDuration = this.getSecondsFromInputs(
                    this.minDurationMinInput, 
                    this.minDurationSecInput
                ) * 1000;
                const maxDuration = this.getSecondsFromInputs(
                    this.maxDurationMinInput, 
                    this.maxDurationSecInput
                ) * 1000;
                
                // Make sure maxDuration is always >= minDuration
                const actualMaxDuration = Math.max(maxDuration, minDuration);
                duration = Math.floor(Math.random() * (actualMaxDuration - minDuration + 1) + minDuration);
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
        
        // Enable the return button when the first player is eliminated
        if (this.state.eliminated.length === 1) {
            this.returnPlayerButton.disabled = false;
        }
    }

    resetGame() {
        this.state.players = parseInt(this.playerCountInput.value);
        this.state.eliminated = [];
        this.state.currentRound = 0;
        this.state.isPlaying = false;
        this.state.isSetupPhase = false;

        clearTimeout(this.timers.game);
        clearInterval(this.timers.setup);

        this.audioElement.pause();
        this.audioElement.currentTime = 0;

        this.updateDisplay();
        this.updateGameStatus('Ready to start');
        this.updateTimerDisplay(0);
        
        // Change reset button to start button
        this.resetButton.textContent = translations[this.currentLang].startGame;
        this.resetButton.className = 'control-btn start';
        
        // Use the proper stored handler references
        this.resetButton.removeEventListener('click', this.resetHandler);
        this.resetButton.addEventListener('click', this.restartHandler);
        
        // Disable the return button when game is reset
        this.returnPlayerButton.disabled = true;
    }

    // Add new method to restart the game
    restartGame() {
        // Start the game
        this.startGame();
        
        // Change start button back to reset button
        this.resetButton.textContent = translations[this.currentLang].reset;
        this.resetButton.className = 'control-btn reset';
        
        // Use the proper stored handler references
        this.resetButton.removeEventListener('click', this.restartHandler);
        this.resetButton.addEventListener('click', this.resetHandler);
    }

    returnPlayer() {
        if (this.state.eliminated.length === 0) return;
        
        // Stop any active timers
        clearTimeout(this.timers.game);
        clearInterval(this.timers.setup);
        
        // Pause audio and reset
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        
        // Reset timer display
        this.updateTimerDisplay(0);
        
        // Return the last eliminated player
        this.state.players++;
        this.state.eliminated.pop();
        
        // Update displays
        this.updateDisplay();
        this.updateEliminatedPlayers();
        
        // Reset game state
        this.state.isPlaying = false;
        this.state.isSetupPhase = false;
        
        // Update game status
        this.updateGameStatus('Player returned to game');
        
        // Change return button to start button
        this.returnPlayerButton.textContent = translations[this.currentLang].startGame;
        this.returnPlayerButton.className = 'control-btn start';
        
        // Make sure the button is enabled when changing to start
        this.returnPlayerButton.disabled = false;
        
        // Swap event listeners
        this.returnPlayerButton.removeEventListener('click', this.returnHandler);
        this.returnPlayerButton.addEventListener('click', this.returnStartHandler);
    }

    // New method for starting game after returning player
    returnStartGame() {
        // Start the game
        this.startGame();
        
        // Change start button back to return button
        this.returnPlayerButton.textContent = translations[this.currentLang].return;
        this.returnPlayerButton.className = 'control-btn return';
        
        // Enable or disable based on whether there are eliminated players
        this.returnPlayerButton.disabled = this.state.eliminated.length === 0;
        
        // Swap event listeners back
        this.returnPlayerButton.removeEventListener('click', this.returnStartHandler);
        this.returnPlayerButton.addEventListener('click', this.returnHandler);
    }

    addPlayer() {
        this.state.players++;
        this.playerCountInput.value = this.state.players;
        this.updateCurrentPlayersDisplay();
        this.updateRemovePlayerButtonState(); // Add this line
    }

    removePlayer() {
        if (this.state.players > 3) {
            this.state.players--;
            this.playerCountInput.value = this.state.players;
            this.updateCurrentPlayersDisplay();
            this.updateRemovePlayerButtonState(); // Add this line
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
            
            // Enable the remove music button when a file is uploaded
            this.removeMusicButton.disabled = false;
            
            // Wait for audio metadata to load to get duration
            this.audioElement.onloadedmetadata = () => {
                // Check if we have pre-calculated durations to compare against
                if (this.preCalculatedDurations.length > 0) {
                    this.checkMusicDuration();
                }
            };
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
        
        // Disable the remove music button when music is removed
        this.removeMusicButton.disabled = true;
        
        // Disable the start button when music is removed
        this.updateStartButtonState(false);
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
            'Game reset': 'gameReset'
        };

        const key = statusKeys[status] || status;
        this.gameStatus.textContent = translations[this.currentLang][key] || status;
    }

    updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        this.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    // Method to sync max duration with min duration when needed
    syncMaxDuration() {
        const minTotalSeconds = this.getSecondsFromInputs(
            this.minDurationMinInput,
            this.minDurationSecInput
        );
        
        const maxTotalSeconds = this.getSecondsFromInputs(
            this.maxDurationMinInput,
            this.maxDurationSecInput
        );
        
        // If max duration is less than min duration, update max to match min
        if (maxTotalSeconds < minTotalSeconds) {
            const minutes = Math.floor(minTotalSeconds / 60);
            const seconds = minTotalSeconds % 60;
            
            this.maxDurationMinInput.value = minutes;
            this.maxDurationSecInput.value = seconds;
        }
    }

    // Method to sync last round max duration with min duration when needed
    syncLastRoundMaxDuration() {
        const minTotalSeconds = this.getSecondsFromInputs(
            this.lastRoundMinDurationMinInput,
            this.lastRoundMinDurationSecInput
        );
        
        const maxTotalSeconds = this.getSecondsFromInputs(
            this.lastRoundMaxDurationMinInput,
            this.lastRoundMaxDurationSecInput
        );
        
        // If max duration is less than min duration, update max to match min
        if (maxTotalSeconds < minTotalSeconds) {
            const minutes = Math.floor(minTotalSeconds / 60);
            const seconds = minTotalSeconds % 60;
            
            this.lastRoundMaxDurationMinInput.value = minutes;
            this.lastRoundMaxDurationSecInput.value = seconds;
        }
    }

    // Add this method to check and update the remove player button state
    updateRemovePlayerButtonState() {
        // Disable the remove player button if there are only 3 players
        this.removePlayerButton.disabled = this.state.players <= 3;
    }
    
    // Calculate the estimated song duration based on current settings
    calculateEstimatedSongDuration() {
        // Calculate how many rounds we'll have (players - 1)
        const totalRounds = this.state.players - 1;
        
        // If no rounds (only one player somehow), return 0
        if (totalRounds <= 0) return 0;
        
        let totalSeconds = 0;
        
        // Calculate regular rounds (all except the last one)
        const regularRounds = totalRounds - 1;
        if (regularRounds > 0) {
            // Average duration for regular rounds
            const minDuration = this.getSecondsFromInputs(
                this.minDurationMinInput,
                this.minDurationSecInput
            );
            const maxDuration = this.getSecondsFromInputs(
                this.maxDurationMinInput,
                this.maxDurationSecInput
            );
            const avgDuration = (minDuration + maxDuration) / 2;
            
            // Total time for regular rounds music
            totalSeconds += regularRounds * avgDuration;
        }
        
        // Calculate last round music duration
        if (this.lastRoundToggle.checked) {
            // Using custom last round settings
            const minLastRoundDuration = this.getSecondsFromInputs(
                this.lastRoundMinDurationMinInput,
                this.lastRoundMinDurationSecInput
            );
            const maxLastRoundDuration = this.getSecondsFromInputs(
                this.lastRoundMaxDurationMinInput,
                this.lastRoundMaxDurationSecInput
            );
            const avgLastRoundDuration = (minLastRoundDuration + maxLastRoundDuration) / 2;
            
            // Add last round time
            totalSeconds += avgLastRoundDuration;
        } else {
            // Using regular settings for last round
            const minDuration = this.getSecondsFromInputs(
                this.minDurationMinInput,
                this.minDurationSecInput
            );
            const maxDuration = this.getSecondsFromInputs(
                this.maxDurationMinInput,
                this.maxDurationSecInput
            );
            const avgDuration = (minDuration + maxDuration) / 2;
            
            // Add last round time
            totalSeconds += avgDuration;
        }
        
        // Add a safety margin of 10 seconds
        totalSeconds += 10;
        
        return totalSeconds;
    }


    // Format seconds into mm:ss format
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    
    // Modified method to pre-calculate round durations
    preCalculateRoundDurations(showNotification = true) {
        this.preCalculatedDurations = [];
        let totalDurationMs = 0;
        
        // Calculate how many rounds we'll have (players - 1)
        const totalRounds = this.state.players - 1;
        
        // Generate duration for each round
        for (let i = 0; i < totalRounds; i++) {
            let duration;
            
            // Last round uses special settings if enabled
            if (i === totalRounds - 1 && this.lastRoundToggle.checked) {
                const minLastRoundDuration = this.getSecondsFromInputs(
                    this.lastRoundMinDurationMinInput, 
                    this.lastRoundMinDurationSecInput
                ) * 1000;
                
                const maxLastRoundDuration = this.getSecondsFromInputs(
                    this.lastRoundMaxDurationMinInput, 
                    this.lastRoundMaxDurationSecInput
                ) * 1000;
                
                // Ensure max is not less than min
                const actualMaxDuration = Math.max(maxLastRoundDuration, minLastRoundDuration);
                
                // Generate random duration for this round
                duration = Math.floor(Math.random() * (actualMaxDuration - minLastRoundDuration + 1) + minLastRoundDuration);
            } else {
                // Regular round calculation - THIS CODE WAS MISSING
                const minDuration = this.getSecondsFromInputs(
                    this.minDurationMinInput, 
                    this.minDurationSecInput
                ) * 1000;
                const maxDuration = this.getSecondsFromInputs(
                    this.maxDurationMinInput, 
                    this.maxDurationSecInput
                ) * 1000;
                
                // Make sure maxDuration is always >= minDuration
                const actualMaxDuration = Math.max(maxDuration, minDuration);
                duration = Math.floor(Math.random() * (actualMaxDuration - minDuration + 1) + minDuration);
            }
            
            this.preCalculatedDurations.push(duration);
            totalDurationMs += duration;
        }
        
        // Rest of your method remains the same...
        // Add a safety margin of 5 seconds
        totalDurationMs += 5000;
        
        // Display the exact duration
        const totalSeconds = Math.ceil(totalDurationMs / 1000);
        this.exactDurationDisplay.textContent = this.formatTime(totalSeconds);
        
        // Show the result area
        this.exactDurationResult.classList.remove('hidden');
        
        // Only show notification if parameter is true
        if (showNotification) {
            // Update the UI with a message
            this.updateGameStatus('Durations calculated! Please select a song of appropriate length.');
            
            // Highlight music controls after calculation
            this.toggleMusicControlsState(true, false);
        }
        
        // Set the flag whenever this method runs
        this.hasCalculatedDurations = true;
        
        return totalDurationMs;
    }

    checkMusicDuration() {
        // Calculate total duration needed from pre-calculated durations
        const totalNeededMs = this.preCalculatedDurations.reduce((sum, duration) => sum + duration, 0) + 5000; // Adding 5s safety margin
        const songDurationMs = this.audioElement.duration * 1000; // Convert to milliseconds
        
        // Set initial button state based on duration comparison
        this.updateStartButtonState(songDurationMs >= totalNeededMs);
        
        // If song is shorter than needed, show warning
        if (songDurationMs < totalNeededMs) {
            // Calculate the difference in seconds for the message
            const shortBy = Math.ceil((totalNeededMs - songDurationMs) / 1000);
            
            // Format times for display
            const songDurationFormatted = this.formatTime(Math.floor(songDurationMs / 1000));
            const neededDurationFormatted = this.formatTime(Math.floor(totalNeededMs / 1000));
            
            // Create warning message
            const warningMessage = translations[this.currentLang].songTooShortWarning
                .replace('{songDuration}', songDurationFormatted)
                .replace('{neededDuration}', neededDurationFormatted)
                .replace('{shortBy}', shortBy);
            
            // Show warning dialog
            this.showModal(
                "Song Duration Warning", 
                warningMessage,
                () => {
                    // User chose to continue with short song - but button remains disabled
                    console.log("User continuing with short song");
                },
                () => {
                    // User chose to select different song
                    this.removeMusic();
                }
            );
        } else {
            // Song is long enough - show confirmation and enable button
            const songDurationFormatted = this.formatTime(Math.floor(songDurationMs / 1000));
            const neededDurationFormatted = this.formatTime(Math.floor(totalNeededMs / 1000));
            this.showToast(
                translations[this.currentLang].songDurationGood
                    .replace('{songDuration}', songDurationFormatted)
                    .replace('{neededDuration}', neededDurationFormatted),
                "success",
                5000  // Show for 5 seconds since this is important information
            );
        }
    }

    // Add a method to toggle music controls visibility/state based on calculations
    toggleMusicControlsState(calculated = false, scroll = true) {
        if (calculated) {
            const musicSection = this.musicFileInput.closest('.panel-section');
            musicSection.classList.add('highlight-section');
    
            if (scroll) {
                musicSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Add a visual cue
            const noticeDiv = document.createElement('div');
            noticeDiv.className = 'music-notice';
            noticeDiv.textContent = translations[this.currentLang].pleaseSelectMusic;
            
            // Remove any existing notice before adding new one
            const existingNotice = musicSection.querySelector('.music-notice');
            if (existingNotice) {
                existingNotice.remove();
            }
            
            musicSection.querySelector('.settings-group').prepend(noticeDiv);
        }
    }

    // New method to handle saving timer settings and calculating duration
    saveTimerSettings() {
        // Calculate exact durations and store them
        this.preCalculateRoundDurations();
        
        // Set the flag to enable auto-recalculation
        this.hasCalculatedDurations = true;
        
        // Enable music file input
        this.musicFileInput.disabled = false;
        const musicLabel = document.querySelector('.file-upload-label');
        if (musicLabel) {
            musicLabel.classList.remove('disabled');
        }
        
        // Show success message
        //this.showToast(translations[this.currentLang].settingsSaved, "success");
        
        // Highlight music controls section to guide user to next step
        this.toggleMusicControlsState(true, false);
        
        // Save settings to localStorage
        this.saveSettingsToLocalStorage();
    }

    // Add this method to your class
    updateSongDurationEstimate() {
        if (!this.songDurationEstimateDisplay) {
            return; // Exit if the display element doesn't exist
        }
        
        const durationInSeconds = this.calculateEstimatedSongDuration();
        this.songDurationEstimateDisplay.textContent = this.formatTime(durationInSeconds);
    }

// Completely redesigned showToast method to position at bottom-right
showToast(message, type = 'info', duration = 3000) {
    // Create an overlay div for the toast that sits on top of everything
    let toastOverlay = document.getElementById('toast-overlay');
    
    // Create the overlay if it doesn't exist yet
    if (!toastOverlay) {
        toastOverlay = document.createElement('div');
        toastOverlay.id = 'toast-overlay';
        toastOverlay.style.position = 'fixed';  // Fixed position
        toastOverlay.style.left = '0';
        toastOverlay.style.top = '0';
        toastOverlay.style.width = '100%';
        toastOverlay.style.height = '100%';  // Full height to allow bottom positioning
        toastOverlay.style.overflow = 'visible';  // Allow content to overflow
        toastOverlay.style.zIndex = '10000';  // Very high z-index
        toastOverlay.style.pointerEvents = 'none';  // Don't capture mouse events
        document.body.appendChild(toastOverlay);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Style the toast to be positioned at bottom-right
    toast.style.position = 'absolute';
    toast.style.right = '20px';
    toast.style.bottom = '20px'; // Changed from top to bottom
    toast.style.maxWidth = '300px';
    toast.style.padding = '12px 16px';
    toast.style.backgroundColor = type === 'success' ? '#4CAF50' : 
                                 type === 'warning' ? '#FF9800' : 
                                 type === 'error' ? '#F44336' : '#2196F3';
    toast.style.color = 'white';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)'; // Changed direction (moving up from below)
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Add icon based on type
    let icon = '';
    switch(type) {
        case 'success': icon = '✓'; break;
        case 'warning': icon = '⚠️'; break;
        case 'error': icon = '✕'; break;
        default: icon = 'ℹ️'; break;
    }
    
    toast.innerHTML = `
        <span style="margin-right: 8px;">${icon}</span>
        <span>${message}</span>
    `;
    
    // Calculate position based on other toasts
    const existingToasts = toastOverlay.querySelectorAll('.toast');
    let bottomOffset = 20; // Start 20px from the bottom
    
    existingToasts.forEach(t => {
        bottomOffset += t.offsetHeight + 10; // Add height of each toast plus 10px margin
    });
    
    toast.style.bottom = `${bottomOffset}px`;
    
    // Add to overlay
    toastOverlay.appendChild(toast);
    
    // Force reflow before starting animation
    void toast.offsetWidth;
    
    // Show the toast
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    // Schedule removal
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)'; // Changed direction (moving down)
        
        setTimeout(() => {
            if (toastOverlay.contains(toast)) {
                toastOverlay.removeChild(toast);
                
                // Reposition remaining toasts
                const remainingToasts = toastOverlay.querySelectorAll('.toast');
                let newBottomOffset = 20;
                
                remainingToasts.forEach(t => {
                    t.style.bottom = `${newBottomOffset}px`;
                    newBottomOffset += t.offsetHeight + 10;
                });
            }
        }, 300);
    }, duration);
}
    // Modal dialog system
    showModal(title, message, onConfirm = null, onCancel = null) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        const closeBtn = document.querySelector('.modal-close');
        
        // Set content
        modalTitle.textContent = title;
        modalContent.textContent = message;
        
        // Show modal
        modalOverlay.style.display = 'flex';
        
        // Set up event handlers
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
            modalOverlay.style.display = 'none';
        };
        
        const handleConfirm = () => {
            if (onConfirm) onConfirm();
            cleanup();
        };
        
        const handleCancel = () => {
            if (onCancel) onCancel();
            cleanup();
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);
        
        // Close on click outside
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) handleCancel();
        }, { once: true });
    }

    // New method to enable/disable start button based on music duration
    updateStartButtonState(isValid) {
        this.startButton.disabled = !isValid;
        
        // Update button styling to indicate state
        if (isValid) {
            this.startButton.classList.remove('disabled');
        } else {
            this.startButton.classList.add('disabled');
        }
    }

    // New method to check if timer settings are valid
    validateTimerSettings() {
        // Get all duration values
        const minDuration = this.getSecondsFromInputs(
            this.minDurationMinInput,
            this.minDurationSecInput
        );
        
        const maxDuration = this.getSecondsFromInputs(
            this.maxDurationMinInput,
            this.maxDurationSecInput
        );
        
        // Check if both min and max durations are 0
        const isValid = !(minDuration === 0 && maxDuration === 0);
        
        // Update the save button state
        this.updateSaveButtonState(isValid);
        
        return isValid;
    }

    // Method to enable/disable the save button
    updateSaveButtonState(isValid) {
        if (this.saveTimerSettingsButton) {
            this.saveTimerSettingsButton.disabled = !isValid;
            
            // Update button styling to indicate state
            if (isValid) {
                this.saveTimerSettingsButton.classList.remove('disabled');
            } else {
                this.saveTimerSettingsButton.classList.add('disabled');
            }
        }
    }

    // Add these methods to the MusicalChairsGame class

    // Save all game settings to localStorage
    saveSettingsToLocalStorage() {
        const settings = {
            // Player settings
            players: this.state.players,
            
            // Timer settings
            minDuration: {
                min: this.minDurationMinInput.value,
                sec: this.minDurationSecInput.value
            },
            maxDuration: {
                min: this.maxDurationMinInput.value,
                sec: this.maxDurationSecInput.value
            },
            setupTime: {
                min: this.setupTimeMinInput.value,
                sec: this.setupTimeSecInput.value
            },
            
            // Last round settings
            lastRoundEnabled: this.lastRoundToggle.checked,
            lastRoundMinDuration: {
                min: this.lastRoundMinDurationMinInput.value,
                sec: this.lastRoundMinDurationSecInput.value
            },
            lastRoundMaxDuration: {
                min: this.lastRoundMaxDurationMinInput.value,
                sec: this.lastRoundMaxDurationSecInput.value
            },
            
            // Calculated durations
            preCalculatedDurations: this.preCalculatedDurations
        };
        
        localStorage.setItem('musicalChairsSettings', JSON.stringify(settings));
       // this.showToast("Settings saved to browser memory", "success");
    }

    // Load game settings from localStorage
    loadSettingsFromLocalStorage() {
        const savedSettings = localStorage.getItem('musicalChairsSettings');
        
        if (!savedSettings) {
            return false; // No saved settings
        }
        
        try {
            const settings = JSON.parse(savedSettings);
            
            // Apply player settings
            this.state.players = settings.players;
            this.playerCountInput.value = settings.players;
            
            // Apply timer settings
            this.minDurationMinInput.value = settings.minDuration.min;
            this.minDurationSecInput.value = settings.minDuration.sec;
            this.maxDurationMinInput.value = settings.maxDuration.min;
            this.maxDurationSecInput.value = settings.maxDuration.sec;
            this.setupTimeMinInput.value = settings.setupTime.min;
            this.setupTimeSecInput.value = settings.setupTime.sec;
            
            // Apply last round settings
            this.lastRoundToggle.checked = settings.lastRoundEnabled;
            if (settings.lastRoundEnabled) {
                this.lastRoundSettings.classList.remove('hidden');
            }
            this.lastRoundMinDurationMinInput.value = settings.lastRoundMinDuration.min;
            this.lastRoundMinDurationSecInput.value = settings.lastRoundMinDuration.sec;
            this.lastRoundMaxDurationMinInput.value = settings.lastRoundMaxDuration.min;
            this.lastRoundMaxDurationSecInput.value = settings.lastRoundMaxDuration.sec;
            
            // Apply pre-calculated durations if available
            if (settings.preCalculatedDurations && settings.preCalculatedDurations.length > 0) {
                this.preCalculatedDurations = settings.preCalculatedDurations;
                this.hasCalculatedDurations = true;  // Set the flag if durations were loaded
                
                // Show the exact duration display
                const totalDurationMs = settings.preCalculatedDurations.reduce((sum, duration) => sum + duration, 0);
                const totalSeconds = Math.ceil(totalDurationMs / 1000) + 5; // Add 5s safety margin
                this.exactDurationDisplay.textContent = this.formatTime(totalSeconds);
                this.exactDurationResult.classList.remove('hidden');
                
                // Enable music file input
                this.musicFileInput.disabled = false;
                const musicLabel = document.querySelector('.file-upload-label');
                if (musicLabel) {
                    musicLabel.classList.remove('disabled');
                }
            }
            
            // Update UI based on loaded settings
            this.updateCurrentPlayersDisplay();
            this.updateRemovePlayerButtonState();
            this.updateSongDurationEstimate();
            this.validateTimerSettings();
            
            this.showToast("Settings loaded from browser memory", "info");
            return true;
        } catch (error) {
            console.error("Error loading settings:", error);
            return false;
        }
    }

    // Clear all saved settings
    clearLocalStorage() {
        localStorage.removeItem('musicalChairsSettings');
        this.showModal(
            "Settings Reset",
            "All saved settings have been cleared. Reload the page to reset the game.",
            () => {
                window.location.reload();
            }
        );
    }

    // Add this helper method to the MusicalChairsGame class
    addEventListenerSafely(element, eventType, callback) {
        if (element) {
            element.addEventListener(eventType, callback);
        } else {
            console.warn(`Element for event ${eventType} not found`);
        }
    }
}

// Simple English-only translations object
const translations = {
    en: {
        // Game status messages
        readyToStart: "Ready to start",
        gameInProgress: "Game in progress...",
        findChair: "Find a chair! Next round starting soon...",
        finalRound: "Final Round! One chair left...",
        gameOver: "Game Over! Winner found!",
        gameReset: "Game reset",
        
        // Button texts
        startGame: "Start Game",
        reset: "Reset",
        return: "Return",
        
        // Player messages
        noEliminatedPlayers: "No eliminated players yet",
        minimumPlayers: "Minimum 3 players required!",
        
        // Music related
        pleaseUploadMusic: "Please upload music first!",
        songTooShortWarning: "Warning: Your selected song ({songDuration}) is shorter than the calculated game duration ({neededDuration}).\n\nYour song is {shortBy} seconds too short.",
        continueAnyway: "Would you like to continue anyway? (OK to continue, Cancel to choose a different song)",
        songDurationGood: "Great! Your selected song ({songDuration}) is long enough for the calculated game duration ({neededDuration}).",
        
        // Settings
        settingsSaved: "Timer settings saved! Now please select a music file of appropriate length.",
        pleaseSelectMusic: "Please select a music file of appropriate length",
        playerReturned: "Player returned to game"
    }
};

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new MusicalChairsGame();
});
