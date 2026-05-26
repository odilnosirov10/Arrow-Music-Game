/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { audio } from './AudioEngine';
import { ScoreRecord, ArrowDirection } from '../types';
import { saveMemoryScore } from '../utils/scoreStore';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Brain, Scale, RotateCcw, Award, ArrowLeft, ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';

interface MemoryStepProps {
  onGameEnd: () => void;
  userName: string;
}

const DIRS: ArrowDirection[] = ['left', 'down', 'up', 'right'];

// Frequency mappings for Simon Tone pitch feedback
const FREQ_MAP = {
  left: 261.63,  // C4
  down: 293.66,  // D4
  up: 329.63,    // E4
  right: 349.23  // F4
};

export default function MemoryStep({ onGameEnd, userName }: MemoryStepProps) {
  const [gameState, setGameState] = useState<'idle' | 'playback' | 'playerInput' | 'failed'>('idle');
  const [sequence, setSequence] = useState<ArrowDirection[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(1);
  const [activeCell, setActiveCell] = useState<ArrowDirection | null>(null);
  
  // High scores tracking local score
  const [score, setScore] = useState(0);

  // References to keep event handlers and tickers synced without state closure lag
  const stateRef = useRef({
    gameState: 'idle',
    sequence: [] as ArrowDirection[],
    playerIndex: 0,
    level: 1
  });

  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.sequence = sequence;
    stateRef.current.playerIndex = playerIndex;
    stateRef.current.level = level;
  }, [gameState, sequence, playerIndex, level]);

  const startMemoryGame = () => {
    audio.resume();
    audio.playMenuClick();
    
    setLevel(1);
    setScore(0);
    const initialSeq = [randomDirection(), randomDirection(), randomDirection()]; // start with 3 steps
    setSequence(initialSeq);
    setGameState('playback');
  };

  const randomDirection = (): ArrowDirection => {
    return DIRS[Math.floor(Math.random() * DIRS.length)];
  };

  // Playback sequence controller state machine
  useEffect(() => {
    if (gameState !== 'playback' || sequence.length === 0) return;

    let cancelPlayback = false;

    const playSequence = async () => {
      // Small breathing delay before starting playback
      await delay(800);
      if (cancelPlayback) return;

      for (let i = 0; i < sequence.length; i++) {
        if (cancelPlayback) return;
        
        const dir = sequence[i];
        
        // Trigger visual glow & matching Audio synth tone frequency
        setActiveCell(dir);
        audio.playBeep(FREQ_MAP[dir], 0.35, 'triangle');
        
        // Keep active glow for 350ms
        await delay(380);
        if (cancelPlayback) return;
        
        setActiveCell(null);
        
        // Brief silent delay between steps
        await delay(150);
      }

      // Transition to player choice input entry
      if (!cancelPlayback) {
        setPlayerIndex(0);
        setGameState('playerInput');
      }
    };

    playSequence();

    return () => {
      cancelPlayback = true;
      setActiveCell(null);
    };
  }, [sequence, gameState]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Key Event handlers for arrow entries
  const keyMap: { [key: string]: ArrowDirection } = {
    ArrowLeft: 'left',
    a: 'left',
    ArrowDown: 'down',
    s: 'down',
    ArrowUp: 'up',
    w: 'up',
    ArrowRight: 'right',
    d: 'right'
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.gameState !== 'playerInput') return;

      const userDir = keyMap[e.key];
      if (!userDir) return; // ignore non game controls

      e.preventDefault();
      handleDirectionPress(userDir);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, sequence, playerIndex]);

  const handleDirectionPress = (dir: ArrowDirection) => {
    if (gameState !== 'playerInput') return;

    // Trigger feedback instantly
    setActiveCell(dir);
    audio.playBeep(FREQ_MAP[dir], 0.25, 'triangle');
    setTimeout(() => setActiveCell(null), 200);

    const targetDir = sequence[playerIndex];

    if (dir === targetDir) {
      // Correct!
      const nextIndex = playerIndex + 1;
      
      if (nextIndex >= sequence.length) {
        // Entire sequence replicated successfully!
        audio.playVictory();
        
        const nextLvl = level + 1;
        setLevel(nextLvl);
        setScore(curr => curr + level * 150); // level scaling point values

        // Generate next sequence (append one random step to current sequence)
        const nextSeq = [...sequence, randomDirection()];
        
        // Delay before playback
        setGameState('playback');
        setSequence(nextSeq);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      // Failed memory sequence!
      audio.playMiss();
      setGameState('failed');
    }
  };

  const submitScore = () => {
    audio.playMenuClick();
    const record: ScoreRecord = {
      name: userName || 'GUEST',
      score: level - 1, // Store maximum level cleared
      date: new Date().toISOString().split('T')[0]
    };
    saveMemoryScore(record);
    onGameEnd();
  };

  const getArrowIcon = (dir: ArrowDirection, size: number = 32) => {
    switch (dir) {
      case 'left': return <ArrowLeft size={size} />;
      case 'down': return <ArrowDown size={size} />;
      case 'up': return <ArrowUp size={size} />;
      case 'right': return <ArrowRight size={size} />;
    }
  };

  // Class styles for the Simon 2x2 cells
  const getCellStyles = (dir: ArrowDirection) => {
    const isActive = activeCell === dir;
    switch (dir) {
      case 'left':
        return {
          base: 'border-cyan-500 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40',
          active: 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.65)]'
        };
      case 'down':
        return {
          base: 'border-magenta-500 bg-magenta-950/20 text-magenta-400 hover:bg-magenta-950/40',
          active: 'bg-magenta-500 text-slate-950 ring-4 ring-magenta-400/50 shadow-[0_0_25px_rgba(217,70,239,0.65)]'
        };
      case 'up':
        return {
          base: 'border-emerald-500 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40',
          active: 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.65)]'
        };
      case 'right':
        return {
          base: 'border-amber-500 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40',
          active: 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.65)]'
        };
    }
  };

  return (
    <div id="memory-step-page" className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-4 px-2 select-none">
      
      {/* Container */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Memory Icon Background */}
        <div className="absolute top-0 right-0 p-4 opacity-15 text-indigo-500">
          <Brain size={56} className="animate-pulse" />
        </div>

        {/* Header Title */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-sans font-medium text-slate-100 flex items-center gap-2">
            <Brain className="text-indigo-400" size={24} />
            Memory Step Simon
          </h3>
          
          {(gameState === 'playback' || gameState === 'playerInput') && (
            <div className="bg-slate-950 px-4 py-1.5 rounded-full border border-slate-850">
              <span className="font-mono text-xs font-semibold tracking-wider text-slate-300">
                LEVEL PROGRESS: <strong className="text-indigo-400 font-bold">{level}</strong>
              </span>
            </div>
          )}
        </div>

        {gameState === 'idle' && (
          <div className="text-center py-8 px-4 flex flex-col items-center justify-center max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-slate-900 shadow-md">
              <Brain size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-sans font-semibold text-slate-100">Step Pattern Memory</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Replicate the sequence of flashing arrows in order. The system starts with <span className="text-cyan-400 font-semibold">3 steps</span>, and appends 1 more arrow on every successful level clear! Let's see how deep your memory span is.
              </p>
            </div>

            <button
              onClick={startMemoryGame}
              className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-sans font-semibold text-sm py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/10 transition-all cursor-pointer"
            >
              Start Recall Test
            </button>
          </div>
        )}

        {(gameState === 'playback' || gameState === 'playerInput') && (
          <div className="space-y-6 flex flex-col items-center">
            
            {/* Playback Indicator banner */}
            <div className={`text-xs font-mono font-bold uppercase py-2 px-6 rounded-full border tracking-widest ${
              gameState === 'playback'
                ? 'bg-rose-950/40 border-rose-800 text-rose-400 animate-pulse'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
            }`}>
              {gameState === 'playback' ? '📺 WATCH PLAYBACK...' : '👉 PLAYBACK PATTERN!'}
            </div>

            {/* Crucial 2x2 grid representing the arrow buttons */}
            <div className="grid grid-cols-2 gap-4 w-64 h-64 mx-auto mt-2">
              {DIRS.map(dir => {
                const styles = getCellStyles(dir);
                const isActive = activeCell === dir;
                
                return (
                  <button
                    key={dir}
                    onClick={() => {
                      if (gameState === 'playerInput') {
                        handleDirectionPress(dir);
                      }
                    }}
                    disabled={gameState !== 'playerInput'}
                    className={`border border-dashed aspect-square rounded-2xl flex flex-col justify-center items-center transition-all ${
                      isActive ? styles.active : `${styles.base} cursor-pointer`
                    }`}
                  >
                    {getArrowIcon(dir, 40)}
                    <span className="text-[10px] font-mono font-medium uppercase mt-2">{dir}</span>
                  </button>
                );
              })}
            </div>

            {/* Tiny progress count */}
            <div className="text-xs font-mono text-slate-400 text-center pt-2">
              STEPS: <strong className="text-slate-200">{playerIndex} / {sequence.length}</strong>
            </div>

          </div>
        )}

        {gameState === 'failed' && (
          <div className="text-center py-6 px-4 space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-rose-950 border border-rose-800 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Brain size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-sans font-bold text-slate-100">Strikes Broken!</h4>
              <p className="text-xs text-slate-400">
                You input an incorrect direction in the step pattern sequence.
              </p>
            </div>

            {/* Scorecard block card overlay */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3 font-mono text-sm max-w-xs mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">LEVEL CLEARED</span>
                <span className="font-bold text-indigo-400 text-lg">{level - 1} Levels</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SEQUENCE REACHED</span>
                <span className="font-bold text-slate-200">{sequence.length} Steps</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-3">
              <button
                onClick={startMemoryGame}
                className="bg-slate-800 hover:bg-slate-700 hover:text-slate-100 text-slate-200 font-sans font-medium text-xs py-3 px-4 rounded-xl border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw size={14} /> Play Again
              </button>
              <button
                onClick={submitScore}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-sans font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                Submit Score
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
