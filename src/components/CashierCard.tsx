/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cashier } from '../types';
import { Zap, Coffee, Heart, AlertTriangle, Play, Pause, Award, HelpCircle } from 'lucide-react';

interface CashierCardProps {
  cashier: Cashier;
  onUpgrade?: (id: string) => void;
  onCoffee?: (id: string) => void;
  onToggleRest?: (id: string) => void;
  onManualResetError?: (id: string) => void;
  coins: number;
  assignedRegister?: number | null;
}

export const CashierCard: React.FC<CashierCardProps> = ({
  cashier,
  onUpgrade,
  onCoffee,
  onToggleRest,
  onManualResetError,
  coins,
  assignedRegister,
}) => {
  const isExhausted = cashier.stamina <= 0;
  const isStressed = cashier.stamina < 30 && cashier.stamina > 0;
  const progressToNextLevel = (cashier.xp / cashier.xpNeeded) * 100;
  const upgradeCost = Math.round(50 * Math.pow(1.6, cashier.level - 1));
  const coffeeCost = 25;

  let speedMultiplier = 1.0;
  if (cashier.specialtyKey === 'meteor_scan' && cashier.stamina > 60) {
    speedMultiplier = 1.4; // Турбо-сканирование
  } else if (cashier.stamina <= 0) {
    speedMultiplier = 0.3; // Устал вусмерть
  } else if (cashier.stamina < 40) {
    speedMultiplier = 0.7; // Подустал
  }

  const effectiveSpeed = (cashier.baseSpeed * (1 + (cashier.level - 1) * 0.1) * speedMultiplier).toFixed(2);
  const statusColor = () => {
    switch (cashier.status) {
      case 'idle':
        return 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40';
      case 'scanning':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 animate-pulse';
      case 'resting':
        return 'bg-amber-950/40 text-amber-400 border-amber-900/40';
      case 'stuck_error':
        return 'bg-red-950/40 text-red-500 border-red-800/40 animate-pulse';
    }
  };

  const statusLabel = () => {
    switch (cashier.status) {
      case 'idle': return 'Ожидание';
      case 'scanning': return 'Активен';
      case 'resting': return 'Перерыв';
      case 'stuck_error': return 'Код Ошибки';
    }
  };

  return (
    <div 
      className={`border rounded-lg p-4 bg-[#14151a] border-slate-800 shadow-sm flex flex-col justify-between transition-all duration-300 ${
        cashier.status === 'stuck_error' ? 'ring-1 ring-red-500 bg-red-950/30' : ''
      } ${cashier.status === 'resting' ? 'bg-[#0F1014]' : ''}`}
    >
      <div>
        {/* Cashier Name and Badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow-md ${cashier.avatarColor}`}>
              {cashier.name.substring(0, 2)}
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-tight leading-tight pr-1 flex items-center gap-1 font-display">
                {cashier.name}
              </h4>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cashier.title}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-sm border ${statusColor()}`}>
              {statusLabel()}
            </span>
            {assignedRegister !== undefined && assignedRegister !== null && (
              <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-1.5 py-0.2 rounded-sm font-mono">
                LANE 0{assignedRegister + 1}
              </span>
            )}
            {(assignedRegister === undefined || assignedRegister === null) && (
              <span className="text-[9px] text-slate-500 font-mono">В резерве</span>
            )}
          </div>
        </div>

        {/* Level and XP */}
        <div className="mt-3.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-mono">
            <div className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold text-slate-300">Уровень {cashier.level}</span>
            </div>
            <span>{Math.round(cashier.xp)} / {cashier.xpNeeded} XP</span>
          </div>
          <div className="w-full h-1 bg-[#0A0A0C] rounded-full overflow-hidden border border-slate-850">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, progressToNextLevel)}%` }}
            />
          </div>
        </div>

        {/* Story details / Specialty */}
        <div className="mt-4 text-[10px] bg-[#0A0A0C] p-3 rounded-sm border border-slate-850 space-y-2">
          <div>
            <span className="font-bold text-cyan-400 block text-[11px] flex items-center gap-1 font-display uppercase tracking-wider">
              ⚡ Пассивный талант: {cashier.specialtyName}
            </span>
            <span className="text-slate-400 leading-normal block mt-1 text-3xs">{cashier.specialtyDesc}</span>
          </div>
          <div className="border-t border-slate-800/85 pt-2 text-slate-500 italic text-3xs leading-relaxed">
            &ldquo;{cashier.traitDesc}&rdquo;
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#0A0A0C] p-2 rounded-sm border border-slate-850 text-center">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold font-mono">Скорость ТМО</div>
            <div className="text-sm font-bold text-slate-300 flex justify-center items-center gap-1 mt-1 font-mono">
              {effectiveSpeed} <span className="text-[9px] font-normal text-slate-500">шт/с</span>
            </div>
          </div>
          <div className="bg-[#0A0A0C] p-2 rounded-sm border border-slate-850 text-center">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold font-mono">Внимательность</div>
            <div className="text-sm font-bold text-slate-300 mt-1 font-mono">
              {((1 - cashier.errorRate) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Stamina Meter */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-3xs mb-1 font-mono uppercase tracking-wider">
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <Zap className={`w-3 h-3 ${isExhausted ? 'text-red-500 animate-pulse' : isStressed ? 'text-amber-500' : 'text-cyan-400'}`} />
              Выносливость: {Math.round(cashier.stamina)}%
            </span>
            {isExhausted && <span className="text-red-500 font-bold animate-pulse">УСТАЛ!</span>}
            {isStressed && <span className="text-amber-500 font-semibold">Устаёт</span>}
          </div>
          <div className="w-full h-1.5 bg-[#0A0A0C] rounded-full overflow-hidden border border-slate-850">
            <div 
              className={`h-full transition-all duration-150 rounded-full ${
                isExhausted 
                  ? 'bg-red-500 animate-pulse' 
                  : isStressed 
                    ? 'bg-amber-500' 
                    : 'bg-cyan-500'
              }`}
              style={{ width: `${cashier.stamina}%` }}
            />
          </div>
        </div>

        {/* Financial Stats in Mini */}
        <div className="mt-3.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-850 pt-2.5 font-mono">
          <span>Служб: <strong>{cashier.totalServed}</strong></span>
          <span>Сканировано: <strong>{cashier.totalItemsScanned}</strong></span>
          <span>Чаевые: <span className="text-emerald-400 font-bold">${cashier.tipsEarned.toFixed(2)}</span></span>
        </div>
      </div>

      {/* Hero Control Actions */}
      <div className="mt-4 pt-3.5 border-t border-slate-850 space-y-2">
        {cashier.status === 'stuck_error' && onManualResetError && (
          <button
            onClick={() => onManualResetError(cashier.id)}
            className="w-full py-2 bg-red-650 hover:bg-red-600 text-white font-bold rounded-sm text-3xs uppercase tracking-wider transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            <AlertTriangle className="w-4 h-4 animate-pulse text-white" />
            <span>Сбросить Ступор!</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Rest Button */}
          {onToggleRest && (
            <button
              onClick={() => onToggleRest(cashier.id)}
              disabled={cashier.specialtyKey === 'no_fatigue'}
              className={`py-1.5 rounded-sm font-bold text-3xs uppercase tracking-wider border transition duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                cashier.status === 'resting'
                  ? 'bg-amber-950/40 hover:bg-amber-900/40 text-amber-400 border-amber-900/50'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-[#0F1014]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={cashier.specialtyKey === 'no_fatigue' ? 'Робот не знает усталости!' : 'Отправить отдыхать для восполнения энергии'}
            >
              {cashier.status === 'resting' ? (
                <>
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Вернуть</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-400" />
                  <span>Перерыв</span>
                </>
              )}
            </button>
          )}

          {/* Coffee Button */}
          {onCoffee && (
            <button
              onClick={() => onCoffee(cashier.id)}
              disabled={cashier.stamina >= 80 || coins < coffeeCost || cashier.specialtyKey === 'no_fatigue'}
              className="py-1.5 rounded-sm font-bold text-3xs uppercase tracking-wider bg-slate-900 hover:bg-[#0F1014] text-amber-400 border border-slate-800 transition duration-150 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Купить кофе за $${coffeeCost} (мгновенно +50 выносливости)`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Кофе (${coffeeCost})</span>
            </button>
          )}
        </div>

        {/* Upgrade Button */}
        {onUpgrade && (
          <button
            onClick={() => onUpgrade(cashier.id)}
            disabled={coins < upgradeCost}
            className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:from-slate-850 disabled:to-slate-850 disabled:text-slate-600 text-slate-100 font-extrabold rounded-sm text-3xs uppercase tracking-wider transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Повысить уровень • ${upgradeCost}</span>
          </button>
        )}
      </div>
    </div>
  );
};
