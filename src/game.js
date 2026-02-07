// Game state management
export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.round = 1;
    this.currentPlayer = 'pilot'; // 'pilot' or 'copilot'
    this.approachDistance = 7; // Distance to airport (starts at 7)
    this.planeOrientation = 0; // -3 to +3 (left to right)
    this.hasLanded = false;
    this.gameOver = false;
    this.gameWon = false;
    
    // Dice for each player (4 dice per player)
    this.pilotDice = [];
    this.copilotDice = [];
    
    // Control placements
    this.axisPilot = null;
    this.axisCopilot = null;
    this.enginesPilot = null;
    this.enginesCopilot = null;
    this.brakes = null;
    
    // Deployment tracks (need 3 dice each)
    this.landingGear = []; // Pilot only
    this.flaps = []; // Copilot only
    
    // Coffee tokens (shared between players, max 3)
    this.coffeeTokens = 0;
    this.maxCoffee = 3;
    
    // Reroll capability (gained by drinking coffee)
    this.pilotCanReroll = false;
    this.copilotCanReroll = false;
    
    // Radio planes to clear
    this.radioPlanes = [2, 4, 6]; // Values needed to clear planes
    this.radioCleared = [false, false, false];
  }

  rollDice() {
    this.pilotDice = Array(4).fill(0).map(() => ({
      value: Math.floor(Math.random() * 6) + 1,
      used: false,
      id: `pilot-${Math.random()}`
    }));
    
    this.copilotDice = Array(4).fill(0).map(() => ({
      value: Math.floor(Math.random() * 6) + 1,
      used: false,
      id: `copilot-${Math.random()}`
    }));
  }

  placeDice(diceId, control, player) {
    const dice = player === 'pilot' ? this.pilotDice : this.copilotDice;
    const die = dice.find(d => d.id === diceId);
    
    if (!die || die.used) {
      return { success: false, message: 'Dado no válido' };
    }

    // Validate placement based on control and player
    const validation = this.validatePlacement(control, player, die.value);
    if (!validation.success) {
      return validation;
    }

    // Mark dice as used
    die.used = true;

    // Place the dice
    switch (control) {
      case 'axis':
        if (player === 'pilot') this.axisPilot = die.value;
        else this.axisCopilot = die.value;
        break;
      case 'engines':
        if (player === 'pilot') this.enginesPilot = die.value;
        else this.enginesCopilot = die.value;
        break;
      case 'brakes':
        this.brakes = die.value;
        break;
      case 'landing-gear':
        this.landingGear.push(die.value);
        break;
      case 'flaps':
        this.flaps.push(die.value);
        break;
      case 'radio':
        // Radio placement handled separately
        break;
    }

    // Switch player
    this.currentPlayer = this.currentPlayer === 'pilot' ? 'copilot' : 'pilot';

    return { success: true, message: 'Dado colocado correctamente' };
  }

  validatePlacement(control, player, value) {
    // Check player restrictions
    if (control === 'brakes' && player !== 'pilot') {
      return { success: false, message: 'Solo el Piloto puede usar los frenos' };
    }
    if (control === 'landing-gear' && player !== 'pilot') {
      return { success: false, message: 'Solo el Piloto puede desplegar el tren de aterrizaje' };
    }
    if (control === 'flaps' && player !== 'copilot') {
      return { success: false, message: 'Solo el Copiloto puede desplegar los flaps' };
    }

    // Check if slot is already filled
    if (control === 'axis') {
      if (player === 'pilot' && this.axisPilot !== null) {
        return { success: false, message: 'Espacio de Eje ya ocupado' };
      }
      if (player === 'copilot' && this.axisCopilot !== null) {
        return { success: false, message: 'Espacio de Eje ya ocupado' };
      }
    }
    if (control === 'engines') {
      if (player === 'pilot' && this.enginesPilot !== null) {
        return { success: false, message: 'Espacio de Motor ya ocupado' };
      }
      if (player === 'copilot' && this.enginesCopilot !== null) {
        return { success: false, message: 'Espacio de Motor ya ocupado' };
      }
    }

    // Check deployment track requirements
    if (control === 'landing-gear') {
      if (this.landingGear.length >= 3) {
        return { success: false, message: 'Tren de aterrizaje completamente desplegado' };
      }
      // Check value requirements for each slot
      const slotRequirements = [[1, 2], [3, 4], [5, 6]];
      const slot = this.landingGear.length;
      if (!slotRequirements[slot].includes(value)) {
        return { success: false, message: `La casilla ${slot + 1} requiere ${slotRequirements[slot].join(' o ')}` };
      }
    }

    if (control === 'flaps') {
      if (this.flaps.length >= 3) {
        return { success: false, message: 'Flaps completamente desplegados' };
      }
      const slotRequirements = [[1, 2], [3, 4], [5, 6]];
      const slot = this.flaps.length;
      if (!slotRequirements[slot].includes(value)) {
        return { success: false, message: `La casilla ${slot + 1} requiere ${slotRequirements[slot].join(' o ')}` };
      }
    }

    // Brakes can be placed anytime to prepare for landing
    if (control === 'brakes') {
       // No specific checking other than it's the pilot (already checked)
    }

    return { success: true };
  }

  endRound() {
    // Check mandatory placements
    if (this.axisPilot === null || this.axisCopilot === null) {
      return { success: false, message: 'JUEGO TERMINADO: ¡Ejes no configurados!', gameOver: true };
    }
    if (this.enginesPilot === null || this.enginesCopilot === null) {
      return { success: false, message: 'JUEGO TERMINADO: ¡Motores no configurados!', gameOver: true };
    }

    // Calculate axis (plane orientation)
    const axisDiff = this.axisPilot - this.axisCopilot;
    this.planeOrientation += Math.sign(axisDiff);
    this.planeOrientation = Math.max(-3, Math.min(3, this.planeOrientation));

    // Calculate speed and descent using speed table
    const engineSum = this.enginesPilot + this.enginesCopilot;
    const hasFlaps = this.flaps.length === 3;
    const descent = this.getDescentRate(engineSum, hasFlaps);
    
    this.approachDistance -= descent;

    // Check if landed
    if (this.approachDistance <= 0) {
      this.hasLanded = true;
      this.approachDistance = 0;
      return this.checkWinConditions();
    }

    // Check for stall (too slow - no descent)
    if (descent === 0) {
      this.gameOver = true;
      return { success: false, message: 'JUEGO TERMINADO: ¡Entrada en pérdida! Sin descenso.', gameOver: true };
    }

    // Prepare for next round
    this.round++;
    this.resetRound();

    return { success: true, message: `Ronda ${this.round - 1} completada. Descendiste ${descent}. Iniciando ronda ${this.round}`, engineSum, descent };
  }

  getDescentRate(engineSum, hasFlaps) {
    // NEW: Maximum descent is 2 per round
    // Speed zones: 1-3 = 0, 4-6 = 1, 7-9 = 2, 10-12 = 2
    let descent = 0;
    
    if (engineSum >= 1 && engineSum <= 3) {
      descent = 0;
    } else if (engineSum >= 4 && engineSum <= 6) {
      descent = 1;
    } else if (engineSum >= 7 && engineSum <= 12) {
      descent = 2;
    }
    
    // Flaps don't affect descent in this simplified version
    return descent;
  }

  resetRound() {
    this.currentPlayer = 'pilot';
    this.axisPilot = null;
    this.axisCopilot = null;
    this.enginesPilot = null;
    this.enginesCopilot = null;
    this.pilotCanReroll = false;
    this.copilotCanReroll = false;
    this.rollDice();
  }

  makeCoffee(diceId, player) {
    if (this.coffeeTokens >= this.maxCoffee) {
      return { success: false, message: 'Ya tienes el máximo de cafés (3)' };
    }

    const dice = player === 'pilot' ? this.pilotDice : this.copilotDice;
    const die = dice.find(d => d.id === diceId);
    
    if (!die || die.used) {
      return { success: false, message: 'Dado no válido' };
    }

    // Discard die to make coffee
    die.used = true;
    this.coffeeTokens++;

    return { success: true, message: `¡Café preparado! Ahora tienes ${this.coffeeTokens} café(s)` };
  }

  drinkCoffee(player) {
    const canReroll = player === 'pilot' ? this.pilotCanReroll : this.copilotCanReroll;
    
    if (this.coffeeTokens <= 0) {
      return { success: false, message: 'No hay cafés disponibles' };
    }

    if (canReroll) {
      return { success: false, message: 'Ya tienes capacidad de relanzar' };
    }

    // Drink coffee to gain reroll
    this.coffeeTokens--;
    
    if (player === 'pilot') {
      this.pilotCanReroll = true;
    } else {
      this.copilotCanReroll = true;
    }

    return { success: true, message: '¡Café consumido! Ahora puedes relanzar dados.' };
  }

  rerollDice(player) {
    const canReroll = player === 'pilot' ? this.pilotCanReroll : this.copilotCanReroll;
    
    if (!canReroll) {
      return { success: false, message: '¡Debes tomar café primero para relanzar!' };
    }

    // Reroll all unused dice for this player
    const dice = player === 'pilot' ? this.pilotDice : this.copilotDice;
    let rerolledCount = 0;
    
    dice.forEach(die => {
      if (!die.used) {
        die.value = Math.floor(Math.random() * 6) + 1;
        rerolledCount++;
      }
    });

    if (rerolledCount === 0) {
      return { success: false, message: 'No hay dados disponibles para relanzar' };
    }

    // Use up the reroll ability
    if (player === 'pilot') {
      this.pilotCanReroll = false;
    } else {
      this.copilotCanReroll = false;
    }

    return { success: true, message: `¡${rerolledCount} dado(s) relanzado(s)!` };
  }

  placeRadio(diceId, player, slotIndex) {
    const dice = player === 'pilot' ? this.pilotDice : this.copilotDice;
    const die = dice.find(d => d.id === diceId);
    
    if (!die || die.used) {
      return { success: false, message: 'Dado no válido' };
    }

    if (this.radioCleared[slotIndex]) {
      return { success: false, message: 'Avión ya despejado' };
    }

    if (die.value !== this.radioPlanes[slotIndex]) {
      return { success: false, message: `Necesitas ${this.radioPlanes[slotIndex]} para despejar este avión` };
    }

    // Mark dice as used and clear the plane
    die.used = true;
    this.radioCleared[slotIndex] = true;

    // Switch player
    this.currentPlayer = this.currentPlayer === 'pilot' ? 'copilot' : 'pilot';

    return { success: true, message: '¡Avión despejado!' };
  }

  checkWinConditions() {
    const issues = [];

    // Check if plane is level
    if (this.planeOrientation !== 0) {
      issues.push('Avión no nivelado');
    }

    // Check if landing gear deployed
    if (this.landingGear.length < 3) {
      issues.push('Tren de aterrizaje no desplegado completamente');
    }

    // Check if flaps deployed
    if (this.flaps.length < 3) {
      issues.push('Flaps no desplegados completamente');
    }

    // Check if brakes applied
    if (this.brakes === null) {
      issues.push('Frenos no activados');
    }

    if (issues.length > 0) {
      this.gameOver = true;
      return { 
        success: false, 
        message: `¡ATERRIZAJE FORZOSO! Problemas: ${issues.join(', ')}`, 
        gameOver: true 
      };
    }

    this.gameWon = true;
    this.gameOver = true;
    return { 
      success: true, 
      message: '🎉 ¡ATERRIZAJE EXITOSO! ¡Ganaste!', 
      gameOver: true,
      gameWon: true
    };
  }

  getState() {
    return {
      round: this.round,
      currentPlayer: this.currentPlayer,
      approachDistance: this.approachDistance,
      planeOrientation: this.planeOrientation,
      hasLanded: this.hasLanded,
      gameOver: this.gameOver,
      gameWon: this.gameWon,
      pilotDice: this.pilotDice,
      copilotDice: this.copilotDice,
      controls: {
        axisPilot: this.axisPilot,
        axisCopilot: this.axisCopilot,
        enginesPilot: this.enginesPilot,
        enginesCopilot: this.enginesCopilot,
        brakes: this.brakes,
        landingGear: this.landingGear,
        flaps: this.flaps
      }
    };
  }
}
