/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { audio } from './AudioEngine';
import { RhythmNote, GameSettings, HitEffect, ScoreRecord } from '../types';
import { saveRhythmScore } from '../utils/scoreStore';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Volume2, VolumeX, Sparkles, Award, RotateCcw, Flame } from 'lucide-react';

interface RhythmGameProps {
  settings: GameSettings;
  updateSettings: (s: Partial<GameSettings>) => void;
  onGameEnd: () => void;
  userName: string;
}

const COLL_WIDTH = 80;
const CANVAS_WIDTH = COLL_WIDTH * 4 + 40; // 360px
const CANVAS_HEIGHT = 500;
const TARGET_Y = 60; // Receptors near top
const SCROLL_DURATION = 1500; // Time in ms for notes to travel from bottom to target
const JUGDMENT_DUR = 800; // ms to show judgment text

export default function RhythmGame({ settings, updateSettings, onGameEnd, userName }: RhythmGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'completed'>('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitStats, setHitStats] = useState({ perfect: 0, great: 0, good: 0, miss: 0 });
  const [health, setHealth] = useState(100); // 0 to 100
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  
  // Scoring judgment display text
  const [lastJudgment, setLastJudgment] = useState<{ text: string; color: string; id: number } | null>(null);

  // Keep references to values used in game loops to prevent closure stale states
  const stateRef = useRef({
    gameState: 'idle',
    notes: [] as RhythmNote[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    health: 100,
    hitStats: { perfect: 0, great: 0, good: 0, miss: 0 },
    lastSpawnTime: 0,
    activeKeys: {} as { [key: string]: boolean },
    effects: [] as HitEffect[]
  });

  // Track key maps
  const keyMap: { [key: string]: 'left' | 'down' | 'up' | 'right' } = {
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowDown: 'down',
    s: 'down',
    S: 'down',
    ArrowUp: 'up',
    w: 'up',
    W: 'up',
    ArrowRight: 'right',
    d: 'right',
    D: 'right'
  };

  // Synchronise stateRef with React states
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.score = score;
    stateRef.current.combo = combo;
    stateRef.current.maxCombo = maxCombo;
    stateRef.current.health = health;
    stateRef.current.hitStats = hitStats;
  }, [gameState, score, combo, maxCombo, health, hitStats]);

  // Keep activeKeys synced
  useEffect(() => {
    stateRef.current.activeKeys = activeKeys;
  }, [activeKeys]);

  // Start the game loop
  const startGame = () => {
    audio.resume();
    audio.playMenuClick();
    
    // Clear state
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHealth(100);
    setHitStats({ perfect: 0, great: 0, good: 0, miss: 0 });
    setLastJudgment(null);
    
    stateRef.current.notes = [];
    stateRef.current.score = 0;
    stateRef.current.combo = 0;
    stateRef.current.maxCombo = 0;
    stateRef.current.health = 100;
    stateRef.current.hitStats = { perfect: 0, great: 0, good: 0, miss: 0 };
    stateRef.current.effects = [];
    
    setGameState('playing');

    // Spawn mechanism:
    // If synthBeatEnabled, use audio context ticker else use custom local time ticker
    if (settings.synthBeatEnabled) {
      audio.startRhythmBeat(settings.bpm, (beatNum) => {
        if (stateRef.current.gameState === 'playing') {
          handleBeatTick(beatNum);
        }
      });
    } else {
      // Manual tick timer for note spawning
      const stepMs = (60000 / settings.bpm) / 2; // 8th note interval
      const timerId = setInterval(() => {
        if (stateRef.current.gameState === 'playing') {
          // Pass a mock auto increment beatNum
          const beatVal = Math.floor(Date.now() / stepMs) % 16;
          handleBeatTick(beatVal);
        } else {
          clearInterval(timerId);
        }
      }, stepMs);
    }
  };

  const stopGame = () => {
    audio.stopRhythmBeat();
    audio.playComboBreaker();
    setGameState('idle');
  };

  // Notes scheduler based on BPM beats
  const handleBeatTick = (beatNum: number) => {
    // Generate patterns depending on difficulty
    const diff = settings.difficulty;
    let spawnArrows: ('left' | 'down' | 'up' | 'right')[] = [];

    const dirs: ('left' | 'down' | 'up' | 'right')[] = ['left', 'down', 'up', 'right'];

    if (diff === 'easy') {
      // Spawn notes on quarter-beats mostly (0, 4, 8, 12 in 16-step grid)
      if (beatNum % 4 === 0 && Math.random() < 0.85) {
        spawnArrows.push(dirs[Math.floor(Math.random() * 4)]);
      }
    } else if (diff === 'medium') {
      // Eighth notes
      if (beatNum % 2 === 0) {
        // High chance of notes
        if (Math.random() < 0.6) {
          spawnArrows.push(dirs[Math.floor(Math.random() * 4)]);
        }
        // Jump arrows (double columns) on strong beats
        if (beatNum % 4 === 0 && Math.random() < 0.15) {
          const secondDir = dirs.filter(d => d !== spawnArrows[0])[Math.floor(Math.random() * 3)];
          spawnArrows.push(secondDir);
        }
      }
    } else {
      // Hard: Double notes, dense syncopation
      if (Math.random() < 0.55) {
        spawnArrows.push(dirs[Math.floor(Math.random() * 4)]);
      }
      if (beatNum % 2 === 0 && Math.random() < 0.28) {
        const secondDir = dirs.filter(d => d !== spawnArrows[0])[Math.floor(Math.random() * 3)];
        spawnArrows.push(secondDir);
      }
    }

    // Push arrows to track list
    if (spawnArrows.length > 0) {
      const now = Date.now();
      const speedCorr = SCROLL_DURATION / settings.speedModifier;
      const newNotes = spawnArrows.map((dir, i) => ({
        id: `${now}-${dir}-${i}-${Math.random()}`,
        dir,
        targetTime: now + speedCorr,
        hit: false,
        missed: false
      }));

      stateRef.current.notes = [...stateRef.current.notes, ...newNotes];
    }
  };

  // Keyboard press processing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.gameState !== 'playing') return;
      
      const dir = keyMap[e.key];
      if (!dir) return;

      // Avoid browser key repeating
      if (activeKeys[e.key]) return;

      setActiveKeys(prev => ({ ...prev, [e.key]: true }));

      // Process hits
      const dirNotes = stateRef.current.notes.filter(n => n.dir === dir && !n.hit && !n.missed);
      if (dirNotes.length === 0) return;

      // Judge the closest note
      const now = Date.now();
      const firstNote = dirNotes[0];
      const diff = Math.abs(now - firstNote.targetTime);

      const speedCorr = SCROLL_DURATION / settings.speedModifier;
      let rating: 'PERFECT' | 'GREAT' | 'GOOD' | null = null;
      let color = '';
      let scoreAdd = 0;

      // Relative timing frames
      if (diff <= 70) {
        rating = 'PERFECT';
        color = 'text-cyan-400 font-extrabold text-2xl shadow-cyan-500/50';
        scoreAdd = 250;
        audio.playPerfect();
      } else if (diff <= 130) {
        rating = 'GREAT';
        color = 'text-emerald-400 font-bold text-xl';
        scoreAdd = 150;
        audio.playHit('GREAT');
      } else if (diff <= 190) {
        rating = 'GOOD';
        color = 'text-yellow-400 text-lg';
        scoreAdd = 80;
        audio.playHit('GOOD');
      }

      if (rating) {
        firstNote.hit = true;
        // Particle effect position
        const collIndex = ['left', 'down', 'up', 'right'].indexOf(dir);
        const xPos = collIndex * COLL_WIDTH + COLL_WIDTH / 2 + 20;
        
        const newEffect: HitEffect = {
          id: Math.random().toString(),
          dir,
          rating,
          x: xPos,
          y: TARGET_Y
        };
        stateRef.current.effects.push(newEffect);

        // Score formulas & Combo counts
        const curCombo = stateRef.current.combo + 1;
        setCombo(curCombo);
        if (curCombo > stateRef.current.maxCombo) {
          setMaxCombo(curCombo);
        }

        // Apply health bump
        setHealth(h => Math.min(100, h + 4));

        const earnedPoints = scoreAdd * (1 + Math.floor(curCombo / 10) * 0.1);
        setScore(curr => Math.floor(curr + earnedPoints));

        setHitStats(prev => ({
          ...prev,
          perfect: rating === 'PERFECT' ? prev.perfect + 1 : prev.perfect,
          great: rating === 'GREAT' ? prev.great + 1 : prev.great,
          good: rating === 'GOOD' ? prev.good + 1 : prev.good
        }));

        setLastJudgment({ text: rating, color, id: Math.random() });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const dir = keyMap[e.key];
      if (dir) {
        setActiveKeys(prev => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeKeys, settings]);

  // Main rendering engine
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = Date.now();
      const speedCorr = SCROLL_DURATION / settings.speedModifier;

      // Miss checker
      stateRef.current.notes.forEach(note => {
        if (!note.hit && !note.missed && now - note.targetTime > 190) {
          note.missed = true;
          // Trigger combo break & health decay
          setCombo(0);
          audio.playComboBreaker();
          setHealth(prev => {
            const nextH = Math.max(0, prev - 12);
            if (nextH === 0 && stateRef.current.gameState === 'playing') {
              setGameState('gameover');
              audio.stopRhythmBeat();
            }
            return nextH;
          });
          setHitStats(prev => ({ ...prev, miss: prev.miss + 1 }));
          setLastJudgment({ text: 'MISS', color: 'text-rose-500 font-bold', id: Math.random() });

          // Spawn miss splash particles
          const collIndex = ['left', 'down', 'up', 'right'].indexOf(note.dir);
          const xPos = collIndex * COLL_WIDTH + COLL_WIDTH / 2 + 20;
          stateRef.current.effects.push({
            id: Math.random().toString(),
            dir: note.dir,
            rating: 'MISS',
            x: xPos,
            y: TARGET_Y
          });
        }
      });

      // Clear offscreen notes
      stateRef.current.notes = stateRef.current.notes.filter(note => {
        // Keeps notes up to 1s past target so they disappear smoothly
        return now - note.targetTime < 500;
      });

      // Clear particles
      stateRef.current.effects = stateRef.current.effects.filter(ef => {
        return now - parseFloat(ef.id.split('-')[0] || '0') < 500; // Keep particles for 500ms
      });

      // Prepare canvas frame
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Columns Grid lines
      ctx.strokeStyle = '#334155 opacity-20';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = i * COLL_WIDTH + 20;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)';
        ctx.stroke();
      }

      // Track highlight on active keys
      const activeDirs = Object.keys(stateRef.current.activeKeys)
        .map(k => keyMap[k])
        .filter(Boolean);

      activeDirs.forEach(dir => {
        const index = ['left', 'down', 'up', 'right'].indexOf(dir);
        const xStart = index * COLL_WIDTH + 20;
        
        const grad = ctx.createLinearGradient(xStart, TARGET_Y, xStart, CANVAS_HEIGHT);
        grad.addColorStop(0, getDirRGBA(dir, 0.25));
        grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(xStart + 1, TARGET_Y, COLL_WIDTH - 2, CANVAS_HEIGHT - TARGET_Y);
      });

      // 2. Draw Target Receptors (Circles at TARGET_Y)
      const directions: ('left' | 'down' | 'up' | 'right')[] = ['left', 'down', 'up', 'right'];
      directions.forEach((dir, index) => {
        const x = index * COLL_WIDTH + COLL_WIDTH / 2 + 20;
        const isActive = activeDirs.includes(dir);

        // Receptor ring outer boundary
        ctx.beginPath();
        ctx.arc(x, TARGET_Y, 26, 0, Math.PI * 2);
        ctx.lineWidth = isActive ? 4 : 2;
        ctx.strokeStyle = isActive ? getDirHex(dir) : '#64748b';
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(x, TARGET_Y, 15, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? getDirRGBA(dir, 0.4) : 'rgba(30, 41, 59, 0.4)';
        ctx.fill();

        // Draw receptor arrow vector symbol
        drawArrowVector(ctx, x, TARGET_Y, dir, isActive ? getDirHex(dir) : '#94a3b8', 12);
      });

      // 3. Draw Moving Notes
      stateRef.current.notes.forEach(note => {
        if (note.hit) return; // do not draw scored notes

        const collIndex = directions.indexOf(note.dir);
        const x = collIndex * COLL_WIDTH + COLL_WIDTH / 2 + 20;

        // Position interpolation:
        // Notes start at bottom (CANVAS_HEIGHT) and travel to TARGET_Y
        // At targetTime, position is TARGET_Y
        const remainingTime = note.targetTime - now;
        const fraction = remainingTime / speedCorr; // 1 at spawn, 0 at target
        
        const y = TARGET_Y + fraction * (CANVAS_HEIGHT - TARGET_Y);

        // Don't draw if completely past screen boundary
        if (y < -30 || y > CANVAS_HEIGHT + 30) return;

        // Draw beautiful arrow bubbles
        const col = getDirHex(note.dir);
        
        // Glow effect
        ctx.shadowBlur = 12;
        ctx.shadowColor = col;

        // Outer filled bubble
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        // White border
        ctx.shadowBlur = 0; // reset glow for border
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Arrow vector inside note bubble
        drawArrowVector(ctx, x, y, note.dir, '#ffffff', 11);
      });

      // 4. Draw Hit Splash Particles
      stateRef.current.effects.forEach(ef => {
        const spawnT = parseFloat(ef.id.split('-')[0] || `${now}`);
        const elapsed = now - spawnT;
        const ratio = Math.min(1, elapsed / 300); // 300ms life

        ctx.shadowBlur = 0;
        
        if (ef.rating === 'MISS') {
          // Red dust falling down
          ctx.fillStyle = `rgba(244, 63, 94, ${1 - ratio})`;
          for (let k = 0; k < 6; k++) {
            const angle = (k / 6) * Math.PI * 2;
            const dist = ratio * 30;
            const px = ef.x + Math.cos(angle) * dist;
            const py = ef.y + Math.sin(angle) * dist + ratio * 20;
            ctx.beginPath();
            ctx.arc(px, py, 4 - ratio * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Dynamic star bust matching rating color
          const baseColor = getDirHex(ef.dir);
          ctx.strokeStyle = getDirRGBA(ef.dir, 1 - ratio);
          ctx.lineWidth = 3 * (1 - ratio);
          
          // Outer ripple radial wave
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, 25 + ratio * 25, 0, Math.PI * 2);
          ctx.stroke();

          // Particle sparks
          ctx.fillStyle = baseColor;
          const sparks = ef.rating === 'PERFECT' ? 10 : 6;
          for (let k = 0; k < sparks; k++) {
            const angle = (k / sparks) * Math.PI * 2;
            const dist = 15 + ratio * 40;
            const px = ef.x + Math.cos(angle) * dist;
            const py = ef.y + Math.sin(angle) * dist;
            
            ctx.beginPath();
            ctx.arc(px, py, 3 * (1 - ratio), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Recurse
      animId = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [settings]);

  // Handle post game submit trigger
  useEffect(() => {
    if (gameState === 'gameover' || health <= 0) {
      setGameState('gameover');
      audio.stopRhythmBeat();
    }
  }, [health, gameState]);

  // Scoring Grade Calculator
  const getGrade = () => {
    const total = hitStats.perfect + hitStats.great + hitStats.good + hitStats.miss;
    if (total === 0) return 'F';
    const hitVal = (hitStats.perfect * 1 + hitStats.great * 0.8 + hitStats.good * 0.4) / total;
    if (hitVal >= 0.95) return 'S';
    if (hitVal >= 0.88) return 'A';
    if (hitVal >= 0.76) return 'B';
    if (hitVal >= 0.60) return 'C';
    return 'D';
  };

  const submitScoreAndFinish = () => {
    audio.playMenuClick();
    const record: ScoreRecord = {
      name: userName || 'GUEST',
      score,
      maxCombo,
      accuracy: Math.round(
        ((hitStats.perfect * 1 + hitStats.great * 0.75 + hitStats.good * 0.4) /
          Math.max(1, hitStats.perfect + hitStats.great + hitStats.good + hitStats.miss)) *
          100
      ),
      date: new Date().toISOString().split('T')[0]
    };
    saveRhythmScore(settings.difficulty, record);
    setGameState('idle');
    onGameEnd();
  };

  return (
    <div id="rhythm-game-screen" className="flex flex-col lg:flex-row items-center gap-6 justify-center w-full max-w-5xl mx-auto py-4 px-2">
      
      {/* 1. Left controls panel */}
      <div className="flex flex-col w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 text-cyan-500 opacity-20">
          <Sparkles size={48} />
        </div>
        
        <h3 className="text-xl font-sans font-medium text-slate-100 tracking-tight flex items-center gap-2 mb-4">
          <Award className="text-cyan-400" size={24} />
          Rhythm Flow
        </h3>

        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Match the rising arrows when they align perfectly inside the target rings. Use your keyboard <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">Arrow Keys</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">W/A/S/D</kbd>.
        </p>

        {/* Score & combo indicators */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-500 font-mono uppercase">Score</div>
            <div className="text-xl font-bold text-slate-100 font-mono tracking-wider">{score}</div>
          </div>
          <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1">
              Combo <Flame size={12} className="text-amber-500 animate-pulse" />
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono tracking-wider flex items-baseline gap-1">
              {combo}
              {combo > 0 && <span className="text-[10px] text-amber-500">x{1 + Math.floor(combo/10)*0.1}</span>}
            </div>
          </div>
        </div>

        {/* Level Stats Breakdown */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 mb-6 text-xs font-mono">
          <div className="flex justify-between items-center text-cyan-400">
            <span>PERFECT</span>
            <span className="font-bold">{hitStats.perfect}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>GREAT</span>
            <span className="font-bold">{hitStats.great}</span>
          </div>
          <div className="flex justify-between items-center text-yellow-400">
            <span>GOOD</span>
            <span className="font-bold">{hitStats.good}</span>
          </div>
          <div className="flex justify-between items-center text-rose-500">
            <span>MISS</span>
            <span className="font-bold">{hitStats.miss}</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-slate-400 text-[10px]">
            <span>MAX COMBO</span>
            <span className="font-bold text-slate-200">{maxCombo}</span>
          </div>
        </div>

        {/* Dashboard Actions */}
        <div className="space-y-3 mt-auto">
          {gameState === 'idle' && (
            <button
              onClick={startGame}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-sans font-medium text-sm py-3 px-4 rounded-xl shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play size={16} fill="white" />
              Start Game
            </button>
          )}

          {gameState === 'playing' && (
            <button
              onClick={stopGame}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-medium text-sm py-3 px-4 rounded-xl border border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Square size={16} fill="white" />
              Stop Playing
            </button>
          )}

          {/* Volume Settings Toggle */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                audio.playMenuClick();
                updateSettings({ sfxEnabled: !settings.sfxEnabled });
                audio.setMute(!settings.sfxEnabled);
              }}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850 hover:text-slate-100 transition-colors"
              title="Toggle Audio"
            >
              {settings.sfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Beat BPM ({settings.bpm})</span>
              <input
                type="range"
                min="80"
                max="170"
                value={settings.bpm}
                onChange={(e) => {
                  const newBpm = parseInt(e.target.value);
                  updateSettings({ bpm: newBpm });
                  if (gameState === 'playing') {
                    // Restart sequencer with new BPM tempo safely
                    audio.startRhythmBeat(newBpm, handleBeatTick);
                  }
                }}
                className="w-full accent-cyan-500 h-1 rounded-lg cursor-pointer bg-slate-950"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Canvas View (Visual Screen Area) */}
      <div className="flex flex-col items-center bg-slate-950 border border-slate-850 rounded-2xl p-4 shadow-2xl relative overflow-hidden" style={{ width: CANVAS_WIDTH + 32 }}>
        
        {/* Top Header - Healthbar / Hype tracker */}
        <div className="w-full flex items-center gap-3 mb-3">
          <div className="text-[10px] font-mono font-medium text-rose-500 flex items-center gap-1 uppercase">
            <span>Life</span>
          </div>
          <div className="flex-1 bg-slate-900 rounded-full h-2.5 border border-slate-850 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                health > 50 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-cyan-400/20' : health > 20 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
              }`}
              style={{ width: `${health}%` }}
            />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-400 w-8 text-right">{health}%</span>
        </div>

        {/* Canvas Element drawing columns & notes */}
        <div className="relative border border-slate-800/60 rounded-xl bg-slate-900 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block"
          />

          {/* Floating Floating Judgment Text */}
          <div className="absolute top-[160px] left-0 right-0 pointer-events-none flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {lastJudgment && (
                <motion.div
                  key={lastJudgment.id}
                  initial={{ opacity: 0, scale: 0.6, y: 15 }}
                  animate={{ opacity: 1, scale: 1.1, y: 0 }}
                  exit={{ opacity: 0, y: -25, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`font-mono tracking-widest text-shadow ${lastJudgment.color}`}
                >
                  {lastJudgment.text}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Combo Count Pulse overlay */}
            {combo >= 5 && (
              <motion.div
                key={`combo-${combo}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.15 }}
                className="text-xs font-mono font-semibold text-slate-400 uppercase mt-1 tracking-wider flex items-center gap-1"
              >
                {combo} <span className="text-rose-400 font-extrabold text-[10px]">🔥 COMBO</span>
              </motion.div>
            )}
          </div>

          {/* Absolute Dark overlay for game-states */}
          {gameState !== 'playing' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              {gameState === 'idle' && (
                <div className="space-y-4 max-w-xs">
                  <div className="bg-slate-900 border border-slate-800 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-cyan-400 shadow-md">
                    <Sparkles size={28} />
                  </div>
                  <h4 className="text-lg font-sans font-medium text-slate-100">Ready to Flow?</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Set your difficulty and hit Start! The game will synthesize interactive beats for you.
                  </p>
                  <button
                    onClick={startGame}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-semibold text-sm py-2.5 px-6 rounded-xl transition-colors cursor-pointer"
                  >
                    Launch Song Play
                  </button>
                </div>
              )}

              {gameState === 'gameover' && (
                <div className="space-y-4 max-w-xs">
                  <div className="bg-rose-950/40 border border-rose-800/40 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-rose-500">
                    <VolumeX size={28} />
                  </div>
                  <h4 className="text-lg font-sans font-bold text-slate-100">Song Failed!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">
                    Score reached: {score}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={startGame}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-sans font-medium text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onGameEnd}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-sans font-medium text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer"
                    >
                      Exit View
                    </button>
                  </div>
                </div>
              )}

              {gameState === 'completed' && (
                <div className="space-y-4 max-w-xs">
                  <div className="bg-emerald-950/40 border border-emerald-800/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                    <Award size={28} />
                  </div>
                  <h4 className="text-lg font-sans font-bold text-slate-100">Cleared!</h4>
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-850 space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Score</span>
                      <span className="font-bold text-slate-200">{score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Acc Grade</span>
                      <span className="font-bold text-emerald-400 text-sm">{getGrade()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Combo</span>
                      <span className="font-bold text-amber-500">{maxCombo}</span>
                    </div>
                  </div>
                  <button
                    onClick={submitScoreAndFinish}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-semibold text-xs py-2.5 px-6 rounded-xl transition-colors cursor-pointer"
                  >
                    Submit Score & Return
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating game complete trigger controls */}
        {gameState === 'playing' && (
          <div className="w-full flex justify-between items-center mt-3">
            <button
              onClick={() => {
                audio.playVictory();
                audio.stopRhythmBeat();
                setGameState('completed');
              }}
              className="text-[10px] text-emerald-400 hover:underline hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-850"
            >
              🏁 Stop & Complete Track
            </button>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Level: {settings.difficulty.toUpperCase()}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}

// DIRECTION DECORATOR HELPER FUNCTIONS
function getDirHex(dir: 'left' | 'down' | 'up' | 'right'): string {
  switch (dir) {
    case 'left': return '#06b6d4';   // Cyan
    case 'down': return '#d946ef';   // Magenta
    case 'up': return '#10b981';     // Emerald
    case 'right': return '#f59e0b';  // Gold/Orange
  }
}

function getDirRGBA(dir: 'left' | 'down' | 'up' | 'right', opacity: number): string {
  switch (dir) {
    case 'left': return `rgba(6, 182, 212, ${opacity})`;
    case 'down': return `rgba(217, 70, 239, ${opacity})`;
    case 'up': return `rgba(16, 185, 129, ${opacity})`;
    case 'right': return `rgba(245, 158, 11, ${opacity})`;
  }
}

// Helper to draw clean vector arrows inside bubbles using canvas primitives
function drawArrowVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: 'left' | 'down' | 'up' | 'right',
  color: string,
  size: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Rotate based on index
  let angle = 0;
  if (dir === 'left') angle = -Math.PI / 2;
  if (dir === 'down') angle = Math.PI;
  if (dir === 'up') angle = 0;
  if (dir === 'right') angle = Math.PI / 2;

  ctx.rotate(angle);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Drawing arrow pointing upward at (0,0) center
  // Arrow head
  ctx.moveTo(0, -size);
  ctx.lineTo(-size * 0.8, -size * 0.1);
  ctx.lineTo(-size * 0.3, -size * 0.1);
  // Arrow shaft
  ctx.lineTo(-size * 0.3, size * 0.82);
  ctx.lineTo(size * 0.3, size * 0.82);
  ctx.lineTo(size * 0.3, -size * 0.1);
  ctx.lineTo(size * 0.8, -size * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
