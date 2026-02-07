// Tutorial System
export class TutorialManager {
  constructor(uiManager) {
    this.ui = uiManager;
    this.currentStep = 0;
    this.isActive = false;
    this.steps = [
      {
        title: '¡Bienvenido a SkyTeam!',
        content: 'SkyTeam es un juego cooperativo donde tú y tu compañero deben aterrizar un avión de forma segura. Trabajen juntos para gestionar los controles de la cabina.',
        target: null,
        position: 'center'
      },
      {
        title: 'Orientación del Avión',
        content: 'El avión debe estar nivelado (marcador en el centro) al aterrizar. Usa el control de Eje para ajustar la orientación.',
        target: '.plane-orientation',
        position: 'bottom'
      },
      {
        title: 'Eje (Obligatorio)',
        content: 'Ambos jugadores DEBEN colocar un dado aquí cada ronda. La suma determina si el avión se inclina a la izquierda o derecha.',
        target: '[data-control="axis"]',
        position: 'bottom'
      },
      {
        title: 'Motores (Obligatorio)',
        content: 'Ambos jugadores DEBEN colocar un dado aquí cada ronda. La suma controla la velocidad de aproximación.',
        target: '[data-control="engines"]',
        position: 'bottom'
      },
      {
        title: 'Tren de Aterrizaje',
        content: 'El piloto debe desplegar el tren de aterrizaje colocando dados en secuencia que coincidan con los valores requeridos.',
        target: '#landing-gear-track',
        position: 'top'
      },
      {
        title: 'Flaps',
        content: 'El copiloto debe desplegar los flaps colocando dados en secuencia que coincidan con los valores requeridos.',
        target: '#flaps-track',
        position: 'top'
      },
      {
        title: 'Frenos',
        content: 'Después de aterrizar, el piloto debe aplicar los frenos colocando un dado aquí.',
        target: '[data-control="brakes"]',
        position: 'top'
      },
      {
        title: 'Tus Dados',
        content: 'Cada jugador tiene 4 dados por ronda. Arrastra y suelta los dados en los controles. Los dados usados se vuelven grises.',
        target: '.players-area',
        position: 'top'
      },
      {
        title: 'Concentración (Café)',
        content: 'Usa tokens de café para volver a tirar dados no utilizados. ¡Úsalos sabiamente!',
        target: '.coffee-section',
        position: 'top'
      },
      {
        title: 'Radio',
        content: 'Despeja aviones del espacio aéreo colocando dados que coincidan con los valores mostrados.',
        target: '.radio-section',
        position: 'top'
      },
      {
        title: '¡Listo para Despegar!',
        content: 'Recuerda: ¡La comunicación es clave! Planifica con tu compañero antes de colocar los dados. ¡Buena suerte!',
        target: null,
        position: 'center'
      }
    ];
  }

  start() {
    this.currentStep = 0;
    this.isActive = true;
    this.showStep();
  }

  showStep() {
    if (this.currentStep >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.currentStep];
    this.renderOverlay(step);
  }

  renderOverlay(step) {
    // Remove existing overlay
    const existing = document.querySelector('.tutorial-overlay');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'tutorial-backdrop';
    overlay.appendChild(backdrop);

    // Highlight target if exists
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'tutorial-highlight';
        highlight.style.top = `${rect.top - 10}px`;
        highlight.style.left = `${rect.left - 10}px`;
        highlight.style.width = `${rect.width + 20}px`;
        highlight.style.height = `${rect.height + 20}px`;
        overlay.appendChild(highlight);
      }
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = `tutorial-tooltip ${step.position}`;
    
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        if (step.position === 'bottom') {
          tooltip.style.top = `${rect.bottom + 20}px`;
          tooltip.style.left = `${rect.left + rect.width / 2}px`;
          tooltip.style.transform = 'translateX(-50%)';
        } else if (step.position === 'top') {
          tooltip.style.top = `${rect.top - 20}px`;
          tooltip.style.left = `${rect.left + rect.width / 2}px`;
          tooltip.style.transform = 'translate(-50%, -100%)';
        }
      }
    } else {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }

    tooltip.innerHTML = `
      <div class="tutorial-header">
        <h3>${step.title}</h3>
        <button class="tutorial-close" onclick="window.tutorialManager.skip()">✕</button>
      </div>
      <div class="tutorial-content">
        <p>${step.content}</p>
      </div>
      <div class="tutorial-footer">
        <span class="tutorial-progress">${this.currentStep + 1} / ${this.steps.length}</span>
        <div class="tutorial-buttons">
          ${this.currentStep > 0 ? '<button class="btn-tutorial btn-prev" onclick="window.tutorialManager.prev()">Anterior</button>' : ''}
          <button class="btn-tutorial btn-next" onclick="window.tutorialManager.next()">
            ${this.currentStep === this.steps.length - 1 ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);
  }

  next() {
    this.currentStep++;
    this.showStep();
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep();
    }
  }

  skip() {
    this.complete();
  }

  complete() {
    this.isActive = false;
    const overlay = document.querySelector('.tutorial-overlay');
    if (overlay) overlay.remove();
    localStorage.setItem('skyteam-tutorial-completed', 'true');
  }

  shouldShowOnLoad() {
    return !localStorage.getItem('skyteam-tutorial-completed');
  }
}
