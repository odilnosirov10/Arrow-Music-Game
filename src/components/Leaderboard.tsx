/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HighScores, ScoreRecord } from '../types';
import { getHighScores, clearAllHighScores } from '../utils/scoreStore';
import { Award, Trash2, ShieldAlert, Sparkles, Calendar, Zap, Brain, Flame, RotateCcw } from 'lucide-react';
import { audio } from './AudioEngine';

interface LeaderboardProps {
  onBack: () => void;
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [scores, setScores] = useState<HighScores | null>(null);
  const [activeTab, setActiveTab] = useState<'rhythm' | 'speedRush' | 'memoryStep'>('rhythm');
  const [rhythmDifficulty, setRhythmDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  useEffect(() => {
    setScores(getHighScores());
  }, []);

  const handleReset = () => {
    if (confirm('Are you absolutely sure you want to delete all local high scores? This action cannot be undone.')) {
      audio.playComboBreaker();
      clearAllHighScores();
      setScores(getHighScores());
    }
  };

  const getRecordList = (): ScoreRecord[] => {
    if (!scores) return [];
    if (activeTab === 'rhythm') {
      return scores.rhythm[rhythmDifficulty] || [];
    } else if (activeTab === 'speedRush') {
      return scores.speedRush || [];
    } else {
      return scores.memoryStep || [];
    }
  };

  const recordList = getRecordList();

  return (
    <div id="leaderboard-panel" className="w-full max-w-4xl mx-auto py-4 px-2 select-none animate-fadeIn">
      
      {/* Background card structure */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-xl font-sans font-medium text-slate-100 flex items-center gap-2">
              <Award className="text-amber-400" size={24} />
              Arcade Hall of Fame
            </h3>
            <p className="text-xs text-slate-400">
              The ultimate high scores tracked locally in your browser workspace storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-900/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> Reset Leaderboards
            </button>
            <button
              onClick={onBack}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Back To Menu
            </button>
          </div>
        </div>

        {/* Big Game mode selector Tab rail */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-850">
          <button
            onClick={() => { audio.playMenuClick(); setActiveTab('rhythm'); }}
            className={`py-2.5 rounded-xl text-xs font-sans font-medium tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'rhythm'
                ? 'bg-slate-800 text-cyan-400 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame size={14} className={activeTab === 'rhythm' ? 'text-cyan-400' : 'text-slate-500'} />
            Rhythm Flow
          </button>
          <button
            onClick={() => { audio.playMenuClick(); setActiveTab('speedRush'); }}
            className={`py-2.5 rounded-xl text-xs font-sans font-medium tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'speedRush'
                ? 'bg-slate-800 text-amber-400 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={14} className={activeTab === 'speedRush' ? 'text-amber-400' : 'text-slate-500'} />
            Speed Rush
          </button>
          <button
            onClick={() => { audio.playMenuClick(); setActiveTab('memoryStep'); }}
            className={`py-2.5 rounded-xl text-xs font-sans font-medium tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'memoryStep'
                ? 'bg-slate-800 text-indigo-400 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain size={14} className={activeTab === 'memoryStep' ? 'text-indigo-400' : 'text-slate-500'} />
            Memory Simon
          </button>
        </div>

        {/* If Rhythm, expose Difficulty toggle button group */}
        {activeTab === 'rhythm' && (
          <div className="flex justify-center items-center gap-1 pt-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider mr-2">Difficulty:</span>
            {['easy', 'medium', 'hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => { audio.playMenuClick(); setRhythmDifficulty(diff as any); }}
                className={`text-[10px] uppercase font-mono px-3 py-1 rounded-full border transition-all cursor-pointer ${
                  rhythmDifficulty === diff
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-400 font-semibold'
                    : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        )}

        {/* Scores List table render */}
        <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden">
          {recordList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center gap-3">
              <Award size={32} className="text-slate-600 animate-pulse" />
              <span>No entries found yet. Submit a score to claim the podium!</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-widest text-[10px] bg-slate-900/50">
                    <th className="py-3 px-5 text-center w-14">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-right">Score</th>
                    <th className="py-3 px-4 text-center">
                      {activeTab === 'memoryStep' ? 'Max Level' : 'Accuracy'}
                    </th>
                    {activeTab === 'rhythm' && <th className="py-3 px-4 text-center">Max Combo</th>}
                    <th className="py-3 px-5 text-right w-36">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {recordList.map((rec, index) => {
                    const isPodium = index < 3;
                    const rankNames = ['🥇', '🥈', '🥉'];
                    
                    return (
                      <tr
                        key={index}
                        className={`hover:bg-slate-900/45 transition-colors ${
                          isPodium ? 'bg-gradient-to-r from-slate-900/30 to-transparent' : ''
                        }`}
                      >
                        <td className="py-3.5 px-5 text-center font-bold">
                          {isPodium ? (
                            <span className="text-base" title={`Rank ${index + 1}`}>{rankNames[index]}</span>
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-100 uppercase">
                          {rec.name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                          {activeTab === 'memoryStep' ? `${rec.score} cleard` : rec.score.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {activeTab === 'memoryStep' ? (
                            <span className="text-indigo-400 font-bold">Lvl {rec.score + 1}</span>
                          ) : (
                            <span className={rec.accuracy && rec.accuracy >= 90 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                              {rec.accuracy || 0}%
                            </span>
                          )}
                        </td>
                        {activeTab === 'rhythm' && (
                          <td className="py-3.5 px-4 text-center text-amber-500 font-semibold">
                            {rec.maxCombo ? `x${rec.maxCombo}` : '-'}
                          </td>
                        )}
                        <td className="py-3.5 px-5 text-right text-slate-500 flex items-center justify-end gap-1">
                          <Calendar size={12} />
                          {rec.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Motivational Footbar */}
        <div className="text-center text-[10px] text-slate-500 font-mono tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles size={11} className="text-amber-500" />
          Keep typing! Hit perfect sequences to reach the top of the leaderboards.
        </div>

      </div>

    </div>
  );
}
