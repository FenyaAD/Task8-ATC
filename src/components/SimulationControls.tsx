/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationConfig, ArrivalPatternType, QueueAlgorithmType } from '../types';
import { Play, Pause, FastForward, UserPlus, Users, Settings, Zap, Compass, RefreshCw, Layers } from 'lucide-react';
import { HOURLY_TIMELINE } from '../cashiersData';

interface SimulationControlsProps {
  config: SimulationConfig;
  onChangeConfig: (config: Partial<SimulationConfig>) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onSpawnCustomer: () => void;
  onSpawnRushWave: () => void;
  onResetSimulation: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  coins: number;
  activeHourLabel: string;
}

const PATTERNS_INFO = [
  {
    key: 'constant' as ArrivalPatternType,
    name: 'Равномерный',
    desc: 'Равный поток в течение всего дня. Удобно для калибровки и чистых замеров ТМО.',
    icon: '📊',
  },
  {
    key: 'rush-hours' as ArrivalPatternType,
    name: 'Часы Пик',
    desc: 'Две волны наплыва: небольшой рост в обед (12:00-13:00) и массивный пик вечером (17:30-19:00).',
    icon: '🌇',
  },
  {
    key: 'lunch-and-evening' as ArrivalPatternType,
    name: 'Обед и ужин',
    desc: 'Резкие спайки во время обеденного перерыва и сразу после окончания рабочего дня.',
    icon: '🍕',
  },
  {
    key: 'silent-night' as ArrivalPatternType,
    name: 'Глухой вечер',
    desc: 'Пустое утро, медленный разгон днем и гипер-наплыв перед закрытием магазина.',
    icon: '🌙',
  },
  {
    key: 'poisson-random' as ArrivalPatternType,
    name: 'Случайный Пуассон',
    desc: 'Входящие покупатели поступают случайным образом с постоянным математическим ожиданием.',
    icon: '🎲',
  },
];

const ALGORITHMS_INFO = [
  {
    key: 'shortest-queue' as QueueAlgorithmType,
    name: 'Короткая очередь',
    desc: 'Покупатель выбирает кассу с наименьшим числом людей в очереди на данный момент. Самое популярное поведение.',
  },
  {
    key: 'smart-time' as QueueAlgorithmType,
    name: 'Умная оценка времени',
    desc: 'Интеллектуальный выбор: покупатель оценивает количество товаров в корзинах очереди и базовую скорость кассиров, выбирая быстрейших.',
  },
  {
    key: 'random' as QueueAlgorithmType,
    name: 'Случайный выбор',
    desc: 'Хаотичный слепой выбор. Покупатели встают в случайную доступную очередь, не анализируя соседей.',
  },
  {
    key: 'single-snake' as QueueAlgorithmType,
    name: 'Единая змейка (Эл. Очередь)',
    desc: 'Классика теории очередей: одна общая очередь. Свободный кассир берет первого в очереди. Исключает простои!',
  },
  {
    key: 'express-limit' as QueueAlgorithmType,
    name: 'Экспресс-касса',
    desc: 'Последняя касса обслуживает строго до 5 товаров. Остальные кассы — общие. Спасает быстрых покупателей.',
  },
];

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  config,
  onChangeConfig,
  speed,
  onChangeSpeed,
  onSpawnCustomer,
  onSpawnRushWave,
  onResetSimulation,
  isPaused,
  onTogglePause,
  coins,
  activeHourLabel,
}) => {
  const toggleRegister = (index: number) => {
    const newOpen = [...config.openRegisters];
    // Keep at least one register open
    const openCount = newOpen.filter(Boolean).length;
    if (newOpen[index] && openCount <= 1) return;
    
    newOpen[index] = !newOpen[index];
    onChangeConfig({ openRegisters: newOpen });
  };

  const activePatternWeights = HOURLY_TIMELINE[config.arrivalPattern] || [];

  return (
    <div className="space-y-6">
      {/* Adjust Variables Section */}
      <div className="bg-[#14151a] rounded-lg p-5 border border-slate-800 space-y-5">
        <h3 className="font-bold text-slate-200 text-xs tracking-wider flex items-center gap-1.5 uppercase border-b border-slate-800 pb-3 font-display">
          <Layers className="w-4 h-4 text-cyan-500" />
          Параметры потока & Очередей
        </h3>

        {/* 1. Arrival Rate / Density Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300 text-3xs uppercase tracking-wider flex items-center gap-1 font-mono">
              📈 Интенсивность потока
            </span>
            <span className="text-cyan-400 font-mono font-bold">x{config.arrivalIntensity}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={config.arrivalIntensity}
            onChange={(e) => onChangeConfig({ arrivalIntensity: parseInt(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-[#0A0A0C] rounded-lg cursor-pointer border border-slate-800"
          />
          <p className="text-[10px] text-slate-500 leading-normal">
            Интенсивность спавна клиентов. На значении 10 поток покупателей превращается в конвейер.
          </p>
        </div>

        {/* 2. Customer Patience Multiplier */}
        <div className="space-y-2 pt-1 border-t border-slate-900">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300 text-3xs uppercase tracking-wider flex items-center gap-1 font-mono">
              ⏳ Множитель терпения
            </span>
            <span className="text-amber-400 font-mono font-bold">x{config.patienceFactor}</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="2.5"
            step="0.1"
            value={config.patienceFactor}
            onChange={(e) => onChangeConfig({ patienceFactor: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-[#0A0A0C] rounded-lg cursor-pointer border border-slate-800"
          />
          <p className="text-[10px] text-slate-500 leading-normal">
            Как долго гости готовы стоять в очередях до ухода из магазина без оплаты покупок.
          </p>
        </div>

        {/* 3. Open Registers Toggle buttons */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <span className="font-semibold text-3xs uppercase tracking-wider text-slate-300 block mb-2 font-mono">
            🏪 Работа кассовых линий
          </span>
          <div className="grid grid-cols-5 gap-2">
            {config.openRegisters.map((isOpen, idx) => (
              <button
                key={idx}
                onClick={() => toggleRegister(idx)}
                className={`py-1.5 px-1 rounded-sm border text-center font-bold text-3xs uppercase tracking-tight transition duration-150 cursor-pointer ${
                  isOpen
                    ? 'bg-cyan-950/30 text-cyan-400 border-cyan-800/80 shadow'
                    : 'bg-slate-900/10 text-slate-600 border-slate-805 hover:bg-slate-900/40 hover:text-slate-400'
                }`}
              >
                <div>К #{idx + 1}</div>
                <div className="text-[8px] opacity-75 mt-0.5">{isOpen ? 'Акт' : 'Деакт'}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Queue Algorithm Picker */}
      <div className="bg-[#14151a] rounded-lg p-5 border border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-200 text-xs tracking-wider flex items-center gap-1.5 uppercase border-b border-slate-800 pb-3 font-display">
          <Compass className="w-4 h-4 text-cyan-500" />
          Алгоритмы поведения в очереди
        </h3>
        <div className="space-y-2">
          {ALGORITHMS_INFO.map((alg) => {
            const isSelected = config.queueAlgorithm === alg.key;
            return (
              <label
                key={alg.key}
                onClick={() => onChangeConfig({ queueAlgorithm: alg.key })}
                className={`p-3 rounded-sm border flex flex-col cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-cyan-800 bg-cyan-950/10 shadow shadow-cyan-950/20'
                    : 'border-slate-800 bg-[#0A0A0C] hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="queueAlgorithm"
                    checked={isSelected}
                    readOnly
                    className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className={`text-xs font-bold leading-none ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {alg.name}
                  </span>
                  {alg.key === 'single-snake' && (
                    <span className="text-[8px] font-bold text-cyan-400 bg-cyan-900/20 px-1 py-0.2 rounded border border-cyan-800 animate-pulse">
                      ОПТИМАЛЬНО
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 pl-5.5 leading-relaxed">{alg.desc}</p>
                
                {alg.key === 'express-limit' && isSelected && (
                  <div className="mt-2.5 pl-5.5 flex items-center gap-2 border-t border-slate-800 pt-2 text-2xs animate-fadeIn">
                    <span className="text-slate-450 font-semibold text-[10px]">Лимит товаров:</span>
                    <select
                      value={config.expressMaxItems}
                      onChange={(e) => onChangeConfig({ expressMaxItems: parseInt(e.target.value) })}
                      className="border border-slate-750 rounded p-0.5 text-[11px] font-bold text-cyan-400 bg-slate-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[3, 4, 5, 8, 10].map(v => (
                        <option key={v} value={v}>{v} товаров</option>
                      ))}
                    </select>
                    <span className="text-slate-500 text-[10px] font-mono">Касса №5 станет экспресс</span>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Arrival Wave law of distribution */}
      <div className="bg-[#14151a] rounded-lg p-5 border border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-200 text-xs tracking-wider flex items-center gap-1.5 uppercase border-b border-slate-800 pb-3 font-display">
          <Zap className="w-4 h-4 text-amber-500" />
          Законы Распределения Потока
        </h3>
        <div className="space-y-2">
          {PATTERNS_INFO.map((pat) => {
            const isSelected = config.arrivalPattern === pat.key;
            return (
              <label
                key={pat.key}
                onClick={() => onChangeConfig({ arrivalPattern: pat.key })}
                className={`p-3 rounded-sm border flex items-start gap-2.5 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-amber-800 bg-amber-950/10 shadow shadow-amber-950/10'
                    : 'border-slate-800 bg-[#0A0A0C] hover:bg-slate-900'
                }`}
              >
                <div className="text-base pt-0.5">{pat.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="arrivalPattern"
                      checked={isSelected}
                      readOnly
                      className="accent-amber-500 w-3.5 h-3.5"
                    />
                    <span className={`text-xs font-bold leading-none ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                      {pat.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 pl-5.5 leading-relaxed">{pat.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Tiny distribution visual chart */}
        <div className="mt-4 bg-[#0A0A0C] rounded-sm p-3 border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block mb-2 font-mono">График интенсивности (08:00 - 22:00)</span>
          <div className="flex items-end justify-between h-14 pt-2">
            {activePatternWeights.map((weight, idx) => {
              const hourLabel = 8 + idx;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative cursor-help">
                  <div 
                    className={`w-full rounded-t transition-all duration-150 ${
                      isSelectedHour(hourLabel) 
                        ? 'bg-amber-500 hover:bg-amber-400' 
                        : 'bg-slate-800 group-hover:bg-slate-700'
                    }`}
                    style={{ height: `${weight * 16}px` }}
                  />
                  <span className="text-[8px] text-slate-500 mt-1 font-mono scale-90">{hourLabel}</span>
                  {/* Tooltip */}
                  <div className="absolute hidden group-hover:block bottom-10 bg-[#0F1014] text-slate-200 text-3xs rounded border border-slate-800 p-2 whitespace-nowrap z-30 font-semibold shadow">
                    Время {hourLabel}:00 <br /> Множитель: {weight.toFixed(1)}x
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  function isSelectedHour(h: number) {
    const rawActiveHour = activeHourLabel.split(':')[0];
    const num = parseInt(rawActiveHour, 10);
    return num === h;
  }
};
