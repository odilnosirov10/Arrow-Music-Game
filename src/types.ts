/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ArrowDirection = 'left' | 'down' | 'up' | 'right';

export interface GameSettings {
  volume: number;          // 0 to 1
  sfxEnabled: boolean;
  synthBeatEnabled: boolean;
  bpm: number;             // Tempo for the rhythm beat (e.g. 110, 120, 130)
  speedModifier: number;   // 1x, 1.25x, 1.5x, 2x arrow speed
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ScoreRecord {
  name: string;
  score: number;
  date: string;
  accuracy?: number; // percentage
  maxCombo?: number;
}

export interface HighScores {
  rhythm: {
    easy: ScoreRecord[];
    medium: ScoreRecord[];
    hard: ScoreRecord[];
  };
  speedRush: ScoreRecord[];
  memoryStep: ScoreRecord[];
}

// Rhythm game note structure
export interface RhythmNote {
  id: string;
  dir: ArrowDirection;
  targetTime: number; // millisecond timestamp when the note should perfectly hit the receptor
  hit: boolean;
  missed: boolean;
}

// Visual particle effect on perfect/great hit
export interface HitEffect {
  id: string;
  dir: ArrowDirection;
  rating: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
  x: number;
  y: number;
}
