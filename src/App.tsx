/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Customer, 
  Cashier, 
  SimulationConfig, 
  SimulationStats, 
  ArrivalPatternType, 
  QueueAlgorithmType 
} from './types';
import { INITIAL_CASHIERS, HOURLY_TIMELINE } from './cashiersData';
import { generateCustomer, formatTime, getHour } from './utils/customerHelper';
import { StoreFloor } from './components/StoreFloor';
import { SimulationControls } from './components/SimulationControls';
import { HeroesGuild } from './components/HeroesGuild';
import { StatsPanel } from './components/StatsPanel';
import { 
  Play, 
  Pause, 
  HelpCircle, 
  Sparkles, 
  Activity, 
  Users, 
  Layers, 
  AlertCircle,
  Clock,
  TrendingUp,
  Award,
  RefreshCw
} from 'lucide-react';

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'simulation' | 'heroes' | 'analytics'>('simulation');
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [ticks, setTicks] = useState<number>(0);
  const [coins, setCoins] = useState<number>(150); // Starting capital

  // Configuration
  const [config, setConfig] = useState<SimulationConfig>({
    totalRegisters: 5,
    openRegisters: [true, true, true, false, false], // 3 registers open initially
    arrivalPattern: 'poisson-random',
    arrivalIntensity: 4,
    queueAlgorithm: 'shortest-queue',
    patienceFactor: 1.5,
    expressMaxItems: 5,
    expressRegisterIndex: 4, // 5th register is express
  });

  // Cashiers Pool
  const [cashiers, setCashiers] = useState<Cashier[]>(INITIAL_CASHIERS);

  // Queues & Customer placement
  // index points to register number (0..4)
  const [queues, setQueues] = useState<Record<number, Customer[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: []
  });

  // Single Snake Queue
  const [singleSnakeQueue, setSingleSnakeQueue] = useState<Customer[]>([]);

  // Statistics
  const [stats, setStats] = useState<SimulationStats>({
    ticks: 0,
    activeTime: '08:00',
    totalCustomersSpawned: 0,
    totalCustomersServed: 0,
    totalCustomersAngryLeft: 0,
    currentInQueue: 0,
    avgWaitTime: 0,
    satisfactionSum: 0,
    totalRevenue: 0,
    totalTips: 0,
    cashierSpeeds: {}
  });

  // Recent Event Logs (displayed on page margins)
  const [logs, setLogs] = useState<{ id: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);

  // Current statistics averages
  const [avgItemsPerCustomer, setAvgItemsPerCustomer] = useState<number>(10);

  // References to keep state intact in handlers
  const prevTicksRef = useRef(0);

  // Log helper
  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 5);
    setLogs(prev => [{ id, text, type }, ...prev.slice(0, 5)]);
  };

  // --- ACTIONS ---

  // Handle register open/close toggle
  const handleToggleRegister = (index: number) => {
    const newOpen = [...config.openRegisters];
    const isCurrentlyOpen = newOpen[index];
    
    // Check at least one register stays open
    const openCount = newOpen.filter(Boolean).length;
    if (isCurrentlyOpen && openCount <= 1) {
      addLog("Должна быть открыта хотя бы одна касса!", "error");
      return;
    }

    newOpen[index] = !isCurrentlyOpen;
    setConfig(prev => ({ ...prev, openRegisters: newOpen }));

    if (isCurrentlyOpen) {
      // Re-queue the customers if we CLOSE a register!
      const dismissedCustomers = queues[index] || [];
      if (dismissedCustomers.length > 0) {
        addLog(`Касса #${index + 1} закрыта. Перенаправляем ${dismissedCustomers.length} покупателей.`, "warning");
        
        setQueues(prev => ({ ...prev, [index]: [] }));
        
        dismissedCustomers.forEach(cust => {
          // Put them back in other queues
          dispatchCustomer(cust, newOpen);
        });
      }
    } else {
      addLog(`Касса #${index + 1} теперь РАБОТАЕТ!`, "success");
    }
  };

  // Hire lock card cashier
  const handleUnlockCashier = (id: string, cost: number) => {
    if (coins < cost) return;
    
    setCoins(prev => prev - cost);
    setCashiers(prev => prev.map(c => c.id === id ? { ...c, isLocked: false } : c));
    addLog(`Вы наняли кассира: ${cashiers.find(c => c.id === id)?.name}!`, "success");
  };

  // Assign/Move cashier to register
  const handleAssignCashier = (cashierId: string, registerIndex: number | null) => {
    setCashiers(prev => {
      // Clear previous assignment for this cashier, and anyone else on registerIndex
      return prev.map(c => {
        let updated = { ...c };
        
        // If this is the cashier being assigned
        if (c.id === cashierId) {
          updated.assignedRegisterId = registerIndex;
          if (registerIndex !== null) {
            updated.status = 'idle';
          }
        } else if (registerIndex !== null && c.assignedRegisterId === registerIndex) {
          // Kick the other cashier to reserve
          updated.assignedRegisterId = null;
          addLog(`${c.name} отправлен(а) в резерв.`, "info");
        }
        
        return updated;
      });
    });

    const cashObj = cashiers.find(c => c.id === cashierId);
    if (registerIndex !== null) {
      addLog(`${cashObj?.name} назначен на Кассу #${registerIndex + 1}`, "success");
    } else {
      addLog(`${cashObj?.name} отправлен в резерв торгового зала`, "info");
    }
  };

  // Level Up / Train cashier
  const handleUpgradeCashier = (id: string) => {
    const cashObj = cashiers.find(c => c.id === id);
    if (!cashObj) return;
    const upgradeCost = Math.round(50 * Math.pow(1.6, cashObj.level - 1));

    if (coins < upgradeCost) return;

    setCoins(prev => prev - upgradeCost);
    setCashiers(prev => prev.map(c => {
      if (c.id === id) {
        const nextLevel = c.level + 1;
        const newSpeed = c.baseSpeed * 1.12;
        return {
          ...c,
          level: nextLevel,
          baseSpeed: newSpeed,
          stamina: 100, // full refresh on upgrade
          xpNeeded: Math.round(c.xpNeeded * 1.5),
        };
      }
      return c;
    }));

    addLog(`Повышен уровень кассира ${cashObj.name} до ${cashObj.level + 1}! Скорость увеличена!`, "success");
  };

  // Buy Coffee for Cashier
  const handleCoffeeCashier = (id: string) => {
    const coffeeCost = 25;
    if (coins < coffeeCost) return;

    const cashObj = cashiers.find(c => c.id === id);
    if (cashObj && cashObj.stamina >= 95) {
      addLog(`${cashObj.name} слишком бодр(а), кофе не нужен.`, "info");
      return;
    }

    setCoins(prev => prev - coffeeCost);
    setCashiers(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          stamina: Math.min(100, c.stamina + 50),
          status: c.status === 'resting' ? 'idle' : c.status
        };
      }
      return c;
    }));

    addLog(`Куплен ароматный кофе для ${cashiers.find(c => c.id === id)?.name}! (+50 бодрости)`, "success");
  };

  // Toggle Break / Rest
  const handleToggleRestCashier = (id: string) => {
    setCashiers(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'resting' ? 'idle' : 'resting';
        if (nextStatus === 'resting') {
          addLog(`${c.name} ушел на заслуженный перерыв пить чай!`, "warning");
        } else {
          addLog(`${c.name} вернулся к кассовому аппарату!`, "success");
        }
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  // Manual reset of error scanner block ("Галя, у нас отмена!")
  const handleManualResetError = (cashierId: string) => {
    const cashObj = cashiers.find(c => c.id === cashierId);
    if (!cashObj) return;

    const isValentina = cashObj.specialtyKey === 'cancel_button';
    const costToReset = isValentina ? 0 : 5; // Valentina does it for free instantly!

    if (coins < costToReset) {
      addLog("Не хватает $5 монет для срочного вызова заведующей Галина!", "error");
      return;
    }

    if (costToReset > 0) {
      setCoins(prev => prev - costToReset);
    }

    setCashiers(prev => prev.map(c => {
      if (c.id === cashierId) {
        return { ...c, status: 'idle', errorCooldown: 0 };
      }
      return c;
    }));

    addLog(`Галя решила проблему на кассе ${cashObj.name}! Моментальный сброс ошибки!`, "success");
  };

  // Specialty activator (called when clicking cashier)
  const handleCallSpecialty = (cashierId: string) => {
    const cashObj = cashiers.find(c => c.id === cashierId);
    if (!cashObj) return;

    addLog(`Вы активировали талант ${cashObj.name}: ${cashObj.specialtyName}!`, "info");
  };

  // --- MATHEMATICAL QUEUE ROUTER ---
  // Submits a customer to the correct register’s list based on current settings
  const dispatchCustomer = (customer: Customer, currentOpenRegisters: boolean[] = config.openRegisters) => {
    // 1. If snake layout is active:
    if (config.queueAlgorithm === 'single-snake') {
      setSingleSnakeQueue(prev => [...prev, customer]);
      return;
    }

    // Identify open indices
    const openIndices: number[] = [];
    currentOpenRegisters.forEach((isOpen, index) => {
      if (index < config.totalRegisters && isOpen) {
        openIndices.push(index);
      }
    });

    if (openIndices.length === 0) {
      // No open registers! Fallback
      addLog("Ошибка ТМО: Нет ни одной открытой кассы! Клиент ушел без покупки.", "error");
      setStats(prev => ({ ...prev, totalCustomersAngryLeft: prev.totalCustomersAngryLeft + 1 }));
      return;
    }

    // 2. Shortest Queue selection
    if (config.queueAlgorithm === 'shortest-queue') {
      let bestIndex = openIndices[0];
      let minLen = Infinity;

      openIndices.forEach(idx => {
        const qLen = queues[idx]?.length || 0;
        if (qLen < minLen) {
          minLen = qLen;
          bestIndex = idx;
        }
      });

      setQueues(prev => ({
        ...prev,
        [bestIndex]: [...(prev[bestIndex] || []), customer]
      }));
      return;
    }

    // 3. Intelligent Estimation of Wait Time
    if (config.queueAlgorithm === 'smart-time') {
      let bestIndex = openIndices[0];
      let minEstimate = Infinity;

      openIndices.forEach(idx => {
        // Find assigned cashier to evaluate speed
        const assignedCashier = cashiers.find(c => c.assignedRegisterId === idx && c.status !== 'resting');
        const cSpeed = assignedCashier ? (assignedCashier.baseSpeed * (1 + (assignedCashier.level - 1) * 0.1)) : 0.8;
        
        const qItems = (queues[idx] || []).reduce((acc, c) => acc + c.itemCount, 0) + customer.itemCount;
        const estWait = qItems / cSpeed;

        if (estWait < minEstimate) {
          minEstimate = estWait;
          bestIndex = idx;
        }
      });

      setQueues(prev => ({
        ...prev,
        [bestIndex]: [...(prev[bestIndex] || []), customer]
      }));
      return;
    }

    // 4. Random chaos choice
    if (config.queueAlgorithm === 'random') {
      const randIdx = openIndices[Math.floor(Math.random() * openIndices.length)];
      setQueues(prev => ({
        ...prev,
        [randIdx]: [...(prev[randIdx] || []), customer]
      }));
      return;
    }

    // 5. Express Register limiting
    if (config.queueAlgorithm === 'express-limit') {
      const expressIdx = config.expressRegisterIndex;
      const isExpressOpen = currentOpenRegisters[expressIdx];

      if (customer.itemCount <= config.expressMaxItems && isExpressOpen) {
        // Customer is eligible for express lane! Let them take it if express line is sane
        const expressLen = queues[expressIdx]?.length || 0;
        
        // Find shortest normal line
        const normalIndices = openIndices.filter(idx => idx !== expressIdx);
        let minNormalLen = Infinity;
        let minNormalIdx = normalIndices[0] || 0;

        normalIndices.forEach(idx => {
          const l = queues[idx]?.length || 0;
          if (l < minNormalLen) {
            minNormalLen = l;
            minNormalIdx = idx;
          }
        });

        // Express line preferred if it’s shorter or at least reasonable
        if (expressLen <= minNormalLen + 1) {
          setQueues(prev => ({
            ...prev,
            [expressIdx]: [...(prev[expressIdx] || []), customer]
          }));
          return;
        } else {
          setQueues(prev => ({
            ...prev,
            [minNormalIdx]: [...(prev[minNormalIdx] || []), customer]
          }));
          return;
        }
      } else {
        // Customer MUST avoid express lane or has too many goods
        const normalIndices = openIndices.filter(idx => idx !== expressIdx);
        if (normalIndices.length === 0) {
          // No regular lines open! Forced to wait at the express or fail
          setQueues(prev => ({
            ...prev,
            [expressIdx]: [...(prev[expressIdx] || []), { ...customer, name: `${customer.name} (НАРУШИТЕЛЬ!)` }]
          }));
          return;
        }

        let bestIndex = normalIndices[0];
        let minLen = Infinity;
        normalIndices.forEach(idx => {
          const l = queues[idx]?.length || 0;
          if (l < minLen) {
            minLen = l;
            bestIndex = idx;
          }
        });

        setQueues(prev => ({
          ...prev,
          [bestIndex]: [...(prev[bestIndex] || []), customer]
        }));
      }
    }
  };

  // Trigger manual spawn of user customer
  const handleManualSpawn = () => {
    const cust = generateCustomer(ticks, config.patienceFactor);
    dispatchCustomer(cust);
    setStats(prev => ({ ...prev, totalCustomersSpawned: prev.totalCustomersSpawned + 1 }));
    addLog(`Покупатель ${cust.name.split(' (')[0]} подошел к кассам вручную.`, "info");
  };

  // Trigger temporary massive peak wave
  const handleRushWaveSpawn = () => {
    addLog("🔊 ОБЪЯВЛЕНИЕ: Автобус с туристами прибыл! Наплыв покупателей!", "warning");
    
    // Spawn 8-12 customers rapidly
    const count = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const cust = generateCustomer(ticks, config.patienceFactor);
        setStats(prev => ({ ...prev, totalCustomersSpawned: prev.totalCustomersSpawned + 1 }));
        dispatchCustomer(cust);
      }, i * 150);
    }
  };

  // Restart/reset whole simulation state
  const handleResetSimulation = () => {
    setIsPaused(true);
    setTicks(0);
    setCoins(150);
    setQueues({ 0: [], 1: [], 2: [], 3: [], 4: [] });
    setSingleSnakeQueue([]);
    setCashiers(INITIAL_CASHIERS);
    setStats({
      ticks: 0,
      activeTime: '08:00',
      totalCustomersSpawned: 0,
      totalCustomersServed: 0,
      totalCustomersAngryLeft: 0,
      currentInQueue: 0,
      avgWaitTime: 0,
      satisfactionSum: 0,
      totalRevenue: 0,
      totalTips: 0,
      cashierSpeeds: {}
    });
    setLogs([]);
    addLog("Симуляция касс полностью перезапущена.", "info");
  };

  // Toggle active pause status
  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
    addLog(isPaused ? "Симуляция возобновлена." : "Симуляция приостановлена.", "info");
  };

  // --- RECURRING ENGINE LOOP TICK ---
  // Calculates changes in people queues, scanning items, fatigued workers and patience losses.
  useEffect(() => {
    if (isPaused) return;

    // Tick loop trigger
    const intervalTime = Math.max(50, 400 / speed); // scales based on fastforward rate
    const timer = setInterval(() => {
      // Fetch current snapshots of state synchronously
      const nextTicks = ticks + 1;
      const currentHour = getHour(nextTicks);
      const timeLabel = formatTime(nextTicks);

      // Terminate at store closing: 22:00
      if (currentHour >= 22) {
        setIsPaused(true);
        addLog("🕗 22:00: Магазин закрылся! Симуляционный рабочий день завершен.", "success");
        return;
      }

      // Local clones to process step-by-step
      let nextQueues = { ...queues };
      let nextCashiers = [...cashiers];
      let nextSingleSnakeQueue = [...singleSnakeQueue];

      // Stats adjustments we will accumulate
      let totalCustomersSpawnedAdd = 0;
      let totalCustomersAngryLeftAdd = 0;
      let totalCustomersServedAdd = 0;
      let satisfactionSumAdd = 0;
      let currentWaitSumAdd = 0;
      let totalRevenueAdd = 0;
      let totalTipsAdd = 0;
      let nextBasketItemsSum = avgItemsPerCustomer * 10;

      // --- 1. ARRIVAL PROBABILITY CALCULATOR ---
      const timelineWeights = HOURLY_TIMELINE[config.arrivalPattern] || [];
      const hourIndex = Math.max(0, Math.min(timelineWeights.length - 1, currentHour - 8));
      const hourWeight = timelineWeights[hourIndex] || 1.0;

      // Base arrival chance: higher values spawn customer
      // scaled by arrivalIntensity (1 to 10) and hourly weight
      const arrivalProbability = 0.03 * config.arrivalIntensity * hourWeight;
      if (Math.random() < arrivalProbability) {
        const newCust = generateCustomer(nextTicks, config.patienceFactor);
        
        totalCustomersSpawnedAdd += 1;
        nextBasketItemsSum = nextBasketItemsSum * 0.9 + newCust.itemCount;

        // Custom internal dispatch customer to our cloned states
        if (config.queueAlgorithm === 'single-snake') {
          nextSingleSnakeQueue.push(newCust);
        } else {
          // Identify open indices
          const openIndices: number[] = [];
          config.openRegisters.forEach((isOpen, index) => {
            if (index < config.totalRegisters && isOpen) {
              openIndices.push(index);
            }
          });

          if (openIndices.length === 0) {
            // No open registers! Fallback
            addLog("Ошибка ТМО: Нет ни одной открытой кассы! Клиент ушел без покупки.", "error");
            totalCustomersAngryLeftAdd += 1;
          } else {
            let bestIndex = openIndices[0];

            if (config.queueAlgorithm === 'shortest-queue') {
              let minLen = Infinity;
              openIndices.forEach(idx => {
                const qLen = nextQueues[idx]?.length || 0;
                if (qLen < minLen) {
                  minLen = qLen;
                  bestIndex = idx;
                }
              });
            } else if (config.queueAlgorithm === 'smart-time') {
              let minEstimate = Infinity;
              openIndices.forEach(idx => {
                // Find assigned cashier to evaluate speed
                const assignedCashier = nextCashiers.find(c => c.assignedRegisterId === idx && c.status !== 'resting');
                const cSpeed = assignedCashier ? (assignedCashier.baseSpeed * (1 + (assignedCashier.level - 1) * 0.1)) : 0.8;
                
                const qItems = (nextQueues[idx] || []).reduce((acc, c) => acc + c.itemCount, 0) + newCust.itemCount;
                const estWait = qItems / cSpeed;

                if (estWait < minEstimate) {
                  minEstimate = estWait;
                  bestIndex = idx;
                }
              });
            } else if (config.queueAlgorithm === 'random') {
              bestIndex = openIndices[Math.floor(Math.random() * openIndices.length)];
            } else if (config.queueAlgorithm === 'express-limit') {
              const expressIdx = config.expressRegisterIndex;
              const isExpressOpen = config.openRegisters[expressIdx];

              if (newCust.itemCount <= config.expressMaxItems && isExpressOpen) {
                // Customer is eligible for express lane
                const expressLen = nextQueues[expressIdx]?.length || 0;
                
                // Find shortest normal line
                const normalIndices = openIndices.filter(idx => idx !== expressIdx);
                let minNormalLen = Infinity;
                let minNormalIdx = normalIndices[0] || 0;

                normalIndices.forEach(idx => {
                  const l = nextQueues[idx]?.length || 0;
                  if (l < minNormalLen) {
                    minNormalLen = l;
                    minNormalIdx = idx;
                  }
                });

                if (expressLen <= minNormalLen + 1) {
                  bestIndex = expressIdx;
                } else {
                  bestIndex = minNormalIdx;
                }
              } else {
                // Must take normal lane
                const normalIndices = openIndices.filter(idx => idx !== expressIdx);
                if (normalIndices.length > 0) {
                  let minNormalLen = Infinity;
                  let minNormalIdx = normalIndices[0];

                  normalIndices.forEach(idx => {
                    const l = nextQueues[idx]?.length || 0;
                    if (l < minNormalLen) {
                      minNormalLen = l;
                      minNormalIdx = idx;
                    }
                  });
                  bestIndex = minNormalIdx;
                } else {
                  bestIndex = expressIdx;
                }
              }
            }

            nextQueues[bestIndex] = [...(nextQueues[bestIndex] || []), newCust];
          }
        }
      }

      // --- 2. MULTI-SERVER SERVICE SPEED PROCESSOR ---
      // For each of our registers
      for (let regIdx = 0; regIdx < config.totalRegisters; regIdx++) {
        const isOpen = config.openRegisters[regIdx];
        if (!isOpen) continue;

        // Find assigned cashier hero
        const cashierIndex = nextCashiers.findIndex(c => c.assignedRegisterId === regIdx);
        const cashier = cashierIndex !== -1 ? nextCashiers[cashierIndex] : null;

        // Handle "Single Snake Queue" fetching customer IF register is unoccupied and cashier is free
        if (config.queueAlgorithm === 'single-snake' && cashier && cashier.status !== 'resting' && cashier.status !== 'stuck_error') {
          const currentRegQueue = nextQueues[regIdx] || [];
          
          if (currentRegQueue.length === 0) {
            // Fetch from common queue
            if (nextSingleSnakeQueue.length > 0) {
              const [first, ...rest] = nextSingleSnakeQueue;
              const grabbedCustomer = { 
                ...first, 
                status: 'serving' as const,
                serviceStartTime: nextTicks,
                assignedCashierId: cashier.id,
                assignedRegisterId: regIdx
              };
              nextSingleSnakeQueue = rest;
              nextQueues[regIdx] = [grabbedCustomer];
              // Change status of cashier
              nextCashiers[cashierIndex] = { ...cashier, status: 'scanning' };
              continue;
            }
          }
        }

        // Normal registration queue updates
        const queue = nextQueues[regIdx] || [];
        if (queue.length === 0) {
          // If queue is empty, cashier goes idle
          if (cashier && cashier.status === 'scanning') {
            nextCashiers[cashierIndex] = { ...cashier, status: 'idle' };
          }
          continue;
        }

        const activeCustomer = queue[0];

        // If open but NO CASHIER assigned!
        if (!cashier) {
          // Customer cannot be served! Just sits and loses patience.
          continue;
        }

        // If cashier is on BREAK, recover stamina, no scanning progress done
        if (cashier.status === 'resting') {
          const updatedStamina = Math.min(100, cashier.stamina + cashier.restingSpeed);
          const isRecovered = updatedStamina >= 100;
          
          nextCashiers[cashierIndex] = {
            ...cashier,
            stamina: updatedStamina,
            status: isRecovered ? 'idle' : 'resting'
          };
          continue;
        }

        // If cashier is currently BLOCKED by code parsing error
        if (cashier.status === 'stuck_error') {
          const remainingCD = cashier.errorCooldown - 1;
          if (remainingCD <= 0) {
            // Error resolved automatically over time
            nextCashiers[cashierIndex] = {
              ...cashier,
              status: 'idle',
              errorCooldown: 0
            };
            addLog(`Ошибка на Кассе #${regIdx + 1} устранена. Кассир возобновил сканирование!`, "info");
          } else {
            nextCashiers[cashierIndex] = {
              ...cashier,
              errorCooldown: remainingCD
            };
          }
          continue; // no item scanning this tick
        }

        // Active Scanning progress
        nextCashiers[cashierIndex] = { ...cashier, status: 'scanning' };
        
        // Calculate scanning speed based on cashier's stamina
        let staminaMultiplier = 1.0;
        if (cashier.stamina <= 0) {
          staminaMultiplier = 0.3; // exhausted multiplier
        } else if (cashier.stamina < 30) {
          staminaMultiplier = 0.7; // stressed slow scanning
        }

        // Meteor scan bonus
        if (cashier.specialtyKey === 'meteor_scan' && cashier.stamina > 60) {
          staminaMultiplier *= 1.35;
        }

        const actualScanSpeed = cashier.baseSpeed * staminaMultiplier;
        const nextProcessed = Math.min(activeCustomer.itemCount, activeCustomer.itemsProcessed + actualScanSpeed);
        
        // Fatigue impact (Except Robots)
        const itemsJustProcessed = nextProcessed - activeCustomer.itemsProcessed;
        const fatigueImpact = itemsJustProcessed * cashier.fatigueRate;
        const nextStamina = Math.max(0, cashier.stamina - fatigueImpact);

        // Update customer processed count inside queue
        const updatedCustomer = {
          ...activeCustomer,
          itemsProcessed: nextProcessed,
          status: 'serving' as const
        };

        // Error occurrence roll
        let triggeredError = false;
        if (nextStamina > 0 && Math.random() < cashier.errorRate * itemsJustProcessed) {
          triggeredError = true;
          nextCashiers[cashierIndex] = {
            ...cashier,
            status: 'stuck_error',
            errorCooldown: cashier.specialtyKey === 'cancel_button' ? 1 : 6, // Valentina is super fast, 1 tick error cooldown
            errorCount: cashier.errorCount + 1,
            stamina: nextStamina
          };
          addLog(`⚠️ Сбой сканирования у ${cashier.name}! Касса приостановлена.`, "error");
        }

        // Transaction Finished Checklist
        if (nextProcessed >= activeCustomer.itemCount && !triggeredError) {
          // Customer completes checkout successfully
          const waitTicks = updatedCustomer.waitingTime;
          
          // Earn money
          const baseItemSale = activeCustomer.itemCount * 4.55; // base rate
          const checkoutFee = 15.00;
          const totalItemSale = baseItemSale + checkoutFee;

          // Tips
          const friendlinessFactor = cashier.friendliness * 0.5;
          const patienceMultiplier = updatedCustomer.patience / 100;
          const articVibeBonus = cashier.specialtyKey === 'youth_vibe' ? 1.5 : 1.0;
          const earnedTips = activeCustomer.itemCount * 0.15 * friendlinessFactor * patienceMultiplier * articVibeBonus;

          totalRevenueAdd += totalItemSale;
          totalTipsAdd += earnedTips;
          totalCustomersServedAdd += 1;
          satisfactionSumAdd += updatedCustomer.patience;
          currentWaitSumAdd += waitTicks;

          // Add Cashier XP
          const xpGained = activeCustomer.itemCount * 1.5;
          let finalXp = cashier.xp + xpGained;
          let finalLvl = cashier.level;
          let finalXpNeeded = cashier.xpNeeded;
          let finalBaseSpeed = cashier.baseSpeed;

          if (finalXp >= finalXpNeeded) {
            finalLvl += 1;
            finalXp -= finalXpNeeded;
            finalXpNeeded = Math.round(finalXpNeeded * 1.5);
            finalBaseSpeed *= 1.10; // permanent speed raise!
            addLog(`🎉 Кассир ${cashier.name} достиг Уровня ${finalLvl}! Скорость постоянного сканирования возросла!`, "success");
          }

          // Update Cashier values
          nextCashiers[cashierIndex] = {
            ...cashier,
            stamina: nextStamina,
            xp: finalXp,
            level: finalLvl,
            xpNeeded: finalXpNeeded,
            baseSpeed: finalBaseSpeed,
            totalServed: cashier.totalServed + 1,
            totalItemsScanned: cashier.totalItemsScanned + activeCustomer.itemCount,
            tipsEarned: cashier.tipsEarned + earnedTips,
            status: 'idle'
          };

          // Dismiss customer from register queue
          nextQueues[regIdx] = queue.slice(1);
          addLog(`✅ Покупатель получил чеки (${activeCustomer.itemCount} тов.) в Кассе #${regIdx + 1}! Настроение: ${Math.round(updatedCustomer.patience)}%`, "success");

        } else if (!triggeredError) {
          // Just write progress
          nextQueues[regIdx] = [updatedCustomer, ...queue.slice(1)];
          nextCashiers[cashierIndex] = {
            ...cashier,
            stamina: nextStamina
          };
        }
      }

      // --- 3. CUSTOMER PATIENCE UPDATER ---
      // Loops through all waiting lines, decrementing customer patience and ejecting abandoned ones
      for (let rIdx = 0; rIdx < config.totalRegisters; rIdx++) {
        const queue = nextQueues[rIdx] || [];
        if (queue.length === 0) continue;

        const nextQueue: Customer[] = [];

        // Cashier check for specialty
        const assignedCashier = nextCashiers.find(c => c.assignedRegisterId === rIdx);
        const isArturVibe = assignedCashier?.specialtyKey === 'youth_vibe';
        const isStepanPhilosoph = assignedCashier?.specialtyKey === 'eternal_chat';

        queue.forEach((cust, qPos) => {
          // 1. If currently being served:
          if (qPos === 0) {
            const nextWait = cust.waitingTime + 1;
            
            // Stepan’s special talent: small chance to fully calm active serving customer
            let finalPatience = cust.patience;
            if (isStepanPhilosoph && Math.random() < 0.12 && cust.patience < 100) {
              finalPatience = 100;
              addLog(`✨ Философ Степан вернул душевный дзен покупателю ${cust.name.split(' (')[0]} разговором про звезды.`, "success");
            }

            nextQueue.push({
              ...cust,
              waitingTime: nextWait,
              patience: finalPatience
            });
            return;
          }

          // 2. Waiting in queue:
          const nextWait = cust.waitingTime + 1;
          
          // Artur Vibe reduces patience drain by 30%
          const basePatienceCost = (100 / cust.patienceDuration);
          const patienceCost = isArturVibe ? (basePatienceCost * 0.7) : basePatienceCost;
          const nextPatience = Math.max(0, cust.patience - patienceCost);

          if (nextPatience <= 0) {
            // Abandonment! Customer steps out of line and leaves store
            totalCustomersAngryLeftAdd += 1;
            addLog(`😡 Покупатель ${cust.name.split(' (')[0]} разгневался из-за ожидания в Кассе #${rIdx + 1} и покинул магазин!`, "error");
          } else {
            nextQueue.push({
              ...cust,
              waitingTime: nextWait,
              patience: nextPatience
            });
          }
        });

        nextQueues[rIdx] = nextQueue;
      }

      // B. Handle Single Snake waiting line patience update
      if (config.queueAlgorithm === 'single-snake') {
        const nextSnake: Customer[] = [];
        
        nextSingleSnakeQueue.forEach(cust => {
          const nextWait = cust.waitingTime + 1;
          const patienceCost = (100 / cust.patienceDuration);
          const nextPatience = Math.max(0, cust.patience - patienceCost);

          if (nextPatience <= 0) {
            totalCustomersAngryLeftAdd += 1;
            addLog(`🤬 ${cust.name.split(' (')[0]} не дождался распределения в Единой Очереди и со скандалом ушел!`, "error");
          } else {
            nextSnake.push({
              ...cust,
              waitingTime: nextWait,
              patience: nextPatience
            });
          }
        });

        nextSingleSnakeQueue = nextSnake;
      }

      // --- 4. CONSOLIDATE QUANTITY STATS & COINS & AVERAGE ---
      setStats(prev => {
        const newServed = prev.totalCustomersServed + totalCustomersServedAdd;
        const newSum = prev.satisfactionSum + satisfactionSumAdd;
        const newWeightWait = newServed > 0 
          ? (prev.avgWaitTime * prev.totalCustomersServed + currentWaitSumAdd) / newServed
          : 0;

        let totalWaiting = 0;
        if (config.queueAlgorithm === 'single-snake') {
          totalWaiting = nextSingleSnakeQueue.length;
        } else {
          for (let i = 0; i < config.totalRegisters; i++) {
            if (config.openRegisters[i]) {
              totalWaiting += (nextQueues[i] || []).length;
            }
          }
        }

        return {
          ...prev,
          ticks: nextTicks,
          activeTime: timeLabel,
          totalCustomersSpawned: prev.totalCustomersSpawned + totalCustomersSpawnedAdd,
          totalCustomersAngryLeft: prev.totalCustomersAngryLeft + totalCustomersAngryLeftAdd,
          totalCustomersServed: newServed,
          satisfactionSum: newSum,
          avgWaitTime: Number.isNaN(newWeightWait) ? 0 : Math.round(newWeightWait),
          totalRevenue: prev.totalRevenue + totalRevenueAdd,
          totalTips: prev.totalTips + totalTipsAdd,
          currentInQueue: totalWaiting
        };
      });

      if (totalRevenueAdd > 0 || totalTipsAdd > 0) {
        setCoins(prev => prev + totalRevenueAdd + totalTipsAdd);
      }

      if (totalCustomersSpawnedAdd > 0) {
        setAvgItemsPerCustomer(nextBasketItemsSum / 10);
      }

      // COMMIT UPDATED DATA TO REACT STATE SIMULTANEOUSLY
      setTicks(nextTicks);
      setQueues(nextQueues);
      setCashiers(nextCashiers);
      setSingleSnakeQueue(nextSingleSnakeQueue);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, speed, config, queues, singleSnakeQueue, cashiers]);

  // Compute stats details on current grid
  const activeRegistersCount = config.openRegisters.filter((isOpen, idx) => idx < config.totalRegisters && isOpen).length;
  const simSeconds = Math.max(1, ticks);
  const simMinutes = simSeconds / 60;
  const lambda = stats.totalCustomersSpawned / simMinutes || 0;
  const empiricalMu = stats.totalCustomersServed > 0
    ? (stats.totalCustomersServed / (simMinutes * Math.max(1, activeRegistersCount)))
    : 1.2;
  const rho = lambda / (Math.max(1, activeRegistersCount) * empiricalMu) || 0;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-200 font-sans flex flex-col justify-between">
      {/* 
        PREMIUM NAVIGATION UPPER RAIL 
      */}
      <header className="bg-[#0A0A0C] border-b border-slate-800 sticky top-0 z-40 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-cyan-950/50 font-display">
            RS
          </div>
          <div>
            <h1 className="text-xl font-light tracking-tight text-white font-display">
              RETAIL<span className="font-bold text-cyan-500">SIM</span> <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/50">v1.3</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
              Mass Service System Simulation Dashboard
            </p>
          </div>
        </div>

        {/* Live System Metrics in Header */}
        <div className="hidden md:flex gap-4">
          <div className="bg-[#14151a] border border-slate-800 px-4 py-2 rounded-sm flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Current Load</span>
            <span className="text-sm font-mono text-cyan-400 font-bold">{(rho * 100).toFixed(1)}%</span>
          </div>
          <div className="bg-[#14151a] border border-slate-805 px-4 py-2 rounded-sm flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Avg. Wait Time</span>
            <span className="text-sm font-mono text-amber-400 font-bold">{Math.round(stats.avgWaitTime)}s</span>
          </div>
          <div className="bg-[#14151a] border border-slate-805 px-4 py-2 rounded-sm flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Store Budget</span>
            <span className="text-sm font-mono text-emerald-400 font-bold">${coins.toFixed(2)}</span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex bg-[#14151a] rounded-md p-1 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-sm transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'simulation'
                ? 'bg-cyan-600 text-white shadow shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Торговый Зал</span>
          </button>
          <button
            onClick={() => setActiveTab('heroes')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-sm transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'heroes'
                ? 'bg-cyan-600 text-white shadow shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Кассиры-Герои</span>
            <span className="bg-amber-500 text-white font-extrabold text-[8px] h-3.5 w-3.5 rounded-full flex items-center justify-center animate-pulse">
              !
            </span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-sm transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-cyan-600 text-white shadow shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ТМО Аналитика</span>
          </button>
        </div>
      </header>

      {/* 
        TOP HORIZONTAL SIMULATION CONTROLS BELT 
      */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-6">
        <div className="bg-[#14151a] border border-slate-800 rounded-lg p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-black/40">
          
          {/* Left section: Simulation status with LED clock */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPaused ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              </span>
              <span className="text-3xs font-mono font-bold uppercase tracking-widest text-slate-400">
                {isPaused ? 'ПАУЗА' : 'ЭМУЛЯЦИЯ'}
              </span>
            </div>
            
            {/* LED Digital Clock representation */}
            <div className="bg-[#0A0A0C] border border-slate-850 rounded px-3 py-1.5 flex items-center gap-2 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Время СМО:</span>
              <span className="text-xs font-mono font-black text-cyan-400 tracking-widest">
                {formatTime(ticks)}
              </span>
            </div>
          </div>

          {/* Right section: Control Actions (Play, Speed, Spawn, Reset) */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            
            {/* Play/Pause */}
            <button
              onClick={handleTogglePause}
              className={`px-3.5 py-1.5 rounded-sm font-extrabold text-[10px] tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isPaused
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/20'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/20'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'СТАРТ' : 'ПАУЗА'}</span>
            </button>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 bg-[#0A0A0C] border border-slate-800 rounded-sm p-0.5">
              {[0.1, 0.5, 1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSpeed(s);
                    if (isPaused) {
                      setIsPaused(false);
                      addLog(`Симуляция запущена на скорости ${s}x`, 'success');
                    } else {
                      addLog(`Скорость изменена на ${s}x`, 'info');
                    }
                  }}
                  className={`px-2.5 py-1 text-[10px] font-mono font-extrabold rounded-sm transition cursor-pointer ${
                    speed === s && !isPaused
                      ? 'bg-cyan-600 shadow-sm text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}X
                </button>
              ))}
            </div>

            {/* Add guest */}
            <button
              onClick={handleManualSpawn}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-sm text-3xs flex items-center gap-1 transition cursor-pointer"
              title="Заспавнить одного покупателя"
            >
              <span>+1 Гость</span>
            </button>

            {/* Wave rush */}
            <button
              onClick={handleRushWaveSpawn}
              className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-950 border border-red-900/40 text-red-300 font-bold rounded-sm text-3xs flex items-center gap-1 transition cursor-pointer"
              title="Наплыв покупателей"
            >
              <span>Пик-Волна</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleResetSimulation}
              className="px-2.5 py-1.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-sm text-3xs transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Сброс</span>
            </button>

          </div>

        </div>
      </div>

      {/* 
        MAIN HIGH-FIDELITY SPLIT GRID 
      */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PRIMARY WORKSPACE ACTIVE TAB */}
        <section className="lg:col-span-8 space-y-6">
          
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              {/* Store virtual 2D floor visualizer */}
              <StoreFloor
                registers={Array.from({ length: config.totalRegisters }).map((_, idx) => {
                  const currentRegQueue = queues[idx] || [];
                  const activeCashier = cashiers.find(c => c.assignedRegisterId === idx) || null;
                  return {
                    index: idx,
                    isOpen: config.openRegisters[idx],
                    cashier: activeCashier,
                    queue: currentRegQueue
                  };
                })}
                singleSnakeQueue={singleSnakeQueue}
                config={config}
                onToggleRegister={handleToggleRegister}
                onManualResetError={handleManualResetError}
                onCallSpecialty={handleCallSpecialty}
                onAssignCashierClick={(idx) => {
                  setActiveTab('heroes');
                  addLog("Выберите кассира и назначьте его на Кассу #" + (idx + 1), "info");
                }}
              />

              {/* Quick instructions widget card */}
              <div className="bg-[#14151a] border border-slate-800 rounded-lg p-5">
                <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 mb-2 font-display uppercase tracking-wider">
                  <span className="text-cyan-400 text-sm">🛎</span> Как работает симуляция?
                </h4>
                <p className="text-3xs text-slate-400 leading-relaxed space-y-1">
                  Магазин работает с <strong>08:00 до 22:00</strong>. Трафик покупателей распределяется во времени согласно выбранному закону распределения (в часы-пик наплыв максимален). Покупатели подходят к открытым кассовым линиям, выгружают товары на забойную ленту, и кассир рассчитывает их одного за другим. Покупатели очень не любят долго ждать: их шкала терпения ⌛ медленно падает. Кассиры-герои устают, совершают человеческие ошибки, требуя вызова администратора Галина, ускоряются при росте опыта и делятся с вами чаевыми!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'heroes' && (
            <HeroesGuild
              cashiers={cashiers}
              onUnlockCashier={handleUnlockCashier}
              onAssignCashier={handleAssignCashier}
              onUpgradeCashier={handleUpgradeCashier}
              onCoffeeCashier={handleCoffeeCashier}
              onToggleRestCashier={handleToggleRestCashier}
              onManualResetError={handleManualResetError}
              coins={coins}
              config={config}
            />
          )}

          {activeTab === 'analytics' && (
            <StatsPanel
              stats={stats}
              config={config}
              activeRegistersCount={activeRegistersCount}
              avgItemsPerCustomer={avgItemsPerCustomer}
              simulationTicks={ticks}
            />
          )}

        </section>

        {/* RIGHT COLUMN: REUSABLE SIDEBAR WITH SIMULATION ADJUSTMENTS & LOGS */}
        <aside className="lg:col-span-4 space-y-6">
          <SimulationControls
            config={config}
            onChangeConfig={(newConfig) => setConfig(prev => ({ ...prev, ...newConfig }))}
            speed={speed}
            onChangeSpeed={setSpeed}
            onSpawnCustomer={handleManualSpawn}
            onSpawnRushWave={handleRushWaveSpawn}
            onResetSimulation={handleResetSimulation}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            coins={coins}
            activeHourLabel={formatTime(ticks)}
          />

          {/* REAL-TIME EVENT STREAM LOGS (highly aesthetic, mimicking a terminal readout but beautifully simplified) */}
          <div className="bg-[#14151a] text-slate-300 border border-slate-800 rounded-lg p-4 shadow">
            <h3 className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between font-display">
              <span>Хронология событий</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse border border-cyan-300" />
            </h3>

            {logs.length === 0 ? (
              <div className="text-center py-6 text-3xs text-slate-600">
                Лента молчит. Начните симуляцию для генерации событий.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {logs.map((log) => {
                  let alertColor = 'text-slate-300';
                  if (log.type === 'success') alertColor = 'text-cyan-400';
                  if (log.type === 'warning') alertColor = 'text-amber-400';
                  if (log.type === 'error') alertColor = 'text-red-400';
                  
                  return (
                    <div key={log.id} className="text-3xs leading-relaxed flex items-start gap-1.5 font-mono border-b border-slate-900 pb-1.5 last:border-0">
                      <span className="text-slate-600 shrink-0 font-sans">[{formatTime(ticks)}]</span>
                      <span className={alertColor}>{log.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* FOOTER COOPERATING WITH SYSTEM STANDARDS */}
      <footer className="bg-[#0A0A0C] border-t border-slate-800 mt-12 py-6 text-center text-3xs text-slate-500 font-mono tracking-wider">
        Система математического моделирования СМО Магазинников • Разработано по стандартам теории очередей Кендалла • © 2026
      </footer>
    </div>
  );
}
