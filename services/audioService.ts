
/**
 * Serviço para gerar sons simples usando Web Audio API.
 * Som de colheita otimizado para ser proeminente e satisfatório.
 */
class AudioService {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playHarvest() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 1. Corpo Principal (O "Plop" da colheita)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(220, now); // Frequência mais baixa para corpo
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.1);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.5, now + 0.01); 
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    // 2. Brilho Harmônico (O "Sparkle" de sucesso)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    // 3. Simulação de Reverberação/Eco (Camada de cauda longa)
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(440, now + 0.05);
    
    gain3.gain.setValueAtTime(0, now + 0.05);
    gain3.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // Cauda bem longa

    osc3.connect(gain3);
    gain3.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now + 0.05);
    
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.3);
    osc3.stop(now + 0.8);
  }

  playPop() {
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playCash() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1600, now + 0.05);
    gain2.gain.setValueAtTime(0.1, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.25);
  }
}

export const audioService = new AudioService();
