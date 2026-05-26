/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HighScores, ScoreRecord } from '../types';

const STORAGE_KEY = 'arrow_game_highscores_v1';

const defaultScores: HighScores = {
  rhythm: {
    easy: [
      { name: 'CHAMPION', score: 12500, accuracy: 96, maxCombo: 110, date: '2026-05-10' },
      { name: 'BEATMASTER', score: 9800, accuracy: 91, maxCombo: 75, date: '2026-05-18' },
      { name: 'PLAYER1', score: 6200, accuracy: 82, maxCombo: 42, date: '2026-05-24' }
    ],
    medium: [
      { name: 'SYNTH_PRO', score: 18500, accuracy: 95, maxCombo: 180, date: '2026-05-15' },
      { name: 'ARROW_GOD', score: 14200, accuracy: 88, maxCombo: 125, date: '2026-05-20' },
      { name: 'SPEEDY', score: 9100, accuracy: 80, maxCombo: 78, date: '2026-05-25' }
    ],
    hard: [
      { name: 'ULTRA_CHAMP', score: 28500, accuracy: 97, maxCombo: 310, date: '2026-05-12' },
      { name: 'SPEED_DEVIL', score: 21900, accuracy: 90, maxCombo: 220, date: '2026-05-22' },
      { name: 'KEY_MASHER', score: 15400, accuracy: 83, maxCombo: 140, date: '2026-05-26' }
    ]
  },
  speedRush: [
    { name: 'SONIC', score: 240, accuracy: 98, date: '2026-05-11' }, // 240 CPM or score
    { name: 'RAPID_FIRE', score: 195, accuracy: 92, date: '2026-05-19' },
    { name: 'CHILL_TYPER', score: 140, accuracy: 84, date: '2026-05-26' }
  ],
  memoryStep: [
    { name: 'ALINSTEIN', score: 14, date: '2026-05-12' }, // Level reached
    { name: 'ELEPHANT', score: 10, date: '2026-05-23' },
    { name: 'GOLD_FISH', score: 5, date: '2026-05-26' }
  ]
};

export function getHighScores(): HighScores {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load highscores from localStorage', e);
  }
  // Store default values initially if empty
  saveHighScores(defaultScores);
  return defaultScores;
}

export function saveHighScores(scores: HighScores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (e) {
    console.error('Failed to save highscores to localStorage', e);
  }
}

export function saveRhythmScore(difficulty: 'easy' | 'medium' | 'hard', record: ScoreRecord): boolean {
  const scores = getHighScores();
  const list = scores.rhythm[difficulty] || [];
  
  // Insert new score, sort descending, and take top 10
  list.push(record);
  list.sort((a, b) => b.score - a.score);
  scores.rhythm[difficulty] = list.slice(0, 10);
  
  saveHighScores(scores);
  
  // Check if this record is wide top rank
  return scores.rhythm[difficulty][0]?.score === record.score;
}

export function saveSpeedRushScore(record: ScoreRecord): boolean {
  const scores = getHighScores();
  scores.speedRush.push(record);
  scores.speedRush.sort((a, b) => b.score - a.score);
  scores.speedRush = scores.speedRush.slice(0, 10);
  
  saveHighScores(scores);
  return scores.speedRush[0]?.score === record.score;
}

export function saveMemoryScore(record: ScoreRecord): boolean {
  const scores = getHighScores();
  scores.memoryStep.push(record);
  scores.memoryStep.sort((a, b) => b.score - a.score);
  scores.memoryStep = scores.memoryStep.slice(0, 10);
  
  saveHighScores(scores);
  return scores.memoryStep[0]?.score === record.score;
}

export function clearAllHighScores() {
  saveHighScores({
    rhythm: { easy: [], medium: [], hard: [] },
    speedRush: [],
    memoryStep: []
  });
}
