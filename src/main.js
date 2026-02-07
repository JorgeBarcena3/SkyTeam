import './style.css';
import { GameState } from './game.js';
import { UIManager } from './ui.js';
import { TutorialManager } from './tutorial.js';

// Initialize game
const game = new GameState();
const ui = new UIManager(game);
const tutorial = new TutorialManager(ui);

// Start first game
game.rollDice();
ui.render();
ui.showMessage('Welcome to SkyTeam! Place dice on Axis and Engines (mandatory), then click "Start New Round"', 'info');

// Make game accessible from console for debugging
window.game = game;
window.ui = ui;
window.tutorialManager = tutorial;

// Tutorial button
document.getElementById('tutorial-btn').addEventListener('click', () => {
  tutorial.start();
});

// Auto-start tutorial on first load
if (tutorial.shouldShowOnLoad()) {
  setTimeout(() => {
    tutorial.start();
  }, 1000);
}
