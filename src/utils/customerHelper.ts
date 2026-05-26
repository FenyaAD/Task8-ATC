/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer } from '../types';
import { CUSTOMER_NAMES } from '../cashiersData';

let customerCounter = 0;

// Generates an elegant random customer
export function generateCustomer(tick: number, patienceFactor: number = 1.0): Customer {
  const uniqSuffix = Math.floor(Math.random() * 100000);
  const id = `cust_${Date.now()}_${uniqSuffix}_${++customerCounter}`;
  const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  
  // Distribute item counts: many people buy few items, rare people buy a cart-full
  const roll = Math.random();
  let itemCount = 3;
  if (roll < 0.4) {
    itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 items (express lane eligible!)
  } else if (roll < 0.8) {
    itemCount = Math.floor(Math.random() * 11) + 5; // 5-15 items
  } else {
    itemCount = Math.floor(Math.random() * 16) + 15; // 15-30 items
  }

  // Patience based on item count and role
  // Busy business person vs patient granny
  const customerTypes = [
    { type: 'hurrying', patienceBase: 40, weight: 0.25, badge: '⚡ Спешит' },
    { type: 'standard', patienceBase: 80, weight: 0.55, badge: '🛒 Стандарт' },
    { type: 'patient', patienceBase: 130, weight: 0.20, badge: '📦 Спокойный' },
  ];

  const typeRoll = Math.random();
  let selectedType = customerTypes[1]; // default standard
  if (typeRoll < customerTypes[0].weight) {
    selectedType = customerTypes[0];
  } else if (typeRoll > 1 - customerTypes[2].weight) {
    selectedType = customerTypes[2];
  }

  // Base patience duration in seconds (simulation ticks)
  // Adjusted by global patienceFactor slider (higher patience = longer waiting time tolerated)
  const patienceDuration = Math.round(selectedType.patienceBase * patienceFactor * (0.8 + Math.random() * 0.4));

  return {
    id,
    name: `${name} (${selectedType.badge})`,
    itemCount,
    initialItemCount: itemCount,
    arrivalTime: tick,
    waitingTime: 0,
    patience: 100, // percentage starts at 100%
    patienceDuration,
    status: 'waiting',
    itemsProcessed: 0,
    satisfaction: 100,
    isExpressEligible: itemCount <= 5,
    avatarSeed: Math.floor(Math.random() * 1000),
  };
}

export function formatTime(ticks: number): string {
  // Say simulation starts at 08:00 AM (8:00 represents 480 minutes)
  // Let 1 simulated clock minute = 6 ticks (10 seconds of simulated time per tick)
  const startingMinutes = 8 * 60; // 480 mins
  const currentMinutes = Math.floor(startingMinutes + ticks / 6);
  
  const hour = Math.floor((currentMinutes / 60) % 24);
  const min = Math.floor(currentMinutes % 60);
  
  const hStr = hour.toString().padStart(2, '0');
  const mStr = min.toString().padStart(2, '0');
  
  return `${hStr}:${mStr}`;
}

export function getHour(ticks: number): number {
  const startingMinutes = 8 * 60; // 480 mins
  const currentMinutes = Math.floor(startingMinutes + ticks / 6);
  return Math.floor((currentMinutes / 60) % 24);
}
