/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { audio } from './AudioEngine';
import { ScoreRecord } from '../types';
import { saveSpeedRushScore } from '../utils/scoreStore';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Zap, RotateCcw, Award, ShieldAlert, ArrowLeft, ArrowDown, ArrowUp, ArrowRight, Hourglass } from 'lucide-react';

interface SpeedRushProps {
  onGameEnd: () => void;
  userName: string;
}

type Direction = 'left' | 'down' | 'up' | 'right';
const DIRS: Direction[] = ['left', 'down', 'up', 'right'];

export default function SpeedRush({ onGameEnd, userName }: SpeedRushProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'completed'>('idle');
  
  // Game metrics
  const [sequence, setSequence] = useState<Direction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30.0); // decimal seconds
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [hasErrorFlashing, setHasErrorFlashing] = useState(false);
  
  // Ref to prevent stale states in timing loops
  const stateRef = useRef({
    gameState: 'idle',
    timeLeft: 30.0,
    sequence: [] as Direction[],
    currentIndex: 0,
    score: 0
  });

  // Sync state reference
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.timeLeft = timeLeft;
    stateRef.current.sequence = sequence;
    stateRef.current.currentIndex = currentIndex;
    stateRef.current.score = score;
  }, [gameState, timeLeft, sequence, currentIndex, score]);

  // Handle keystroke matching
  const keyMap: { [key: string]: Direction } = {
    ArrowLeft: 'left',
    a: 'left',
    ArrowDown: 'down',
    s: 'down',
    ArrowUp: 'up',
    w: 'up',
    ArrowRight: 'right',
    d: 'right'
  };

  const generateSequence = (length: number): Direction[] => {
    const arr: Direction[] = [];
    for (let i = 0; i < length; i++) {
      arr.push(DIRS[Math.floor(Math.random() * 4)]);
    }
    return arr;
  };

  const startRush = () => {
    audio.resume();
    audio.playMenuClick();
    
    setScore(0);
    setTimeLeft(32.0);
    setStreak(0);
    setMaxStreak(0);
    setStats({ correct: 0, wrong: 0 });
    setCurrentIndex(0);
    setHasErrorFlashing(false);
    
    const seqLength = 6; // start with 6 arrows
    const firstSeq = generateSequence(seqLength);
    setSequence(firstSeq);
    setGameState('playing');
  };

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const nextTime = Math.max(0, prev - 0.1);
        if (nextTime <= 0) {
          clearInterval(interval);
          setGameState('completed');
          audio.playVictory();
          return 0;
        }
        return parseFloat(nextTime.toFixed(1));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  // Keys event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.gameState !== 'playing') return;

      const userDir = keyMap[e.key];
      if (!userDir) return; // ignore other keys

      e.preventDefault();

      const targetDir = stateRef.current.sequence[stateRef.current.currentIndex];
      
      if (userDir === targetDir) {
        // Correct press!
        audio.playBeep(350 + stateRef.current.currentIndex * 50, 0.08, 'sine');
        
        setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        setStreak(prev => {
          const nextS = prev + 1;
          if (nextS > maxStreak) setMaxStreak(nextS);
          return nextS;
        });

        const nextIndex = stateRef.current.currentIndex + 1;
        if (nextIndex >= stateRef.current.sequence.length) {
          // Cleared entire sequence!
          audio.playPerfect();
          
          setScore(curr => curr + 100 + stateRef.current.sequence.length * 15);
          setTimeLeft(t => Math.min(45, t + 2.5)); // reward time bonus!
          
          // Generate new sequence (add +1 arrow length every 3 clears to scale difficulty)
          const newLength = 5 + Math.floor(stateRef.current.score / 600);
          setSequence(generateSequence(Math.min(10, newLength)));
          setCurrentIndex(0);
        } else {
          setCurrentIndex(nextIndex);
        }
      } else {
        // Wrong press penalty!
        audio.playMiss();
        setHasErrorFlashing(true);
        setTimeout(() => setHasErrorFlashing(false), 150);

        setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
        setStreak(0);

        // Subtract time barrier
        setTimeLeft(t => Math.max(0, t - 1.2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sequence, currentIndex, gameState]);

  const submitScore = () => {
    audio.playMenuClick();
    const finalAccuracy = Math.max(0, Math.round((stats.correct / (stats.correct + stats.wrong || 1)) * 100));
    const record: ScoreRecord = {
      name: userName || 'GUEST',
      score,
      maxCombo: maxStreak,
      accuracy: finalAccuracy,
      date: new Date().toISOString().split('T')[0]
    };
    saveSpeedRushScore(record);
    onGameEnd();
  };

  const getArrowIcon = (dir: Direction, colorClass: string = 'text-slate-400') => {
    const props = { className: `${colorClass} transition-transform` };
    switch (dir) {
      case 'left': return <ArrowLeft {...props} size={32} />;
      case 'down': return <ArrowDown {...props} size={32} />;
      case 'up': return <ArrowUp {...props} size={32} />;
      case 'right': return <ArrowRight {...props} size={32} />;
    }
  };

  const getArrowLabelStyle = (dir: Direction) => {
    switch (dir) {
      case 'left': return 'border-cyan-500 hover:bg-cyan-500/10 text-cyan-400';
      case 'down': return 'border-magenta-500 hover:bg-magenta-500/10 text-magenta-400';
      case 'up': return 'border-emerald-500 hover:bg-emerald-500/10 text-emerald-400';
      case 'right': return 'border-amber-500 hover:bg-amber-500/10 text-amber-400';
    }
  };

  const getArrowLabelStyleBackground = (dir: Direction) => {
    switch (dir) {
      case 'left': return 'bg-cyan-500 shadow-cyan-500/40 text-slate-950';
      case 'down': return 'bg-magenta-500 shadow-magenta-500/40 text-slate-950';
      case 'up': return 'bg-emerald-500 shadow-emerald-500/40 text-slate-950';
      case 'right': return 'bg-amber-500 shadow-amber-500/40 text-slate-950';
    }
  };

  // Keys input speed metric
  const getKeysPerSecond = () => {
    const totalDuration = 32.0;
    const items = stats.correct;
    if (items === 0) return 0;
    return (items / totalDuration).toFixed(2);
  };

  return (
    <div id="speed-rush-page" className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-4 px-2 select-none">
      
      {/* Screen container */}
      <div className={`w-full max-w-2xl bg-slate-900 border ${hasErrorFlashing ? 'border-rose-600/60 shadow-lg shadow-rose-900/10' : 'border-slate-800'} rounded-3xl p-6 lg:p-8 transition-colors duration-150 shadow-2xl relative overflow-hidden`}>
        
        {/* Decorative corner indicator */}
        <div className="absolute top-0 right-0 p-4 opacity-15 text-amber-500">
          <Zap size={54} className="animate-pulse" />
        </div>

        {/* Dashboard Title */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-sans font-medium text-slate-100 flex items-center gap-2">
            <Zap className="text-amber-400 fill-amber-450" size={24} />
            Rush Hour Reaction
          </h3>
          
          {gameState === 'playing' && (
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-850">
              <Hourglass size={14} className="text-amber-500 animate-spin" />
              <span className={`font-mono text-sm font-semibold tracking-wider ${timeLeft <= 5 ? 'text-rose-500 text-base font-bold' : 'text-slate-300'}`}>
                {timeLeft}s
              </span>
            </div>
          )}
        </div>

        {gameState === 'idle' && (
          <div className="text-center py-8 px-4 flex flex-col items-center justify-center max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/10">
              <Zap size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-sans font-semibold text-slate-100">Speed Sequence Typing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Type the corresponding arrow keys as fast as humanly possible! Each correct sequence adds a <span className="text-emerald-400 font-semibold">+2.5s time extension</span> to keep playing. An incorrect key instantly loses <span className="text-rose-400 font-semibold">-1.2s</span>.
              </p>
            </div>

            <button
              onClick={startRush}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-sans font-semibold text-sm py-3 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
            >
              Start Typing Sprint
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-8 py-4">
            
            {/* 1. Scrolling Active Sequence Bubble Line */}
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-950 rounded-2xl border border-slate-850 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-indigo-500 opacity-60" />
              
              <div className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-widest mb-4">
                Active Queue
              </div>

              {/* Arrow Line queue */}
              <div className="flex items-center gap-3 relative md:gap-4 h-16 justify-center">
                {sequence.map((dir, idx) => {
                  const isActive = idx === currentIndex;
                  const isCleared = idx < currentIndex;
                  
                  return (
                    <motion.div
                      key={idx}
                      animate={{
                        scale: isActive ? 1.2 : 1,
                        y: isActive ? -4 : 0,
                        opacity: isCleared ? 0.35 : 1
                      }}
                      className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all ${
                        isCleared
                          ? 'border-emerald-600 bg-emerald-950/20 text-emerald-400'
                          : isActive
                          ? 'border-amber-400 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {getArrowIcon(
                        dir,
                        isCleared ? 'text-emerald-400' : isActive ? getDirectionTextColor(dir) : 'text-slate-400'
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress counter indicators */}
              <div className="text-xs font-mono text-slate-400 mt-6 flex gap-4">
                <span>PROGRESS: <strong>{currentIndex}/{sequence.length}</strong></span>
                <span>COMBO: <strong className="text-amber-400">{streak}</strong></span>
              </div>
            </div>

            {/* 2. Soft Tactile On-screen keyboard for mobile indicators */}
            <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto pt-2">
              {DIRS.map((dir, idx) => {
                const targetDir = sequence[currentIndex];
                const isMatchingNext = targetDir === dir;
                
                return (
                  <div
                    key={dir}
                    className={`border border-dashed h-16 rounded-xl flex flex-col justify-center items-center font-mono ${
                      isMatchingNext ? getArrowLabelStyle(dir) : 'border-slate-800 text-slate-600'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold">{dir}</span>
                    <span className="text-[9px] opacity-60">
                      {dir === 'left' ? 'A / ◄' : dir === 'down' ? 'S / ▼' : dir === 'up' ? 'W / ▲' : 'D / ►'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stats tracking footbar */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-center text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">SCORE</span>
                <span className="font-bold text-slate-300">{score}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Accuracy</span>
                <span className="font-bold text-slate-300">
                  {Math.max(0, Math.round((stats.correct / (stats.correct + stats.wrong || 1)) * 100))}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Streak Limit</span>
                <span className="font-bold text-amber-500">{maxStreak}</span>
              </div>
            </div>

          </div>
        )}

        {gameState === 'completed' && (
          <div className="text-center py-6 px-4 space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-950 border border-emerald-800 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-md">
              <Award size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-sans font-bold text-slate-100">Sprint Cleared!</h4>
              <p className="text-xs text-slate-400">
                You performed with fantastic reaction times. Here are your final stats:
              </p>
            </div>

            {/* Scoreboard block card overlay */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3 font-mono text-sm max-w-sm mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">FINAL SCORE</span>
                <span className="font-bold text-slate-200">{score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ACCURACY</span>
                <span className="font-extrabold text-emerald-400">
                  {Math.max(0, Math.round((stats.correct / (stats.correct + stats.wrong || 1)) * 100))}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">INPUTS PER SEC</span>
                <span className="font-bold text-slate-200">{getKeysPerSecond()} / s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MAX COMBO STREAK</span>
                <span className="font-bold text-amber-400">{maxStreak}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-3">
              <button
                onClick={startRush}
                className="bg-slate-800 hover:bg-slate-700 hover:text-slate-100 text-slate-200 font-sans font-medium text-xs py-3 px-4 rounded-xl border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw size={14} /> Play Again
              </button>
              <button
                onClick={submitScore}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
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

// Directional styling mapping
function getDirectionTextColor(dir: 'left' | 'down' | 'up' | 'right'): string {
  switch (dir) {
    case 'left': return 'text-cyan-400';
    case 'down': return 'text-magenta-400';
    case 'up': return 'text-emerald-400';
    case 'right': return 'text-amber-400';
  }
}
export { getDirectionTextColor };
