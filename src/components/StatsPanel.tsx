/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationStats, SimulationConfig } from '../types';
import { TrendingUp, Award, DollarSign, Activity, Sparkles, UserX, Clock, Percent } from 'lucide-react';

interface StatsPanelProps {
  stats: SimulationStats;
  config: SimulationConfig;
  activeRegistersCount: number;
  avgItemsPerCustomer: number;
  simulationTicks: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  config,
  activeRegistersCount,
  avgItemsPerCustomer,
  simulationTicks,
}) => {
  // 1. Compute standard Queueing Theory parameters:
  const simSeconds = Math.max(1, simulationTicks);
  const simMinutes = simSeconds / 60; // our clock time minutes

  // lambda: Arrival intensity (customers arrived per minute)
  const lambda = stats.totalCustomersSpawned / simMinutes || 0;

  // mu: Average service rate per cashier (customers served per minute)
  // Let's assume average cashier scans 1.3 items/sec, and average customer has 10 items.
  // Then a cashier services 1.3 * 60 / 10 = 7.8 customers/minute.
  // We calculate empirical service rate:
  const empiricalMu = stats.totalCustomersServed > 0
    ? (stats.totalCustomersServed / (simMinutes * Math.max(1, activeRegistersCount)))
    : 1.2; // default guess if they haven't served yet

  // System loading coefficient (rho) = lambda / (c * mu)
  const c = Math.max(1, activeRegistersCount);
  const rho = lambda / (c * empiricalMu) || 0;

  // Average wait time in simulated seconds/ticks
  const avgWait = stats.avgWaitTime; 

  // Service Level = (served / total) * 100
  const totalCompleted = stats.totalCustomersServed + stats.totalCustomersAngryLeft;
  const serviceLevel = totalCompleted > 0
    ? (stats.totalCustomersServed / totalCompleted) * 100
    : 100;

  const totalArrived = stats.totalCustomersSpawned;
  const leftRatio = totalArrived > 0
    ? (stats.totalCustomersAngryLeft / totalArrived) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. Live Indicators Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-[#14151a] border border-slate-800 rounded-lg p-4 shadow-sm text-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider font-bold font-mono">
            <span>Выручка Монетами</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5 text-xl font-black text-emerald-400 font-mono">
            ${(stats.totalRevenue).toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Заработано за обслуживание</p>
          <div className="absolute right-0 bottom-0 text-7xl font-bold opacity-[0.02] text-emerald-500 select-none pointer-events-none">
            $
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#14151a] border border-slate-800 rounded-lg p-4 shadow-sm text-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider font-bold font-mono">
            <span>Накопленные чаевые</span>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="mt-2.5 text-xl font-black text-yellow-500 font-mono">
            ${(stats.totalTips).toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Зависит от дружелюбия героев</span>
          <div className="absolute right-0 bottom-0 text-7xl font-bold opacity-[0.02] text-yellow-500 select-none pointer-events-none">
            ⭐
          </div>
        </div>

        {/* Wait Time */}
        <div className="bg-[#14151a] border border-slate-800 rounded-lg p-4 shadow-sm text-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider font-bold font-mono">
            <span>Ср. Время ожидания</span>
            <Clock className="w-4 h-4 text-cyan-450" />
          </div>
          <div className="mt-2.5 text-xl font-black font-mono text-cyan-450">
            {Math.round(avgWait)} <span className="text-[11px] font-semibold">сек</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Время до начала расчёта</p>
          <div className="absolute right-0 bottom-0 text-7xl font-bold opacity-[0.02] text-cyan-400 select-none pointer-events-none">
            ⏱
          </div>
        </div>

        {/* Service Level */}
        <div className="bg-[#14151a] border border-slate-800 rounded-lg p-4 shadow-sm text-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider font-bold font-mono">
            <span>Уровень сервиса</span>
            <Percent className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2.5 text-xl font-black font-mono text-violet-400">
            {serviceLevel.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Отношение обслуженных к ушедшим</p>
          <div className="absolute right-0 bottom-0 text-7xl font-bold opacity-[0.02] text-violet-500 select-none pointer-events-none">
            %
          </div>
        </div>
      </div>

      {/* 2. Analytical Breakdown & Formulas of Queueing Theory */}
      <div className="bg-[#14151a] rounded-lg p-5 border border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-200 text-xs tracking-wider flex items-center gap-1.5 uppercase border-b border-slate-800 pb-3 mb-4 font-display">
          <Activity className="w-4 h-4 text-cyan-500" />
          Показатели Теории Массового Обслуживания (ТМО)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scientific Formulas */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-2 font-mono">
              📊 Математическое описание системы
            </span>

            {/* Formula 1: Lambda */}
            <div className="bg-[#0A0A0C] p-3.5 rounded-sm border border-slate-850">
              <div className="flex justify-between items-center mb-1 text-2xs font-mono uppercase text-slate-400">
                <span>Интенсивность входа (&lambda;):</span>
                <span className="font-bold text-cyan-400">{lambda.toFixed(2)} кл/мин</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Показывает, сколько покупателей поступает в систему ТМО за единицу времени.
                Рассчитывается как <code className="bg-slate-900 border border-slate-800 px-1 py-0.2 rounded font-mono text-[9px] text-slate-350">TotalArrivals / SimDuration</code>.
              </p>
            </div>

            {/* Formula 2: Mu */}
            <div className="bg-[#0A0A0C] p-3.5 rounded-sm border border-slate-850">
              <div className="flex justify-between items-center mb-1 text-2xs font-mono uppercase text-slate-400">
                <span>Интенсивность работы (&mu;):</span>
                <span className="font-bold text-violet-400">~{empiricalMu.toFixed(2)} кл/мин</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Среднее быстродействие одного активного поста (кассы) в минуту. Зависит от объема корзины и мастерства нанятых кассиров.
              </p>
            </div>

            {/* Formula 3: Rho */}
            <div className="bg-[#0A0A0C] p-3.5 rounded-sm border border-slate-850">
              <div className="flex justify-between items-center mb-1 text-2xs font-mono uppercase text-slate-400">
                <span>Загрузка сети (&rho; = &lambda; / c&mu;):</span>
                <span className={`font-mono font-black ${
                  rho > 1 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}>
                  {rho.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                Коэффициент запаса прочности. Сравнивает общую скорость притока клиентов со скоростью всех <code className="font-bold text-slate-300 font-mono">{c}</code> активных кассиров.
              </p>

              {/* Status report based on rho */}
              <div className={`p-2 rounded-sm text-[10px] font-semibold ${
                rho === 0 
                  ? 'bg-slate-900/40 text-slate-500 border border-slate-800/60'
                  : rho < 0.6
                    ? 'bg-emerald-950/25 text-emerald-400 border border-emerald-900/30'
                    : rho <= 0.95
                      ? 'bg-amber-950/25 text-amber-400 border border-amber-900/30'
                      : 'bg-red-955 text-red-400 border border-red-900/30 animate-pulse'
              }`}>
                {rho === 0 ? (
                  'Система полностью простаивает.'
                ) : rho < 0.6 ? (
                  '🟢 Низкая нагрузка: Очередей нет, кассиры простаивают без дела. Бизнес терпит скрытые расходы на содержание персонала!'
                ) : rho <= 0.98 ? (
                  '🟡 Оптимальная ТМО: Идеальный баланс. Кассиры загружены стабильно, клиенты ожидают минимальное время.'
                ) : (
                  '🔴 ПЕРЕГРУЗКА: Интенсивность прибытия превосходит пропускную способность. Очереди критически забиты, люди уходят злыми!'
                )}
              </div>
            </div>
          </div>

          {/* Graphical representation / Table details */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-2 font-mono">
              👥 Поток покупателей в деталях
            </span>

            <div className="border border-slate-800 rounded-sm overflow-hidden text-2xs font-mono">
              <div className="bg-[#0A0A0C] p-2.5 font-bold border-b border-slate-800 grid grid-cols-2 text-slate-350">
                <span>Параметр системы</span>
                <span className="text-right">Значение</span>
              </div>
              <div className="divide-y divide-slate-850 bg-[#0F1014]/60">
                <div className="p-2.5 grid grid-cols-2 text-slate-400 border-b border-slate-850/40">
                  <span>Заспавнено гостей</span>
                  <span className="text-right font-bold text-slate-200">{stats.totalCustomersSpawned}</span>
                </div>
                <div className="p-2.5 grid grid-cols-2 text-slate-400 border-b border-slate-850/40">
                  <span>Успешно оплачено</span>
                  <span className="text-right font-bold text-emerald-400">{stats.totalCustomersServed}</span>
                </div>
                <div className="p-2.5 grid grid-cols-2 text-slate-400 border-b border-slate-850/40">
                  <span>Ушли в гневе (Отказ)</span>
                  <span className="text-right font-bold text-red-400 flex justify-end items-center gap-1">
                    <UserX className="w-3.5 h-3.5 text-red-500" />
                    {stats.totalCustomersAngryLeft} человек ({leftRatio.toFixed(1)}%)
                  </span>
                </div>
                <div className="p-2.5 grid grid-cols-2 text-slate-400 border-b border-slate-850/40">
                  <span>Ожидают на данный момент</span>
                  <span className="text-right font-bold text-cyan-400">{stats.currentInQueue}</span>
                </div>
                <div className="p-2.5 grid grid-cols-2 text-slate-400 border-b border-slate-850/40">
                  <span>Ср. корзина покупателя</span>
                  <span className="text-right font-bold text-slate-200">{avgItemsPerCustomer.toFixed(1)} товаров</span>
                </div>
                <div className="p-2.5 grid grid-cols-2 text-slate-400">
                  <span>Активные кассовые посты</span>
                  <span className="text-right font-bold text-slate-200">{activeRegistersCount} / {config.totalRegisters}</span>
                </div>
              </div>
            </div>

            {/* Scientific theory note */}
            <div className="bg-cyan-950/20 border border-cyan-900/30 p-4 rounded-sm text-cyan-400 shadow-sm leading-normal">
              <span className="font-bold block text-[11px] mb-1 uppercase tracking-wider font-display">
                💡 Теория очередей: Модель Кендалла
              </span>
              <p className="text-3xs text-slate-450 leading-relaxed">
                В зависимости от выбранного вами распределения наш магазин моделирует систему вида{' '}
                <strong className="text-cyan-400 font-mono">M/M/{c}</strong> (Пуассоновский поток, экспоненциальная скорость, несколько кассиров) или{' '}
                <strong className="text-cyan-400 font-mono">G/G/{c}</strong> с отказами. Внедрение{' '}
                <strong>«Единой змейки»</strong> позволяет снизить дисперсию времени ожидания до нуля, гарантируя максимальный уровень удовлетворенности!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
