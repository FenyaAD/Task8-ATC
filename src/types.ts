/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  name: string;
  itemCount: number;
  initialItemCount: number;
  arrivalTime: number; // in simulation ticks / minutes
  waitingTime: number; // current waiting time
  patience: number; // remaining patience (0 - 100)
  patienceDuration: number; // total duration tolerated (seconds)
  status: 'waiting' | 'serving' | 'served' | 'left';
  serviceStartTime?: number;
  finishTime?: number;
  assignedCashierId?: string | null;
  assignedRegisterId?: number | null;
  itemsProcessed: number;
  satisfaction: number; // 0..100 base satisfaction
  isExpressEligible: boolean;
  avatarSeed: number;
}

export type SpecialtyKey = 'cancel_button' | 'youth_vibe' | 'meteor_scan' | 'no_fatigue' | 'eternal_chat';

export interface Cashier {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  baseSpeed: number; // items scanned per tick (simulation second)
  currentSpeed: number; // adjusted
  stamina: number; // 0..100
  maxStamina: number; // 100
  fatigueRate: number; // fatigue cost per item scanned
  friendliness: number; // 1..5 stars, affects customer patience and tips
  errorRate: number; // chance of code error per item (0..0.1)
  errorCount: number;
  isLocked: boolean;
  costToUnlock: number;
  level: number;
  xp: number;
  xpNeeded: number;
  specialtyKey: SpecialtyKey;
  specialtyName: string;
  specialtyDesc: string;
  traitDesc: string;
  status: 'idle' | 'scanning' | 'resting' | 'stuck_error';
  errorCooldown: number; // remaining seconds of error block
  totalServed: number;
  totalItemsScanned: number;
  tipsEarned: number;
  restingSpeed: number; // speed of recovering stamina
  assignedRegisterId?: number | null;
}

export type ArrivalPatternType = 'constant' | 'rush-hours' | 'lunch-and-evening' | 'silent-night' | 'poisson-random';
export type QueueAlgorithmType = 'shortest-queue' | 'smart-time' | 'random' | 'single-snake' | 'express-limit';

export interface SimulationConfig {
  totalRegisters: number; // Max registers (e.g. 5-6)
  openRegisters: boolean[]; // size of totalRegisters, e.g. [true, true, false, false, false]
  arrivalPattern: ArrivalPatternType;
  arrivalIntensity: number; // slider multiplier from 1 to 10
  queueAlgorithm: QueueAlgorithmType;
  patienceFactor: number; // 1 = standard, 0.5 = impatient, 2 = patient
  expressMaxItems: number; // items threshold for express lane
  expressRegisterIndex: number; // index of register dedicated to express (e.g. Register index 4)
}

export interface SimulationStats {
  ticks: number; // Current simulation ticks / seconds
  activeTime: string; // Formatting HH:MM representation
  totalCustomersSpawned: number;
  totalCustomersServed: number;
  totalCustomersAngryLeft: number;
  currentInQueue: number;
  avgWaitTime: number; // overall average wait time
  satisfactionSum: number; // for average calculation
  totalRevenue: number;
  totalTips: number;
  cashierSpeeds: Record<string, number>;
}

export interface DayTimelineItem {
  hour: number;
  arrivalWeight: number; // coefficient multiplier
}

export interface ChartDataPoint {
  timeLabel: string; // "14:20" etc
  timeInMinutes: number;
  arrivalIntensity: number;
  queueLength: number;
  satisfaction: number;
  servedCount: number;
  leftCount: number;
  efficiency: number;
}
