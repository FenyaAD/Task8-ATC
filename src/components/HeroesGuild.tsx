/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cashier, SimulationConfig } from '../types';
import { CashierCard } from './CashierCard';
import { Users, Award, ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';

interface HeroesGuildProps {
  cashiers: Cashier[];
  onUnlockCashier: (id: string, cost: number) => void;
  onAssignCashier: (cashierId: string, registerIndex: number | null) => void;
  onUpgradeCashier: (id: string) => void;
  onCoffeeCashier: (id: string) => void;
  onToggleRestCashier: (id: string) => void;
  onManualResetError?: (id: string) => void;
  coins: number;
  config: SimulationConfig;
}

export const HeroesGuild: React.FC<HeroesGuildProps> = ({
  cashiers,
  onUnlockCashier,
  onAssignCashier,
  onUpgradeCashier,
  onCoffeeCashier,
  onToggleRestCashier,
  onManualResetError,
  coins,
  config,
}) => {
  return (
    <div className="space-y-6">
      {/* Guild Header Intro */}
      <div className="bg-[#14151a] text-slate-250 rounded-lg p-5 border border-slate-800 shadow relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-cyan-400 font-display">
            <Users className="w-4 h-4 text-cyan-400" />
            Гильдия кассиров-героев • Управление персоналом
          </h2>
          <p className="text-3xs text-slate-400 mt-1 max-w-xl">
            Наймите профессиональных кассиров-героев с экстремальными характеристиками и уникальными суперспособностями (талантами). Повышайте уровень героев за опыт, давайте им кофе для бодрости и назначайте на кассовые посты!
          </p>
        </div>

        {/* Total store coins panel */}
        <div className="bg-[#0A0A0C] border border-slate-800 p-3 rounded-sm flex items-center gap-2.5 shrink-0">
          <div className="bg-amber-500/10 p-2 rounded-sm text-amber-500 font-bold block text-sm">💰</div>
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Ваш бюджет</div>
            <div className="text-sm font-black font-mono text-emerald-400">${coins.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Primary cashiers list cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cashiers.map((cashier) => {
          return (
            <div key={cashier.id} className="relative group">
              {/* LOCKET OVERLAY FOR LOCKED CHARACTERS */}
              {cashier.isLocked ? (
                <div className="absolute inset-0 bg-[#0F1014]/95 rounded-lg border border-slate-800 flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
                  <div className="w-12 h-12 bg-[#0A0A0C] border border-slate-800 rounded-full flex items-center justify-center text-xl shadow mb-2">
                    🔒
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-150 font-display">{cashier.name}</h4>
                  <p className="text-3xs text-slate-500 mt-1 mb-4 uppercase tracking-widest">{cashier.title}</p>
                  
                  {/* Lock features overview */}
                  <div className="text-[10px] bg-[#0A0A0C] border border-slate-850 rounded-sm p-2.5 text-slate-400 max-w-xs space-y-1 mb-4">
                    <span className="font-bold text-cyan-400 block font-display">Суперсила: {cashier.specialtyName}</span>
                    <span className="leading-normal block text-3xs text-slate-500">{cashier.specialtyDesc}</span>
                  </div>

                  <button
                    onClick={() => onUnlockCashier(cashier.id, cashier.costToUnlock)}
                    disabled={coins < cashier.costToUnlock}
                    className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-sm text-3xs uppercase tracking-wider transition cursor-pointer shadow"
                  >
                    Завербовать • ${cashier.costToUnlock}
                  </button>
                  {coins < cashier.costToUnlock && (
                    <span className="text-[9px] text-red-500 mt-1.5 font-bold font-mono">Недостаточно монет!</span>
                  )}
                </div>
              ) : null}

              {/* CARD CONTAINER FOR UNLOCKED CHARACTERS */}
              <div className="flex flex-col h-full bg-[#14151a] rounded-lg border border-slate-800 overflow-hidden">
                <div className="flex-1">
                  <CashierCard
                    cashier={cashier}
                    onUpgrade={onUpgradeCashier}
                    onCoffee={onCoffeeCashier}
                    onToggleRest={onToggleRestCashier}
                    onManualResetError={onManualResetError}
                    coins={coins}
                    assignedRegister={cashier.assignedRegisterId}
                  />
                </div>

                {/* Assignment controller footer underneath the core metadata card */}
                {!cashier.isLocked && (
                  <div className="bg-[#0F1014] px-4 py-3 rounded-b-lg border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-3xs">
                    <div className="font-semibold text-slate-400 uppercase tracking-widest font-mono">Назначить на пост:</div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={cashier.assignedRegisterId ?? -1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onAssignCashier(cashier.id, val === -1 ? null : val);
                        }}
                        className="p-1 px-2 text-[10px] font-bold text-slate-300 bg-[#14151a] border border-slate-800 rounded-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 flex-1 max-w-[150px] font-mono"
                      >
                        <option value={-1}>🏖️ В резерве</option>
                        {Array.from({ length: config.totalRegisters }).map((_, rIdx) => {
                          const isRegOpen = config.openRegisters[rIdx];
                          return (
                            <option key={rIdx} value={rIdx}>
                              Касса #0{rIdx + 1} {isRegOpen ? '(Активна)' : '(Закрыта)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Guide Note */}
      <div className="bg-[#14151a] border border-cyan-900/40 rounded-lg p-4 flex gap-3 text-xs text-cyan-400 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-1 uppercase tracking-wider font-display text-[11px]">💡 Правила расстановки персонала:</span>
          <ul className="list-disc pl-4 space-y-1 text-3xs text-slate-400 leading-normal">
            <li>Крайне важно иметь кассиров на ВСЕХ открытых кассах. Открытая касса без назначенного кассира накапливает клиентов, но товары на ней не сканируются.</li>
            <li>Если у кассира 0% бодрости (устал), он обслуживает в <strong>3 раза медленнее</strong>. Вовремя отправляйте их на перерыв или перезаряжайте бодрящим напитком.</li>
            <li>Любое закрытие кассы автоматически распределит скопившихся на ленте людей в оставшиеся активные очереди.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
