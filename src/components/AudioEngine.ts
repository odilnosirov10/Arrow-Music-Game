/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private isMuted: boolean = false;
  private currentVolumeVal: number = 0.5;

  // Background synthesizer loop state
  private schedulerIntervalId: any = null;
  private nextNoteTime: number = 0.0; // absolute time for next beat
  private beatCount: number = 0;
  private bpm: number = 110;
  private synthBeatEnabled: boolean = false;
  private onBeatCallback: ((beatNum: number) => void) | null = null;

  // Noise buffer for hi-hat and snare sounds
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy initialisation on first play or resume
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(this.currentVolumeVal, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);
      
      this.buildNoiseBuffer();
    } catch (e) {
      console.error('Web Audio API is not supported in this browser.', e);
    }
  }

  private buildNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.15; // 150ms of noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    this.currentVolumeVal = Math.max(0, Math.min(1, volume));
    this.initContext();
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolumeVal, this.ctx.currentTime);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    this.setVolume(this.currentVolumeVal);
  }

  // Pure sine beep for game sequences (Left, Down, Up, Right frequencies)
  public playBeep(frequency: number, duration: number = 0.15, type: OscillatorType = 'sine') {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    // Smooth transition off
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Play crisp "Perfect" sound chimes
  public playPerfect() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord extremely quick
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.02);
      
      gain.gain.setValueAtTime(0.08, now + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.02 + 0.15);
      
      osc.connect(gain);
      gain.connect(this.masterVolume!);
      
      osc.start(now + i * 0.02);
      osc.stop(now + i * 0.02 + 0.16);
    });
  }

  // Play standard hit chime
  public playHit(rating: 'GREAT' | 'GOOD') {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    const freq = rating === 'GREAT' ? 440 : 330; // A4 or E4
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  // Low buzz miss sound
  public playMiss() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.23);
  }

  // Retro sound effects for menu and score increments
  public playScoreUp() {
    this.playBeep(880, 0.05, 'triangle');
  }

  public playMenuClick() {
    this.playBeep(587.33, 0.06, 'sine'); // D5 pitch click
  }

  public playComboBreaker() {
    this.playMiss();
  }

  public playVictory() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Ascending arpeggio
    const chord = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50];
    chord.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.06, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (i + 1) * 0.15);
      osc.connect(gain);
      gain.connect(this.masterVolume!);
      osc.start(now + i * 0.08);
      osc.stop(now + (i + 1) * 0.15);
    });
  }

  // --- SYNTHESIZED DRUM & BASS BEAT SEQUENCER ---
  // Uses precise Web Audio API timing relative to AudioContext.currentTime

  public startRhythmBeat(bpm: number, onBeat: (beatNum: number) => void) {
    this.resume();
    this.initContext();
    if (!this.ctx) return;

    // Clear any previous running intervals
    this.stopRhythmBeat();

    this.bpm = bpm;
    this.onBeatCallback = onBeat;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.beatCount = 0;
    this.synthBeatEnabled = true;

    // Use a high-frequency lookahead scheduler to beat precision drifts
    const lookahead = 25.0; // milliseconds
    const scheduleAheadTime = 0.1; // seconds

    const scheduler = () => {
      while (this.nextNoteTime < this.ctx!.currentTime + scheduleAheadTime) {
        this.scheduleBeat(this.beatCount, this.nextNoteTime);
        
        // Notify React to trigger visual pulses or spawn rhythmic arrows
        const cachedBeat = this.beatCount;
        const delayMs = (this.nextNoteTime - this.ctx!.currentTime) * 1000;
        setTimeout(() => {
          if (this.synthBeatEnabled && this.onBeatCallback) {
            this.onBeatCallback(cachedBeat);
          }
        }, Math.max(0, delayMs));

        // Advance to next 8th note / 16th note (we divide 1 beat into 4 subdivisions)
        const secondsPerBeat = 60.0 / this.bpm;
        const subdivisionSeconds = secondsPerBeat / 2; // 8th notes
        this.nextNoteTime += subdivisionSeconds;
        this.beatCount = (this.beatCount + 1) % 16;
      }
      this.schedulerIntervalId = setTimeout(scheduler, lookahead);
    };

    scheduler();
  }

  public stopRhythmBeat() {
    this.synthBeatEnabled = false;
    if (this.schedulerIntervalId) {
      clearTimeout(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
  }

  private scheduleBeat(beatNum: number, time: number) {
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // beatNum goes 0 to 15 (representing 16 subdivisions in a standard 2-measure loop)
    // 8th-note steps.
    const isQuarterNote = beatNum % 2 === 0;
    const quarterIndex = Math.floor(beatNum / 2) % 4; // 0, 1, 2, 3

    // Kick on beat 1 & 3
    if (beatNum === 0 || beatNum === 8 || beatNum === 6 || beatNum === 14) {
      this.triggerKick(time);
    }

    // Snare / Hihat on beats 2 & 4 (beatNum 4, 12)
    if (beatNum === 4 || beatNum === 12) {
      this.triggerSnareNoise(time);
    } else if (beatNum % 2 !== 0) {
      // Off-beat Hihats
      this.triggerClosedHat(time);
    }

    // Melodic Synth wave bass arp on grid ticks
    this.triggerBassArp(beatNum, time);
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.masterVolume) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.frequency.setValueAtTime(120, time);
    // Exponential sweep from 120Hz to 40Hz to mimic synthetic kick drum thump
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.start(time);
    osc.stop(time + 0.17);
  }

  private triggerClosedHat(time: number) {
    if (!this.ctx || !this.masterVolume || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    source.start(time);
    source.stop(time + 0.06);
  }

  private triggerSnareNoise(time: number) {
    if (!this.ctx || !this.masterVolume || !this.noiseBuffer) return;

    // Layer 1: White noise snap
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterVolume);

    // Layer 2: Mid oscillator tone snap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);

    oscGain.gain.setValueAtTime(0.12, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.masterVolume);

    source.start(time);
    source.stop(time + 0.13);
    
    osc.start(time);
    osc.stop(time + 0.10);
  }

  // Plays a bassline arp that stays in key
  private triggerBassArp(beatNum: number, time: number) {
    if (!this.ctx || !this.masterVolume) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';

    // Electro Synth Loop (Key of G minor / Eb Major)
    // Chord progression: Gm (8 beats) -> Eb (4 beats) -> F (4 beats)
    let note = 98.00; // G2 default
    const section = Math.floor(beatNum / 4); // chord sections

    if (beatNum < 8) {
      // Gm (G or D frequency)
      const pattern = [98.00, 146.83, 116.54, 146.83];
      note = pattern[beatNum % 4];
    } else if (beatNum < 12) {
      // Eb Maj (Eb or Bb)
      const pattern = [77.78, 116.54, 98.00, 116.54];
      note = pattern[beatNum % 4];
    } else {
      // F Maj (F or C)
      const pattern = [87.31, 130.81, 104.65, 130.81];
      note = pattern[beatNum % 4];
    }

    osc.frequency.setValueAtTime(note, time);

    // Create low pass filter for that warm retro bass roll
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    osc.start(time);
    osc.stop(time + 0.19);
  }
}

export const audio = new AudioEngine();
