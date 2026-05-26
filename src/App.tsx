/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameSettings, HighScores } from './types';
import RhythmGame from './components/RhythmGame';
import SpeedRush from './components/SpeedRush';
import MemoryStep from './components/MemoryStep';
import Leaderboard from './components/Leaderboard';
import { audio } from './components/AudioEngine';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Zap, 
  Brain, 
  Award, 
  Settings as SettingsIcon, 
  User, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Gamepad2, 
  ShieldAlert,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Play
} from 'lucide-react';

const STORAGE_NAME_KEY = 'arrow_game_username_v1';

const defaultSettings: GameSettings = {
  volume: 0.5,
  sfxEnabled: true,
  synthBeatEnabled: true,
  bpm: 115,
  speedModifier: 1.15,
  difficulty: 'medium'
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'menu' | 'rhythm' | 'speedRush' | 'memoryStep' | 'leaderboard'>('menu');
  const [userName, setUserName] = useState('PLAYER1');
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Load saved configurations on mount
  useEffect(() => {
    // Read cached username
    const cachedName = localStorage.getItem(STORAGE_NAME_KEY);
    if (cachedName) {
      setUserName(cachedName);
    } else {
      const gNames = ['BLASTER', 'RETRO_RUN', 'KEY_STRIKE', 'TEMPO_WAVE', 'GRID_CORE', 'CYBER_STEP'];
      const randomGuest = gNames[Math.floor(Math.random() * gNames.length)];
      setUserName(randomGuest);
    }

    // Audio volume sync
    audio.setVolume(settings.volume);
    audio.setMute(!settings.sfxEnabled);
  }, []);

  const handleUsernameChange = (newName: string) => {
    const formatted = newName.trim().toUpperCase().slice(0, 11).replace(/[^A-Z0-9_]/gi, '');
    setUserName(formatted);
    localStorage.setItem(STORAGE_NAME_KEY, formatted);
  };

  const updateSettings = (updated: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updated };
      if (updated.volume !== undefined) audio.setVolume(updated.volume);
      if (updated.sfxEnabled !== undefined) audio.setMute(!updated.sfxEnabled);
      return next;
    });
  };

  const enterGame = (screen: 'rhythm' | 'speedRush' | 'memoryStep' | 'leaderboard') => {
    audio.playMenuClick();
    setActiveScreen(screen);
  };

  const exitToMenu = () => {
    audio.playMenuClick();
    setActiveScreen('menu');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all selection:bg-cyan-500/35 pb-10">
      
      {/* 1. Header Navigation Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Visual Logo design featuring overlapping arrows */}
            <div className="relative w-9 h-9 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
              <span className="text-xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 font-mono">
                ↕
              </span>
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10" />
            </div>

            <div>
              <span className="font-sans font-medium text-sm text-slate-100 tracking-tight block">
                Arrow Game
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                Tactile Arcade Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Displaying volume directly */}
            <button
              onClick={() => {
                audio.playMenuClick();
                updateSettings({ sfxEnabled: !settings.sfxEnabled });
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              title="Toggle Audio Synth"
            >
              {settings.sfxEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            
            <button
              onClick={() => { audio.playMenuClick(); setIsHelpOpen(!isHelpOpen); }}
              className="text-xs font-mono text-slate-400 hover:text-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle size={14} /> Quick Guide
            </button>
          </div>
        </div>
      </header>

      {/* 2. Primary Layout Contents */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col items-center">
        
        <AnimatePresence mode="wait">
          {activeScreen === 'menu' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col items-center gap-10"
            >
              
              {/* Profile Config Header row */}
              <div className="w-full max-w-4xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-950/45 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                    <User size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Player Callsign</span>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="ENTER CALLSIGN"
                      className="bg-transparent text-sm font-bold text-slate-100 border-b border-transparent focus:border-cyan-500 focus:outline-none uppercase font-mono tracking-wider pt-0.5"
                      title="Click to rename"
                    />
                  </div>
                </div>

                {/* Settings adjusters */}
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Difficulty ({settings.difficulty})</span>
                    <div className="flex gap-1 mt-1">
                      {['easy', 'medium', 'hard'].map(d => (
                        <button
                          key={d}
                          onClick={() => { audio.playMenuClick(); updateSettings({ difficulty: d as any }); }}
                          className={`text-[9px] uppercase font-mono px-3 py-1 rounded-md border transition-all cursor-pointer ${
                            settings.difficulty === d
                              ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold'
                              : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-[1px] h-8 bg-slate-850 hidden md:block" />

                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">BPM Speed Mod ({settings.speedModifier}x)</span>
                    <div className="flex gap-1 mt-1">
                      {[1.0, 1.25, 1.5].map(mult => (
                        <button
                          key={mult}
                          onClick={() => { audio.playMenuClick(); updateSettings({ speedModifier: mult }); }}
                          className={`text-[9px] font-mono px-3 py-1 rounded-md border transition-all cursor-pointer ${
                            settings.speedModifier === mult
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                              : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {mult}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Introduction Hero Card */}
              <div className="text-center space-y-3 max-w-xl mx-auto py-4">
                <span className="text-xs font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-widest block">
                  Interactive Rhythmic Arrow Game
                </span>
                
                <h2 className="text-3xl font-sans font-medium text-slate-100 tracking-tight leading-none md:text-4xl">
                  Step Into the Soundwave Grid
                </h2>
                
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  A multi-mode tactile experience centering on timing, fast muscle reflexes, and sensory step recollection. Play synthesized drums and synthwave background patterns.
                </p>
              </div>

              {/* Game Modes Cards Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-2">
                
                {/* 1. Rhythm Flow Mode Card */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col h-[320px] relative overflow-hidden group shadow-lg hover:border-cyan-500/30 transition-all">
                  <div className="absolute top-0 right-0 p-4 text-cyan-500 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Flame size={48} className="animate-pulse" />
                  </div>
                  
                  <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-widest">DDR Rhythm</span>
                  <h4 className="text-lg font-sans font-semibold text-slate-100 tracking-tight mt-2 mb-3">Rhythm Flow</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Classic arcade mechanics. Match rising arrows with precise timing on synthesized music tempos (BPM tracks). Supports 16th streams.
                  </p>
                  
                  <button
                    onClick={() => enterGame('rhythm')}
                    className="mt-auto w-full bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-xs font-mono font-semibold py-3 px-4 rounded-xl border border-cyan-500/20 hover:border-transparent flex items-center justify-between transition-all cursor-pointer"
                  >
                    Launch Song Track
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* 2. Speed Rush Mode Card */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col h-[320px] relative overflow-hidden group shadow-lg hover:border-amber-500/30 transition-all">
                  <div className="absolute top-0 right-0 p-4 text-amber-500 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Zap size={48} className="animate-pulse" />
                  </div>
                  
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-widest">Reaction Trainer</span>
                  <h4 className="text-lg font-sans font-semibold text-slate-100 tracking-tight mt-2 mb-3">Speed Rush</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    A quick rapid-fire typing trial. Type strings of arrows accurately to receive bonus seconds and build massive combo multipliers!
                  </p>
                  
                  <button
                    onClick={() => enterGame('speedRush')}
                    className="mt-auto w-full bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-xs font-mono font-semibold py-3 px-4 rounded-xl border border-amber-500/20 hover:border-transparent flex items-center justify-between transition-all cursor-pointer"
                  >
                    Start Key Trial
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* 3. Memory Step Mode Card */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col h-[320px] relative overflow-hidden group shadow-lg hover:border-indigo-500/30 transition-all">
                  <div className="absolute top-0 right-0 p-4 text-indigo-500 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Brain size={48} className="animate-pulse" />
                  </div>
                  
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 tracking-widest">Simon Memory</span>
                  <h4 className="text-lg font-sans font-semibold text-slate-100 tracking-tight mt-2 mb-3">Memory Step</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    A sensory pitch recall test. Follow flashing keys accompanying unique oscillator tones, then replicate the exact patterns!
                  </p>
                  
                  <button
                    onClick={() => enterGame('memoryStep')}
                    className="mt-auto w-full bg-slate-950 hover:bg-indigo-500 hover:text-white text-indigo-400 text-xs font-mono font-semibold py-3 px-4 rounded-xl border border-indigo-500/20 hover:border-transparent flex items-center justify-between transition-all cursor-pointer"
                  >
                    Launch Simon Test
                    <ChevronRight size={14} />
                  </button>
                </div>

              </div>

              {/* Bottom quick actions Leaderboard Trigger button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => enterGame('leaderboard')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-2xl py-3 px-6 text-xs text-slate-300 font-medium hover:text-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Award className="text-amber-500" size={16} />
                  View High Scores Leaderboard
                </button>
              </div>

            </motion.div>
          )}

          {/* Active Minigame frames */}
          {activeScreen === 'rhythm' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center"
            >
              <div className="mb-4 text-center">
                <button
                  onClick={exitToMenu}
                  className="text-xs text-slate-400 hover:text-slate-100 transition-colors uppercase font-mono border border-slate-850 bg-slate-900/40 py-1.5 px-4 rounded-xl cursor-pointer"
                >
                  ◀ Close Rhythm Song & Back
                </button>
              </div>
              <RhythmGame settings={settings} updateSettings={updateSettings} onGameEnd={exitToMenu} userName={userName} />
            </motion.div>
          )}

          {activeScreen === 'speedRush' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center"
            >
              <div className="mb-4 text-center">
                <button
                  onClick={exitToMenu}
                  className="text-xs text-slate-400 hover:text-slate-100 transition-colors uppercase font-mono border border-slate-850 bg-slate-900/40 py-1.5 px-4 rounded-xl cursor-pointer"
                >
                  ◀ Exit Reaction Sprint
                </button>
              </div>
              <SpeedRush onGameEnd={exitToMenu} userName={userName} />
            </motion.div>
          )}

          {activeScreen === 'memoryStep' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center"
            >
              <div className="mb-4 text-center">
                <button
                  onClick={exitToMenu}
                  className="text-xs text-slate-400 hover:text-slate-100 transition-colors uppercase font-mono border border-slate-850 bg-slate-900/40 py-1.5 px-4 rounded-xl cursor-pointer"
                >
                  ◀ Close Memory Game
                </button>
              </div>
              <MemoryStep onGameEnd={exitToMenu} userName={userName} />
            </motion.div>
          )}

          {activeScreen === 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <Leaderboard onBack={exitToMenu} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Absolute Help Overlay drawer */}
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h4 className="text-base font-sans font-bold text-slate-100 flex items-center gap-1.5">
                <HelpCircle size={18} className="text-cyan-400" />
                Quick Arrow Manual
              </h4>

              <div className="space-y-3 font-mono text-xs text-slate-300 leading-relaxed">
                <div>
                  <strong className="text-cyan-400 uppercase">Input Controls:</strong>
                  <p className="text-slate-400 mt-1">
                    Press <kbd className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800">Arrow Keys</kbd> or PC keys <kbd className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800">W/A/S/D</kbd> corresponding to directional blocks.
                  </p>
                </div>
                <div>
                  <strong className="text-amber-400 uppercase">Audio Synthesis:</strong>
                  <p className="text-slate-400 mt-1">
                    The applet uses modern Web Audio oscillators. We recommend turning sound ON in the top-right toolbar for accurate rhythm queues and memory Simon pitches.
                  </p>
                </div>
                <div>
                  <strong className="text-indigo-400 uppercase">Local Scores:</strong>
                  <p className="text-slate-400 mt-1">
                    Your highest attempts are stored immediately in localStorage. Click on the Leaderboard link in the bottom dashboard to analyze current records.
                  </p>
                </div>
              </div>

              <button
                onClick={() => { audio.playMenuClick(); setIsHelpOpen(false); }}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-850 font-serif font-semibold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Got it, Close Modal
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 4. Elegant Minimalist Footer */}
      <footer className="w-full border-t border-slate-900/50 mt-auto py-6">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
          <p className="text-[10px] text-slate-550 font-mono tracking-widest uppercase">
            Arrow Game • Built for Peak Hand-Eye coordination
          </p>
          <div className="flex justify-center gap-3 text-slate-600 font-mono text-[9px]">
            <span>← CYAN</span>
            <span>↓ MAGENTA</span>
            <span>↑ EMERALD</span>
            <span>→ AMBER</span>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
