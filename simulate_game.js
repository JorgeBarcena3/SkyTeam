// Simulation Script for SkyTeam
// Attempts to play a perfect game to verify winnability.

async function simulateGame() {
    console.log("Starting Auto-Play Simulation...");
    const game = window.ui.game; 
    const ui = window.ui;

    if (!game) {
        console.error("Game instance not found!");
        return;
    }

    game.reset();
    game.rollDice();
    ui.render();

    // Helper functions
    function place(player, control, value, slotIndex = null) {
        const dice = player === 'pilot' ? game.pilotDice : game.copilotDice;
        let die = dice.find(d => !d.used && d.value === value);
        
        // Cheat if needed for testing logic
        if (!die) {
             die = dice.find(d => !d.used);
             if (die) {
                 die.value = value;
             }
        }

        if (!die) {
            console.error(`No dice available for ${player} to place ${value} on ${control}`);
            return false;
        }

        // Logic from UI handleDrop / handleDeploymentDrop
        // ALWAYS pass player as 3rd argument!
        const res = game.placeDice(die.id, control, player);
        
        if (!res.success) {
            console.error(`Failed to place ${player} die ${value} on ${control}: ${res.message}`);
        } else {
            console.log(`Placed ${player} die ${value} on ${control}`);
        }
        return res.success;
    }
    
    function endRound() {
        ui.startNewRound();
        console.log(`--- Round ${game.round-1} Ended. Distance: ${game.approachDistance}. Status: ${game.gameOver ? 'GAME OVER' : 'Ongoing'} ---`);
    }

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    // Game Plan:
    // Distance 7. 
    // R1: Speed 2 (Dist 5). Axis 0. Landing Gear 1. Flaps 1.
    
    // R1
    console.log("executing Round 1");
    if (!place('pilot', 'axis', 3)) return;
    if (!place('copilot', 'axis', 3)) return;
    if (!place('pilot', 'engines', 5)) return;
    if (!place('copilot', 'engines', 5)) return;
    
    // Deployments R1
    if (!place('pilot', 'landing-gear', 1, 0)) return;
    if (!place('copilot', 'flaps', 2, 0)) return;
    
    await delay(100);
    endRound();
    if (game.gameOver) return;
    
    // R2
    console.log("executing Round 2");
    if (!place('pilot', 'axis', 4)) return;
    if (!place('copilot', 'axis', 4)) return;
    if (!place('pilot', 'engines', 4)) return;
    if (!place('copilot', 'engines', 4)) return;
    
    // Deployments R2
    if (!place('pilot', 'landing-gear', 3, 1)) return;
    if (!place('copilot', 'flaps', 4, 1)) return;
    
    await delay(100);
    endRound();
    if (game.gameOver) return;
    
    // R3
    console.log("executing Round 3");
    if (!place('pilot', 'axis', 2)) return;
    if (!place('copilot', 'axis', 2)) return;
    if (!place('pilot', 'engines', 2)) return;
    if (!place('copilot', 'engines', 3)) return; // Sum 5 -> Speed 1. Dist 3->2.
    
    // Deployments R3
    if (!place('pilot', 'landing-gear', 5, 2)) return;
    if (!place('copilot', 'flaps', 6, 2)) return;
    
    await delay(100);
    endRound();
    if (game.gameOver) return;
    
    // R4
    console.log("executing Round 4");
    // Speed 1 (Sum 4-6). Dist 2->1.
    // Need to clear radios: 2, 4, 6.
    
    if (!place('pilot', 'axis', 5)) return;
    if (!place('copilot', 'axis', 5)) return;
    if (!place('pilot', 'engines', 2)) return;
    if (!place('copilot', 'engines', 2)) return;
    
    // Clear Radios. Radio slots are by INDEX in placeRadio, but placeDice doesn't handle radio?
    // game.placeDice doesn't handle radio!
    // src/game.js line 94: case 'radio': break;
    // We must use game.placeRadio for radios!
    
    // Helper for radio
    function placeRadio(player, value, slotIndex) {
         const dice = player === 'pilot' ? game.pilotDice : game.copilotDice;
         let die = dice.find(d => !d.used && d.value === value);
         if (!die) {
             die = dice.find(d => !d.used);
             if (die) die.value = value;
         }
         if (!die) return false;
         
         const res = game.placeRadio(die.id, player, slotIndex);
         if (res.success) console.log(`Placed Radio ${value} on slot ${slotIndex}`);
         else console.error(`Failed Radio ${value}: ${res.message}`);
         return res.success;
    }

    if (!placeRadio('pilot', 2, 0)) return;
    if (!placeRadio('copilot', 4, 1)) return;
    
    await delay(100);
    endRound();
    if (game.gameOver) return;
    
    // R5 (Landing Round)
    console.log("executing Round 5 (Landing)");
    // Dist 1->0.
    
    if (!place('pilot', 'axis', 1)) return;
    if (!place('copilot', 'axis', 1)) return;
    
    if (!place('pilot', 'engines', 3)) return;
    if (!place('copilot', 'engines', 2)) return;
    
    // Clear last Radio (6)
    if (!placeRadio('copilot', 6, 2)) return;
    
    // Brakes (Pilot only). 
    if (!place('pilot', 'brakes', 2)) return;
    
    await delay(100);
    endRound();
    
    if (game.gameWon) {
        console.log("SUCCESS: GAME WON!");
    } else {
        console.error("FAILURE: Game Over but not Won.");
        console.log("Issues:", game.gameOverMessage || "Unknown"); 
        // Try to read result message from UI if available?
        // Actually ui.showMessage sets a div.
    }
}
simulateGame();
