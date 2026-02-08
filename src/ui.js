// UI Management
import { GameState } from './game.js';

export class UIManager {
  constructor(gameState) {
    this.game = gameState;
    this.draggedDie = null;
    this.selectedDie = null; // For click-based placement
    this.autoScrollInterval = null;
    this.lastDragY = undefined;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // New Round button
    document.getElementById('new-round-btn').addEventListener('click', () => {
      this.startNewRound();
    });

    // Reset Game button
    document.getElementById('reset-game-btn').addEventListener('click', () => {
      this.resetGame();
    });

    // Setup drop handlers for static slots
    document.querySelectorAll('.dice-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => this.handleDragOver(e));
      slot.addEventListener('drop', (e) => this.handleDrop(e));
      // Add click handler for click-based placement
      slot.addEventListener('click', (e) => this.handleSlotClick(e));
    });

    // Setup drop handlers for deployment tracks
    this.setupTrackListeners('landing-gear-track');
    this.setupTrackListeners('flaps-track');
    
    // Coffee make and reroll
    this.setupCoffeeListeners();
    this.setupRerollListener();
    
    document.getElementById('drink-coffee-btn').addEventListener('click', () => {
      this.handleDrinkCoffee();
    });
    
    // Setup radio track
    this.setupRadioListeners();

    // Setup discard slot
    const discardSlot = document.getElementById('discard-slot');
    if (discardSlot) {
      discardSlot.addEventListener('dragover', (e) => this.handleDragOver(e));
      discardSlot.addEventListener('drop', (e) => this.handleDiscardDrop(e));
      discardSlot.addEventListener('click', (e) => this.handleDiscardClick(e));
    }

    // Setup help buttons
    document.querySelectorAll('.help-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showHelp(btn.dataset.help);
      });
    });
  }

  setupCoffeeListeners() {
    const slot = document.getElementById('make-coffee-slot');
    if (!slot) return;
    
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      this.handleMakeCoffeeDrop(e);
    });
    
    // Add click handler for click-based placement
    slot.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleMakeCoffeeClick(e);
    });
  }

  setupRerollListener() {
    const slot = document.getElementById('reroll-slot');
    if (!slot) return;
    
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      const canReroll = this.game.currentPlayer === 'pilot' ? 
        this.game.pilotCanReroll : this.game.copilotCanReroll;
      
      if (canReroll) {
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drag-over');
      }
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      this.handleRerollDrop(e);
    });
  }

  setupRadioListeners() {
    // Listeners are now attached in renderRadio() because slots are dynamic
  }

  // ... (other setup methods)

  startNewRound() {
    if (this.game.gameOver) {
      this.showGameOverModal('El juego ha terminado. Por favor reinicia (F5) para jugar de nuevo.', this.game.gameWon);
      return;
    }

    // Check if all dice are used
    const pilotUnusedCount = this.game.pilotDice.reduce((acc, d) => acc + (d.used ? 0 : 1), 0);
    const copilotUnusedCount = this.game.copilotDice.reduce((acc, d) => acc + (d.used ? 0 : 1), 0);
    
    console.log('Validating Round End:', {
      pilotDice: this.game.pilotDice,
      copilotDice: this.game.copilotDice,
      pilotUnusedCount,
      copilotUnusedCount
    });

    if (pilotUnusedCount > 0 || copilotUnusedCount > 0) {
      this.showMessage(`¡Debéis colocar TODOS los dados antes de terminar la ronda! (Faltan: ${pilotUnusedCount + copilotUnusedCount})`, 'warning');
      return;
    }

    const result = this.game.endRound();
    
    if (result.gameOver) {
      if (result.gameWon) {
        this.showGameOverModal(result.message, true);
        this.game.gameWon = true; // Ensure state reflects win
      } else {
        this.showGameOverModal(result.message, false);
      }
      this.game.gameOver = true;
    } else if (!result.success) {
      this.showMessage(result.message, 'error');
    } else {
      this.showMessage(result.message, 'info');
    }

    this.render();
  }

  showGameOverModal(message, isWin) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    
    modal.innerHTML = `
      <div class="game-over-content ${isWin ? 'win' : 'loss'}">
        <h2>${isWin ? '🎉 ¡VICTORIA!' : '💥 GAME OVER'}</h2>
        <p class="game-over-message">${message}</p>
        <button id="restart-btn" class="btn btn-primary">Reiniciar Juego</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add click listener for restart
    document.getElementById('restart-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  setupTrackListeners(trackId) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const slots = track.querySelectorAll('.deployment-slot');
    slots.forEach((slot, index) => {
      slot.addEventListener('dragover', (e) => this.handleDragOver(e));
      slot.addEventListener('drop', (e) => {
        const control = trackId.replace('-track', '');
        this.handleDeploymentDrop(e, control, index);
      });
      // Add click handler for click-based placement
      slot.addEventListener('click', (e) => {
        const control = trackId.replace('-track', '');
        this.handleDeploymentClick(e, control, index);
      });
    });
  }



  resetGame() {
    this.game.reset();
    this.game.rollDice();
    this.selectedDie = null; // Clear selection on reset
    this.showMessage('¡Nuevo juego iniciado! Lanza los dados y colócalos en los controles.', 'info');
    this.render();
  }

  render() {
    this.renderStatus();
    this.renderDice();
    this.renderControls();
    this.renderPlaneOrientation();
    this.renderCoffee();
    this.renderRadio();
    this.renderSpeedTableDynamic();
    this.highlightCurrentPlayer();
    this.updateRoundButtonState();
  }

  renderStatus() {
    document.getElementById('round-number').textContent = this.game.round;
    document.getElementById('current-player').textContent = 
      this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto';
    document.getElementById('approach-distance').textContent = this.game.approachDistance;
  }

  renderDice() {
    // Render pilot dice
    const pilotContainer = document.getElementById('pilot-dice');
    pilotContainer.innerHTML = '';
    this.game.pilotDice.forEach(die => {
      const dieElement = this.createDieElement(die, 'pilot');
      pilotContainer.appendChild(dieElement);
    });

    // Render copilot dice
    const copilotContainer = document.getElementById('copilot-dice');
    copilotContainer.innerHTML = '';
    this.game.copilotDice.forEach(die => {
      const dieElement = this.createDieElement(die, 'copilot');
      copilotContainer.appendChild(dieElement);
    });
  }

  createDieElement(die, player) {
    const dieEl = document.createElement('div');
    dieEl.className = `die ${player}`;
    dieEl.innerHTML = this.getDieFace(die.value);
    dieEl.dataset.diceId = die.id;
    dieEl.dataset.player = player;
    dieEl.dataset.value = die.value;
    
    if (die.used) {
      dieEl.classList.add('used');
    } else {
      dieEl.draggable = true;
      dieEl.addEventListener('dragstart', (e) => this.handleDragStart(e, die, player));
      dieEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
      // Add click handler for selection
      dieEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDieClick(die, player);
      });
    }

    // Add selected class if this die is selected
    if (this.selectedDie && this.selectedDie.die.id === die.id) {
      dieEl.classList.add('selected');
    }

    return dieEl;
  }

  getDieFace(value) {
    // Return HTML for pips
    let pips = '';
    const pipCount = value;
    
    // Create correct number of pips
    for (let i = 0; i < pipCount; i++) {
      pips += '<span class="pip"></span>';
    }
    
    return pips;
  }

  handleDragStart(e, die, player) {
    // Store both value and player
    // If called from event listener, die and player are passed
    if (!die || !player) {
         // Fallback if extracting from element
         const dieElement = e.target;
         player = dieElement.classList.contains('pilot') ? 'pilot' : 'copilot';
         die = this.game[player === 'pilot' ? 'pilotDice' : 'copilotDice'].find(d => d.id === parseInt(dieElement.dataset.diceId));
    }
    
    // Verify it's this player's turn
    if (player !== this.game.currentPlayer) {
      e.preventDefault();
      return;
    }
    
    this.draggedDie = { die, player };
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', die.value);
    
    // Start auto-scroll
    this.startAutoScroll(e);
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.dice-slot').forEach(slot => {
      slot.classList.remove('drag-over');
    });
    // Also remove drag over from coffee slot
    const coffeeSlot = document.getElementById('make-coffee-slot');
    if (coffeeSlot) coffeeSlot.classList.remove('drag-over');
    
    // Stop auto-scroll
    this.stopAutoScroll();
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Update auto-scroll based on mouse position
    this.updateAutoScroll(e);
    
    const slot = e.target.closest('.dice-slot');
    if (slot && !slot.classList.contains('filled')) {
      slot.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    const slot = e.target.closest('.dice-slot');
    if (slot) {
      slot.classList.remove('drag-over');
    }
  }

  renderControls() {
    // Clear all slots visual state
    document.querySelectorAll('.dice-slot').forEach(slot => {
      const label = slot.querySelector('.slot-label');
      if (label) {
        slot.innerHTML = '';
        slot.appendChild(label);
      }
      slot.classList.remove('filled');
      slot.classList.remove('mandatory-empty');
    });

    // Render axis controls
    if (this.game.axisPilot !== null) {
      this.fillSlot('[data-control="axis"][data-player="pilot"]', this.game.axisPilot);
    } else {
      // Mark as mandatory empty
      const slot = document.querySelector('[data-control="axis"][data-player="pilot"]');
      if (slot) slot.classList.add('mandatory-empty');
    }
    if (this.game.axisCopilot !== null) {
      this.fillSlot('[data-control="axis"][data-player="copilot"]', this.game.axisCopilot);
    } else {
      // Mark as mandatory empty
      const slot = document.querySelector('[data-control="axis"][data-player="copilot"]');
      if (slot) slot.classList.add('mandatory-empty');
    }

    // Render engine controls
    if (this.game.enginesPilot !== null) {
      this.fillSlot('[data-control="engines"][data-player="pilot"]', this.game.enginesPilot);
    } else {
      // Mark as mandatory empty
      const slot = document.querySelector('[data-control="engines"][data-player="pilot"]');
      if (slot) slot.classList.add('mandatory-empty');
    }
    if (this.game.enginesCopilot !== null) {
      this.fillSlot('[data-control="engines"][data-player="copilot"]', this.game.enginesCopilot);
    } else {
      // Mark as mandatory empty
      const slot = document.querySelector('[data-control="engines"][data-player="copilot"]');
      if (slot) slot.classList.add('mandatory-empty');
    }

    // Render brakes
    if (this.game.brakes !== null) {
      this.fillSlot('[data-control="brakes"][data-player="pilot"]', this.game.brakes);
    }

    // Render landing gear
    this.renderDeploymentTrack('landing-gear-track', this.game.landingGear);

    // Render flaps
    this.renderDeploymentTrack('flaps-track', this.game.flaps);
  }

  fillSlot(selector, value) {
    const slot = document.querySelector(selector);
    if (slot) {
      const player = slot.dataset.player || 'pilot';
      // Preserve existing label if it exists
      const label = slot.querySelector('.slot-label');
      const labelHTML = label ? label.outerHTML : '';
      
      slot.innerHTML = `${labelHTML}<div class="die ${player}" data-value="${value}">${this.getDieFace(value)}</div>`;
      slot.classList.add('filled');
    }
  }

  renderDeploymentTrack(trackId, values) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const slots = track.querySelectorAll('.deployment-slot');
    slots.forEach((slot, index) => {
      slot.classList.remove('filled');
      slot.innerHTML = slot.dataset.required;
      
      if (values[index] !== undefined) {
        const isPilot = trackId.includes('landing-gear');
        const player = isPilot ? 'pilot' : 'copilot';
        slot.innerHTML = `<div class="die ${player}" data-value="${values[index]}">${this.getDieFace(values[index])}</div>`;
        slot.classList.add('filled');
      }
    });
  }

  renderCoffee() {
    // Render shared coffee
    const sharedCoffee = document.getElementById('shared-coffee');
    const coffeeCount = document.getElementById('coffee-count');
    if (!sharedCoffee || !coffeeCount) return;
    
    sharedCoffee.innerHTML = '';
    
    for (let i = 0; i < this.game.maxCoffee; i++) {
        const token = document.createElement('div');
        token.className = 'coffee-token';
        if (i < this.game.coffeeTokens) {
            token.textContent = '☕';
            token.classList.add('active');
        } else {
            token.classList.add('empty');
        }
        sharedCoffee.appendChild(token);
    }
    
    coffeeCount.textContent = `${this.game.coffeeTokens}/${this.game.maxCoffee}`;

    // Update drink coffee button state
    const drinkBtn = document.getElementById('drink-coffee-btn');
    const currentPlayerCanReroll = this.game.currentPlayer === 'pilot' ?
      this.game.pilotCanReroll : this.game.copilotCanReroll;
      
    if (drinkBtn) {
      drinkBtn.disabled = this.game.coffeeTokens <= 0 || currentPlayerCanReroll;
    }
    
    // Update reroll slot state
    const rerollSlot = document.getElementById('reroll-slot');
    if (rerollSlot) {
      if (currentPlayerCanReroll) {
        rerollSlot.classList.remove('disabled');
      } else {
        rerollSlot.classList.add('disabled');
      }
    }
  }

  renderRadio() {
    const radioTrack = document.getElementById('radio-track');
    if (!radioTrack) return;

    // Clear existing slots to rebuild them with new data if needed, 
    // OR just update them. Since structure changed, better to rebuild or be robust.
    // The HTML has hardcoded slots. Let's clear and rebuild them dynamically based on state
    // to support the dynamic distances.
    radioTrack.innerHTML = '';

    this.game.radioPlanes.forEach((plane, index) => {
      const slot = document.createElement('div');
      slot.className = 'radio-slot';
      slot.dataset.required = plane.value;
      slot.dataset.index = index; // Add index data for click handlers
      
      if (this.game.radioCleared[index]) {
        slot.classList.add('cleared');
        slot.innerHTML = `
            <span class="plane-icon">✈️</span>
            <span class="cleared-label">DESPEJADO</span>
        `;
      } else {
        slot.innerHTML = `
            <span class="distance-badge">Dist: ${plane.distance}</span>
            <span class="plane-icon">✈️</span>
            <span class="required-value">${plane.value}</span>
        `;
      }

      // Add listeners
      slot.addEventListener('dragover', (e) => this.handleDragOver(e));
      slot.addEventListener('drop', (e) => this.handleRadioDrop(e, index));
      slot.addEventListener('click', (e) => this.handleRadioClick(e, index));

      radioTrack.appendChild(slot);
    });
  }

  renderSpeedTable() {
    // Calculate current engine sum
    const engineSum = (this.game.enginesPilot || 0) + (this.game.enginesCopilot || 0);
    
    // Remove all active classes
    document.querySelectorAll('.speed-zone').forEach(zone => {
      zone.classList.remove('active');
    });
    
    // Highlight the current speed zone if engines are set
    if (this.game.enginesPilot !== null && this.game.enginesCopilot !== null) {
      const zones = document.querySelectorAll('.speed-zone');
      if (engineSum >= 1 && engineSum <= 3) {
        if (zones[0]) zones[0].classList.add('active');
      } else if (engineSum >= 4 && engineSum <= 6) {
        if (zones[1]) zones[1].classList.add('active');
      } else if (engineSum >= 7 && engineSum <= 9) {
        if (zones[2]) zones[2].classList.add('active');
      } else if (engineSum >= 10 && engineSum <= 12) {
        if (zones[3]) zones[3].classList.add('active');
      }
    }
  }

  renderPlaneOrientation() {
    // Remove all active classes
    document.querySelectorAll('.orientation-marker').forEach(marker => {
      marker.classList.remove('active');
    });

    // Calculate which marker should be active using potential orientation
    const orientation = this.game.getPotentialOrientation();
    const markers = document.querySelectorAll('.orientation-marker');
    
    // Center is index 3 (0-indexed). Range -3 to 3 maps to 0 to 6.
    const activeIndex = 3 + orientation;
    if (markers[activeIndex]) {
      markers[activeIndex].classList.add('active');
    }
  }

  updateRoundButtonState() {
    const btn = document.getElementById('new-round-btn');
    if (!btn) return;
    
    if (this.game.gameOver) {
      btn.disabled = true;
      return;
    }

    const pilotUnused = this.game.pilotDice.some(d => !d.used);
    const copilotUnused = this.game.copilotDice.some(d => !d.used);
    
    // Disable if any dice are unused
    btn.disabled = pilotUnused || copilotUnused;
  }

  handleDrop(e) {
    e.preventDefault();
    
    if (!this.draggedDie) return;
    
    // Check if dropping on coffee slot
    const coffeeSlot = e.target.closest('#make-coffee-slot');
    if (coffeeSlot) {
        this.handleMakeCoffeeDrop(e);
        return;
    }

    const slot = e.target.closest('.dice-slot');
    if (!slot) return;

    // Verify control type
    const control = slot.dataset.control;
    const player = slot.dataset.player; 
    
    // Check if slot is strictly for one player
    if (player && player !== this.draggedDie.player) {
      this.showMessage(`Casilla reservada para el ${player === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      return;
    }

    // Validate it's the current player's turn
    if (this.draggedDie.player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.draggedDie = null;
      return;
    }

    // FIX: Pass player instead of value to placeDice
    const result = this.game.placeDice(this.draggedDie.die.id, control, this.draggedDie.player);

    if (result.success) {
      this.render();
      this.showMessage(result.message, 'success');
      
      if (result.endRoundWarning) {
        this.showMessage(result.endRoundWarning, 'warning');
      }
    } else {
      this.showMessage(result.message, 'error');
    }

    this.draggedDie = null;
  }
  
  handleDeploymentDrop(e, control, slotIndex) {
    if (!this.draggedDie) return;

    const { die, player } = this.draggedDie;

    if (control === 'landing-gear' && player !== 'pilot') {
      this.showMessage('Solo el Piloto puede desplegar el Tren de Aterrizaje', 'error');
      this.draggedDie = null;
      return;
    }
    if (control === 'flaps' && player !== 'copilot') {
      this.showMessage('Solo el Copiloto puede desplegar los Flaps', 'error');
      this.draggedDie = null;
      return;
    }

    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.draggedDie = null;
      return;
    }

    const currentLength = control === 'landing-gear' ? 
      this.game.landingGear.length : this.game.flaps.length;
    
    if (slotIndex !== currentLength) {
      this.showMessage('Debes llenar las casillas en orden', 'warning');
      this.draggedDie = null;
      return;
    }

    const result = this.game.placeDice(die.id, control, player);
    
    if (result.success) {
      this.showMessage(`${player === 'pilot' ? 'Piloto' : 'Copiloto'} desplegó ${control === 'landing-gear' ? 'Tren' : 'Flaps'} ${slotIndex + 1}`, 'success');
      this.render();
    } else {
      this.showMessage(result.message, 'error');
    }

    this.draggedDie = null;
  }

  handleMakeCoffeeDrop(e) {
    if (!this.draggedDie) return;

    const { die, player } = this.draggedDie;

    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.draggedDie = null;
      return;
    }

    const result = this.game.makeCoffee(die.id, player);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.render(); 
    } else {
      this.showMessage(result.message, 'warning');
    }

    this.draggedDie = null;
  }

  handleMakeCoffeeClick(e) {
    if (!this.selectedDie) return;

    const { die, player } = this.selectedDie;

    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.selectedDie = null;
      this.render();
      return;
    }

    const result = this.game.makeCoffee(die.id, player);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.selectedDie = null;
      this.render(); 
    } else {
      this.showMessage(result.message, 'warning');
      this.selectedDie = null;
      this.render();
    }
  }

  handleDeploymentClick(e, control, slotIndex) {
    if (!this.selectedDie) return;
    
    const { die, player } = this.selectedDie;
    
    // Check player restrictions
    if (control === 'landing-gear' && player !== 'pilot') {
      this.showMessage('Solo el Piloto puede desplegar el Tren de Aterrizaje', 'error');
      this.selectedDie = null;
      this.render();
      return;
    }
    if (control === 'flaps' && player !== 'copilot') {
      this.showMessage('Solo el Copiloto puede desplegar los Flaps', 'error');
      this.selectedDie = null;
      this.render();
      return;
    }
    
    // Check turn
    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.selectedDie = null;
      this.render();
      return;
    }
    
    // Check order
    const currentLength = control === 'landing-gear' ? 
      this.game.landingGear.length : this.game.flaps.length;
    
    if (slotIndex !== currentLength) {
      this.showMessage('Debes llenar las casillas en orden', 'warning');
      this.selectedDie = null;
      this.render();
      return;
    }
    
    // Place die
    const result = this.game.placeDice(die.id, control, player);
    
    if (result.success) {
      this.showMessage(`${player === 'pilot' ? 'Piloto' : 'Copiloto'} desplegó ${control === 'landing-gear' ? 'Tren' : 'Flaps'} ${slotIndex + 1}`, 'success');
      this.selectedDie = null;
      this.render();
    } else {
      this.showMessage(result.message, 'error');
      this.selectedDie = null;
      this.render();
    }
  }

  handleRadioDrop(e, slotIndex) {
    if (!this.draggedDie) return;

    const { die, player } = this.draggedDie;

    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.draggedDie = null;
      return;
    }

    const result = this.game.placeRadio(die.id, player, slotIndex);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.render();
    } else {
      this.showMessage(result.message, 'error');
    }

    this.draggedDie = null;
  }

  handleRadioClick(e, slotIndex) {
    if (!this.selectedDie) return;
    
    const { die, player } = this.selectedDie;
    
    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.selectedDie = null;
      this.render();
      return;
    }
    
    const result = this.game.placeRadio(die.id, player, slotIndex);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.selectedDie = null;
      this.render();
    } else {
      this.showMessage(result.message, 'error');
      this.selectedDie = null;
      this.render();
    }
  }

  handleDrinkCoffee() {
    const result = this.game.drinkCoffee(this.game.currentPlayer);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.render();
    } else {
      this.showMessage(result.message, 'warning');
    }
  }

  handleRerollDrop(e) {
    if (!this.draggedDie) return;

    const { die, player } = this.draggedDie;

    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.draggedDie = null;
      return;
    }

    const canReroll = player === 'pilot' ? this.game.pilotCanReroll : this.game.copilotCanReroll;
    
    if (!canReroll) {
      this.showMessage('¡Debes tomar café primero para relanzar!', 'warning');
      this.draggedDie = null;
      return;
    }

    // Reroll this specific die
    die.value = Math.floor(Math.random() * 6) + 1;
    
    // Consume reroll ability
    if (player === 'pilot') {
      this.game.pilotCanReroll = false;
    } else {
      this.game.copilotCanReroll = false;
    }

    this.showMessage(`¡Dado relanzado! Nuevo valor: ${die.value}`, 'success');
    this.render();
    this.draggedDie = null;
  }

  showMessage(text, type = 'info') {
    // Create popup container if it doesn't exist
    let container = document.querySelector('.message-popup-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'message-popup-container';
      document.body.appendChild(container);
    }
    
    const popup = document.createElement('div');
    popup.className = `message-popup ${type}`;
    
    const text_el = document.createElement('div');
    text_el.className = 'message-popup-text';
    text_el.textContent = text;
    
    popup.appendChild(text_el);
    container.appendChild(popup);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      popup.classList.add('hiding');
      setTimeout(() => {
        popup.remove();
        // Clean up container if empty
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300); // Match animation duration
    }, 3000);
  }

  startAutoScroll(e) {
    const container = document.querySelector('.game-container');
    if (!container) return;

    // Clear any existing interval
    this.stopAutoScroll();

    this.autoScrollInterval = setInterval(() => {
      if (!this.draggedDie) {
        this.stopAutoScroll();
        return;
      }

      const rect = container.getBoundingClientRect();
      const scrollThreshold = 100; // pixels from edge to trigger scroll
      const scrollSpeed = 10; // pixels per interval

      // Get current mouse position from last drag event
      if (this.lastDragY !== undefined) {
        const distanceFromTop = this.lastDragY - rect.top;
        const distanceFromBottom = rect.bottom - this.lastDragY;

        if (distanceFromTop < scrollThreshold && distanceFromTop > 0) {
          // Scroll up
          container.scrollTop -= scrollSpeed;
        } else if (distanceFromBottom < scrollThreshold && distanceFromBottom > 0) {
          // Scroll down
          container.scrollTop += scrollSpeed;
        }
      }
    }, 16); // ~60fps
  }

  updateAutoScroll(e) {
    // Store the current mouse Y position for auto-scroll
    this.lastDragY = e.clientY;
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    this.lastDragY = undefined;
  }

  highlightCurrentPlayer() {
    const pilotSection = document.querySelector('.player-section.pilot');
    const copilotSection = document.querySelector('.player-section.copilot');
    const turnLabels = document.querySelectorAll('.status-item:nth-child(2) .label');
    const currentPlayerValue = document.getElementById('current-player');
    
    if (!pilotSection || !copilotSection) return;
    
    if (this.game.currentPlayer === 'pilot') {
      pilotSection.classList.add('active-turn');
      copilotSection.classList.remove('active-turn');
      // Update body class for cursor
      document.body.classList.remove('copilot-turn');
      document.body.classList.add('pilot-turn');
      // Update turn label color
      turnLabels.forEach(label => {
        label.style.color = 'var(--accent-blue)';
      });
      // Update status indicator
      if (currentPlayerValue) {
        currentPlayerValue.textContent = 'Piloto';
        currentPlayerValue.className = 'value pilot-active';
      }
    } else {
      copilotSection.classList.add('active-turn');
      pilotSection.classList.remove('active-turn');
      // Update body class for cursor
      document.body.classList.remove('pilot-turn');
      document.body.classList.add('copilot-turn');
      // Update turn label color
      turnLabels.forEach(label => {
        label.style.color = 'var(--accent-orange)';
      });
      // Update status indicator
      if (currentPlayerValue) {
        currentPlayerValue.textContent = 'Copiloto';
        currentPlayerValue.className = 'value copilot-active';
      }
    }
  }

  renderSpeedTableDynamic() {
    const engineSum = (this.game.enginesPilot || 0) + (this.game.enginesCopilot || 0);
    const landingGearSteps = this.game.landingGear.length; // 0, 1, 2, or 3
    const flapsSteps = this.game.flaps.length; // 0, 1, 2, or 3
    
    // MIN starts between 3-4 (order 30-40), moves +10 right for each landing gear step
    // Position 35 = between 3 and 4, then 45, 55, 65 (max)
    let minPosition = 35 + (landingGearSteps * 10);
    
    // MAX starts between 9-10 (order 90-100), moves +10 right for each flaps step  
    // Position 95 = between 9 and 10, then 105, 115, 125 (max)
    let maxPosition = 95 + (flapsSteps * 10);
    
    // Update indicators position using CSS order
    const minIndicator = document.getElementById('min-indicator');
    const maxIndicator = document.getElementById('max-indicator');
    
    if (minIndicator) {
      minIndicator.style.order = minPosition;
    }
    if (maxIndicator) {
      maxIndicator.style.order = maxPosition;
    }
    
    // Update current speed display
    const speedDisplay = document.getElementById('current-speed');
    if (speedDisplay) {
      if (engineSum > 0) {
        speedDisplay.textContent = `Velocidad: ${engineSum}`;
        speedDisplay.style.display = 'block';
      } else {
        speedDisplay.textContent = 'Velocidad: --';
      }
    }
    
    // Highlight current speed value
    document.querySelectorAll('.value-badge').forEach(badge => {
      const value = parseInt(badge.dataset.value || badge.textContent);
      badge.classList.toggle('active', value === engineSum && engineSum > 0);
    });
  }

  handleSlotClick(e) {
    // Only process if we have a selected die
    if (!this.selectedDie) return;
    
    const slot = e.target.closest('.dice-slot');
    if (!slot) return;
    
    const control = slot.dataset.control;
    const player = slot.dataset.player;
    
    // Check if slot is strictly for one player
    if (player && player !== this.selectedDie.player) {
      this.showMessage(`Casilla reservada para el ${player === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      return;
    }
    
    // Validate it's the current player's turn
    if (this.selectedDie.player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.selectedDie = null;
      this.render();
      return;
    }
    
    // Place the die using the same logic as drag & drop
    const result = this.game.placeDice(this.selectedDie.die.id, control, this.selectedDie.player);
    
    if (result.success) {
      this.selectedDie = null; // Clear selection
      this.render();
      this.showMessage(result.message, 'success');
      
      if (result.endRoundWarning) {
        this.showMessage(result.endRoundWarning, 'warning');
      }
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  handleDieClick(die, player) {
    // Verify it's this player's turn
    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      return;
    }
    
    // Toggle selection
    if (this.selectedDie && this.selectedDie.die.id === die.id) {
      // Deselect
      this.selectedDie = null;
    } else {
      // Select this die
      this.selectedDie = { die, player };
    }
    
    // Re-render to show selection
    this.render();
  }

  handleDiscardDrop(e) {
    e.preventDefault();
    
    if (!this.draggedDie) return;
    
    const { die, player } = this.draggedDie;
    
    // Verify it's this player's turn
    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.draggedDie = null;
      return;
    }
    
    // Discard the die
    die.used = true;
    
    // Switch turn
    this.game.currentPlayer = this.game.currentPlayer === 'pilot' ? 'copilot' : 'pilot';
    
    this.draggedDie = null;
    this.render();
    this.showMessage(`Dado descartado. Turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'info');
  }

  handleDiscardClick(e) {
    if (!this.selectedDie) return;
    
    const { die, player } = this.selectedDie;
    
    // Verify it's this player's turn
    if (player !== this.game.currentPlayer) {
      this.showMessage(`Es el turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'warning');
      this.selectedDie = null;
      this.render();
      return;
    }
    
    // Discard the die
    die.used = true;
    
    // Switch turn
    this.game.currentPlayer = this.game.currentPlayer === 'pilot' ? 'copilot' : 'pilot';
    
    this.selectedDie = null;
    this.render();
    this.showMessage(`Dado descartado. Turno del ${this.game.currentPlayer === 'pilot' ? 'Piloto' : 'Copiloto'}`, 'info');
  }

  showHelp(topic) {
    const helpTexts = {
      'axis': '🎯 Eje (Nivelación): Coloca 1 dado de cada jugador. La diferencia entre los valores mueve el avión horizontalmente hacia el lado del valor mayor.',
      'engines': '⚙️ Motores (Velocidad): Coloca 1 dado de cada jugador. La suma determina la velocidad del avión. Debe estar entre MIN y MAX.',
      'landing-gear': '🛬 Tren de Aterrizaje: Solo Piloto. Despliega con 3 dados en secuencia 1-2, 3-4, 5-6. Cada paso completado mueve el indicador MIN +1 en la tabla de velocidad.',
      'flaps': '🪂 Flaps: Solo Copiloto. Despliega con 3 dados en secuencia 1-2, 3-4, 5-6. Cada paso completado mueve el indicador MAX +1 en la tabla de velocidad.',
      'coffee': '☕ Cafés: Arrastra un dado para hacer café (máx 3 compartidos). Toma café para relanzar un dado. Si no tienes cafés disponibles, el dado se descarta.',
      'radio': '📻 Radio: Coloca dados en orden 2, 4, 6 para comunicarte con la torre de control. Ambos jugadores pueden participar.',
      'discard': '🗑️ Descartar Dado: Arrastra un dado aquí para descartarlo y pasar el turno al otro jugador. Útil cuando no tienes jugadas válidas.'
    };

    const message = helpTexts[topic] || 'Ayuda no disponible';
    this.showMessage(message, 'info');
  }
}
