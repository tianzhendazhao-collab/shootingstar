// Sound Synthesizer using Web Audio API
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.sfxVolume = null;
    this.bgmVolume = null;
    this.noiseBuffer = null;
    this.lastPlayTimes = {}; // For throttling high-frequency sound effects (shooting, grazing, enemy hits)

    this.sfxEnabled = true;
    this.bgmEnabled = false; // Off by default until user interaction

    // BGM Sequencer state
    this.bpm = 135;
    this.schedulerTimerId = null;
    this.nextNoteTime = 0.0;
    this.currentStep = 0; // 0 to 15 (16th notes)
    this.currentMeasure = 0;
    this.chords = [
      { root: 45, type: 'min' }, // Am (A2)
      { root: 41, type: 'maj' }, // F (F2)
      { root: 48, type: 'maj' }, // C (C3)
      { root: 43, type: 'maj' }  // G (G2)
    ];
    this.isPlayingBGM = false;
  }

  init() {
    if (this.ctx) return;

    // Create AudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create Master Output Nodes
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime); // Low default volume
    this.masterVolume.connect(this.ctx.destination);

    this.sfxVolume = this.ctx.createGain();
    this.sfxVolume.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.sfxVolume.connect(this.masterVolume);

    this.bgmVolume = this.ctx.createGain();
    this.bgmVolume.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.bgmVolume.connect(this.masterVolume);

    // Create White Noise Buffer for explosions
    this.noiseBuffer = this.createNoiseBuffer();

    // Start background music loop scheduler if BGM is enabled
    if (this.bgmEnabled) {
      this.startBGM();
    }
  }

  // Create white noise
  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Set BGM enabled state
  setBGMEnabled(enabled) {
    this.bgmEnabled = enabled;
    if (enabled) {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startBGM();
    } else {
      this.stopBGM();
    }
  }

  // Set SFX enabled state
  setSFXEnabled(enabled) {
    this.sfxEnabled = enabled;
    if (enabled) {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
  }

  // Player Shot Sound (Triangle Wave Sweep)
  playShoot() {
    if (!this.sfxEnabled) return;
    const now = Date.now();
    if (this.lastPlayTimes['shoot'] && now - this.lastPlayTimes['shoot'] < 60) return;
    this.lastPlayTimes['shoot'] = now;
    
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

    gainNode.gain.setValueAtTime(0.12, t);
    gainNode.gain.linearRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Enemy / Small Explosion Sound
  playExplode() {
    if (!this.sfxEnabled) return;
    const now = Date.now();
    if (this.lastPlayTimes['explode'] && now - this.lastPlayTimes['explode'] < 50) return;
    this.lastPlayTimes['explode'] = now;

    this.init();

    const t = this.ctx.currentTime;
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.25);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    noiseNode.start(t);
    noiseNode.stop(t + 0.35);
  }

  // Player Damaged Sound (Heavy Noise + Pitch Fall)
  playPlayerHit() {
    if (!this.sfxEnabled) return;
    this.init();

    const t = this.ctx.currentTime;
    
    // Low Frequency sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.4);

    // Noise burst
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.4);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(filter);
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    osc.start(t);
    noiseNode.start(t);
    osc.stop(t + 0.5);
    noiseNode.stop(t + 0.5);
  }

  // Boss Damaged Sound (Distorted Short Saw Sweep)
  playBossHit() {
    if (!this.sfxEnabled) return;
    const now = Date.now();
    if (this.lastPlayTimes['bossHit'] && now - this.lastPlayTimes['bossHit'] < 40) return;
    this.lastPlayTimes['bossHit'] = now;

    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.08);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, t);
    gainNode.gain.linearRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Boss Destroyed / Phase Defeated (Heavy explosion rumble)
  playBossExplode() {
    if (!this.sfxEnabled) return;
    this.init();

    const t = this.ctx.currentTime;
    // Chain multiple explosions
    for (let i = 0; i < 6; i++) {
      const delay = i * 0.15;
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300 - i * 30, t + delay);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.35, t + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + delay + 0.5);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxVolume);

      noiseNode.start(t + delay);
      noiseNode.stop(t + delay + 0.5);
    }
  }

  // Bomb Sound (Rising charging sound then massive bass drop explosion)
  playBomb() {
    if (!this.sfxEnabled) return;
    this.init();

    const t = this.ctx.currentTime;

    // Rising laser sweep (0.3s)
    const riseOsc = this.ctx.createOscillator();
    riseOsc.type = 'sawtooth';
    riseOsc.frequency.setValueAtTime(100, t);
    riseOsc.frequency.exponentialRampToValueAtTime(1800, t + 0.3);

    const riseGain = this.ctx.createGain();
    riseGain.gain.setValueAtTime(0.01, t);
    riseGain.gain.linearRampToValueAtTime(0.2, t + 0.3);

    riseOsc.connect(riseGain);
    riseGain.connect(this.sfxVolume);
    riseOsc.start(t);
    riseOsc.stop(t + 0.35);

    // Explosive Shockwave (at 0.3s)
    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(150, t + 0.3);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 1.2);

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t + 0.3);
    filter.frequency.exponentialRampToValueAtTime(30, t + 1.2);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0, t);
    boomGain.gain.setValueAtTime(0.6, t + 0.3);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    boomOsc.connect(boomGain);
    noiseNode.connect(filter);
    filter.connect(boomGain);
    boomGain.connect(this.sfxVolume);

    boomOsc.start(t + 0.3);
    noiseNode.start(t + 0.3);
    boomOsc.stop(t + 1.3);
    noiseNode.stop(t + 1.3);
  }

  // UI Button Hover Sound (Short soft beep)
  playHover() {
    if (!this.sfxEnabled) return;
    const now = Date.now();
    if (this.lastPlayTimes['hover'] && now - this.lastPlayTimes['hover'] < 50) return;
    this.lastPlayTimes['hover'] = now;

    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    gainNode.gain.setValueAtTime(0.05, t);
    gainNode.gain.linearRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // UI Button Click / Start Sound (Uplifting double chime)
  playClick() {
    if (!this.sfxEnabled) return;
    this.init();

    const t = this.ctx.currentTime;
    
    // First chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, t); // C5
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.linearRampToValueAtTime(0.001, t + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.sfxVolume);
    osc1.start(t);
    osc1.stop(t + 0.1);

    // Second chime
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, t + 0.08); // E5
    gain2.gain.setValueAtTime(0.12, t + 0.08);
    gain2.gain.linearRampToValueAtTime(0.001, t + 0.22);
    osc2.connect(gain2);
    gain2.connect(this.sfxVolume);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.22);
  }

  // Game Victory Melody (Short synth fanfare)
  playVictory() {
    if (!this.sfxEnabled) return;
    this.init();
    
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    const dur = 0.12;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * dur);

      // Make the final note long
      const noteLength = idx === notes.length - 1 ? 0.6 : dur;

      gainNode.gain.setValueAtTime(0.1, t + idx * dur);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + idx * dur + noteLength);

      osc.connect(gainNode);
      gainNode.connect(this.sfxVolume);

      osc.start(t + idx * dur);
      osc.stop(t + idx * dur + noteLength);
    });
  }

  // Game Defeat Sound (Dissonant descending sad melody)
  playDefeat() {
    if (!this.sfxEnabled) return;
    this.init();

    const t = this.ctx.currentTime;
    const notes = [293.66, 277.18, 261.63, 246.94]; // D4, C#4, C4, B3
    const dur = 0.25;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * dur);

      const noteLength = idx === notes.length - 1 ? 0.8 : dur;
      gainNode.gain.setValueAtTime(0.1, t + idx * dur);
      gainNode.gain.linearRampToValueAtTime(0.001, t + idx * dur + noteLength);

      osc.connect(gainNode);
      gainNode.connect(this.sfxVolume);

      osc.start(t + idx * dur);
      osc.stop(t + idx * dur + noteLength);
    });
  }

  // Cheat Code Activated Sound (Retro classic chime melody)
  playCheatActivated() {
    if (!this.sfxEnabled) return;
    this.init();

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const dur = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine'; // pure retro sine wave
      osc.frequency.setValueAtTime(freq, t + idx * dur);

      const noteLength = idx === notes.length - 1 ? 0.45 : dur;

      gainNode.gain.setValueAtTime(0.12, t + idx * dur);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + idx * dur + noteLength);

      osc.connect(gainNode);
      gainNode.connect(this.sfxVolume);

      osc.start(t + idx * dur);
      osc.stop(t + idx * dur + noteLength);
    });
  }

  // --- PROCEDURAL SYNTH BGM SYSTEM ---

  startBGM() {
    if (this.isPlayingBGM) return;
    this.isPlayingBGM = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.currentStep = 0;
    this.currentMeasure = 0;

    const scheduler = () => {
      while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
        this.scheduleNote(this.currentStep, this.nextNoteTime);
        this.advanceStep();
      }
      if (this.isPlayingBGM) {
        this.schedulerTimerId = setTimeout(scheduler, 25);
      }
    };
    scheduler();
  }

  stopBGM() {
    this.isPlayingBGM = false;
    if (this.schedulerTimerId) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  advanceStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16th = 0.25 * secondsPerBeat;
    this.nextNoteTime += secondsPer16th;

    this.currentStep++;
    if (this.currentStep >= 16) {
      this.currentStep = 0;
      this.currentMeasure++;
    }
  }

  // Convert MIDI note number to frequency
  midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  scheduleNote(step, time) {
    const chordIdx = Math.floor(this.currentMeasure / 2) % this.chords.length;
    const currentChord = this.chords[chordIdx];
    
    // --- BASS SYNTH (Arpeggiator) ---
    // Simple pulsing bassline
    let midiNote = currentChord.root;
    let playBass = false;

    // Pattern for bass: 8th notes (steps 0, 2, 4, 6, 8, 10, 12, 14)
    if (step % 2 === 0) {
      playBass = true;
      // Vary octave or pitch occasionally
      if (step === 6 || step === 14) {
        midiNote += 7; // Play fifth
      } else if (step === 8 || step === 10) {
        midiNote += 12; // Play octave up
      }
    }

    if (playBass) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.midiToFreq(midiNote - 12), time); // Play one octave lower

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, time);
      filter.frequency.exponentialRampToValueAtTime(700, time + 0.05);
      filter.frequency.exponentialRampToValueAtTime(150, time + 0.15);

      gainNode.gain.setValueAtTime(0.08, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.bgmVolume);

      osc.start(time);
      osc.stop(time + 0.2);
    }

    // --- LEADS / ARP PLUCK ---
    // Fast melody arpeggio (16th notes)
    let playArp = false;
    let arpNote = currentChord.root + 12; // Start an octave higher

    // Define simple arpeggio shapes based on step
    const arpPattern = [0, 4, 7, 12, 7, 4, 12, 7, 16, 12, 7, 4, 7, 12, 16, 19];
    arpNote += arpPattern[step];

    // Play arp pluck on offbeats or alternating steps
    // To keep BGM in background, make it soft and only on certain steps
    if (step % 2 === 1 && Math.random() > 0.1) {
      playArp = true;
    }

    if (playArp) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.midiToFreq(arpNote), time);

      gainNode.gain.setValueAtTime(0.035, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gainNode);
      gainNode.connect(this.bgmVolume);

      osc.start(time);
      osc.stop(time + 0.1);
    }

    // --- PROCEDURAL DRUMS ---
    // 1. Kick Drum (Step 0, 4, 8, 12)
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

      gainNode.gain.setValueAtTime(0.2, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.bgmVolume);

      osc.start(time);
      osc.stop(time + 0.16);
    }

    // 2. Snare Drum (Step 4, 12)
    if (step === 4 || step === 12) {
      // White noise snare
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, time);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.bgmVolume);

      noiseSource.start(time);
      noiseSource.stop(time + 0.12);
    }

    // 3. Hi-Hat (Step 2, 6, 10, 14)
    if (step % 4 === 2) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, time);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.04, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.bgmVolume);

      noiseSource.start(time);
      noiseSource.stop(time + 0.04);
    }
  }
}

// Export the SoundSystem globally
const Sound = new SoundSystem();
window.Sound = Sound;
