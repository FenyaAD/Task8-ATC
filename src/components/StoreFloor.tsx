/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Customer, Cashier, SimulationConfig } from '../types';
import { ShoppingBag, Star, AlertCircle, ShoppingCart, Ban, Smile, Meh, Frown, Angry, Sparkles, UserCheck } from 'lucide-react';

interface StoreFloorProps {
  registers: {
    index: number;
    isOpen: boolean;
    cashier: Cashier | null;
    queue: Customer[];
  }[];
  singleSnakeQueue: Customer[];
  config: SimulationConfig;
  onToggleRegister: (index: number) => void;
  onManualResetError: (cashierId: string) => void;
  onCallSpecialty: (cashierId: string) => void;
  onAssignCashierClick?: (registerIndex: number) => void;
}

export const StoreFloor: React.FC<StoreFloorProps> = ({
  registers,
  singleSnakeQueue,
  config,
  onToggleRegister,
  onManualResetError,
  onCallSpecialty,
  onAssignCashierClick,
}) => {
  const getPatienceColor = (patience: number) => {
    if (patience > 70) return 'bg-emerald-500 border-emerald-600';
    if (patience > 35) return 'bg-yellow-500 border-yellow-600';
    return 'bg-red-500 border-red-600 animate-pulse';
  };

  const getPatienceTextColor = (patience: number) => {
    if (patience > 70) return 'text-emerald-600';
    if (patience > 35) return 'text-yellow-600';
    return 'text-red-500 font-bold';
  };

  const getCustomerEmoji = (patience: number) => {
    if (patience > 75) return <Smile className="w-3.5 h-3.5 text-white" />;
    if (patience > 40) return <Meh className="w-3.5 h-3.5 text-white" />;
    if (patience > 15) return <Frown className="w-3.5 h-3.5 text-white animate-pulse" />;
    return <Angry className="w-3.5 h-3.5 text-white animate-bounce" />;
  };

  return (
    <div className="bg-[#0F1014] rounded-lg p-6 border border-slate-800 text-slate-200 shadow-xl relative overflow-hidden">
      {/* Absolute Store Floor Atmosphere Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Магнитно-Тайминг • Active Checkout Lanes
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-mono">
            Клик на кассира активирует способность или сбрасывает ошибку.
          </p>
        </div>
        
        {config.queueAlgorithm === 'single-snake' && (
          <div className="bg-cyan-950/30 text-cyan-400 px-3 py-1.5 rounded-sm border border-cyan-800/40 text-[10px] font-semibold flex items-center gap-1.5 animate-fadeIn">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Единая змейка активирована (ТМО Оптимально)</span>
          </div>
        )}
      </div>

      {/* RENDER HANGER SNAKE QUEUE CONTAINER IF IT IS ACTIVE */}
      {config.queueAlgorithm === 'single-snake' && (
        <div className="mb-6 bg-slate-900/30 rounded-lg p-4 border border-slate-80/80 animate-fadeIn">
          <div className="flex justify-between items-center mb-2.5 text-[10px] font-bold text-slate-400 font-mono">
            <span className="uppercase tracking-wider">Единая Очередь Покупателей ({singleSnakeQueue.length} чел.)</span>
            <span className="text-slate-500 font-normal text-[10px]">
              Свободный кассир берет первого покупателя на обслуживание
            </span>
          </div>
          
          {singleSnakeQueue.length === 0 ? (
            <div className="h-14 border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-600 rounded">
              Очередь пуста. Ждем новых клиентов...
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {singleSnakeQueue.map((cust, idx) => {
                const patiencePercent = Math.max(0, cust.patience);
                const outlineColor = 
                  patiencePercent > 70 ? 'border-emerald-500' :
                  patiencePercent > 35 ? 'border-amber-500' : 'border-red-500 animate-pulse';
                return (
                  <div
                    key={cust.id}
                    className="flex-shrink-0 w-32 bg-[#0A0A0C] border border-slate-800 rounded p-2.5 relative flex flex-col justify-between transition group hover:border-cyan-500/40 hover:bg-slate-900/50 cursor-default"
                  >
                    <div className="absolute -top-2 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-400 shadow z-10">
                      {idx + 1}
                    </div>
                    
                    <div className="text-left mt-1 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full border-2 bg-slate-950 flex items-center justify-center shrink-0 ${outlineColor}`}>
                        <span className="text-xs select-none">
                          {getCustomerEmoji(patiencePercent)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-200 truncate font-display" title={cust.name}>
                          {cust.name.split(' (')[0]}
                        </div>
                        <span className={`text-[9px] font-mono leading-none ${getPatienceTextColor(patiencePercent)}`}>
                          {Math.round(patiencePercent)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono">
                      <span className="flex items-center gap-0.5">
                        <ShoppingBag className="w-3 h-3 text-cyan-500" />
                        <strong>{cust.itemCount} тов.</strong>
                      </span>
                    </div>

                    {/* Patience minibar */}
                    <div className="w-full h-1 bg-slate-905 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full ${getPatienceColor(patiencePercent).split(' ')[0]}`}
                        style={{ width: `${patiencePercent}%` }}
                      />
                    </div>

                    {/* Hover detailed bubble */}
                    <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-950 text-slate-200 border border-slate-800 rounded p-2 text-[9px] leading-relaxed whitespace-nowrap shadow-xl z-30">
                      <div className="font-bold text-cyan-400">{cust.name}</div>
                      <div>Товары в корзине: <strong className="text-white">{cust.itemCount} шт.</strong></div>
                      <div>Ожидание в очереди: <strong className="text-white">{cust.waitingTime} сек.</strong></div>
                      <div>Лимит терпения: <strong className="text-white">{cust.patienceDuration} сек.</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* checkout registers grid floor */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {registers.slice(0, config.totalRegisters).map((reg) => {
          const isExpress = config.queueAlgorithm === 'express-limit' && reg.index === config.expressRegisterIndex;
          const regQueue = reg.queue;
          const activeCustomer = regQueue[0] || null;
          const waitingCustomers = regQueue.slice(1) || [];
          
          const errorCooldownRemaining = reg.cashier?.errorCooldown || 0;
          const hasError = reg.cashier?.status === 'stuck_error';
          const isResting = reg.cashier?.status === 'resting';

          return (
            <div 
              key={reg.index}
              className={`flex flex-col border rounded-sm overflow-hidden shadow-md transition-all duration-300 ${
                !reg.isOpen
                  ? 'bg-slate-900/10 border-slate-800/40 opacity-40'
                  : 'bg-slate-900/30 border-slate-800'
              } ${
                isExpress && reg.isOpen ? 'ring-1 ring-cyan-500/30' : ''
              }`}
            >
              {/* Register Header */}
              <div className={`p-3 border-b flex items-center justify-between border-slate-800 ${
                isExpress 
                  ? 'bg-gradient-to-r from-cyan-950/20 to-slate-900 border-b border-cyan-900/30' 
                  : 'bg-slate-900/80'
              }`}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-xs uppercase tracking-tight font-display ${
                      isExpress ? 'text-amber-400' : 'text-cyan-400'
                    }`}>LANE 0{reg.index + 1}</span>
                    {isExpress && (
                      <span className="text-[8px] font-bold bg-amber-500/10 text-amber-500 px-1 rounded border border-amber-500/20 uppercase tracking-wider">
                        EXPR
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {reg.isOpen ? `QLEN: ${regQueue.length}` : 'OFFLINE'}
                  </div>
                </div>

                {/* Toggle on desk */}
                <button
                  onClick={() => onToggleRegister(reg.index)}
                  className={`text-[9px] uppercase px-2 py-0.5 rounded-sm font-mono tracking-tight cursor-pointer transition ${
                    reg.isOpen
                      ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-900/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/40 hover:bg-slate-750'
                  }`}
                >
                  {reg.isOpen ? 'Выкл' : 'Вкл'}
                </button>
              </div>

              {/* Cash Register Work Station / Cashier Seated */}
              {reg.isOpen ? (
                <div className="p-4 border-b border-slate-850 flex flex-col gap-3 relative min-h-[140px] items-center justify-center text-center bg-slate-900/20">
                  {reg.cashier ? (
                    <div className="w-full flex flex-col items-center">
                      {/* Interactive Cashier Avatar avatar click triggers specialty if they have one */}
                      <button
                        onClick={() => {
                          if (hasError) {
                            onManualResetError(reg.cashier!.id);
                          } else {
                            onCallSpecialty(reg.cashier!.id);
                          }
                        }}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-bold select-none shadow-md transition duration-150 hover:scale-105 active:scale-95 group overflow-hidden ${reg.cashier.avatarColor} ${
                          hasError 
                            ? 'ring-2 ring-red-500 animate-pulse cursor-pointer' 
                            : 'ring-1 ring-slate-800 hover:ring-cyan-500 cursor-pointer'
                        }`}
                        title={hasError ? "Нажмите для оперативного вмешательства!" : "Нажмите для применения суперспособности!"}
                      >
                        {reg.cashier.name.substring(0, 2)}

                        {/* Status overlays */}
                        {isResting && (
                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-300">
                            ☕ Спит
                          </div>
                        )}
                        {hasError && (
                          <div className="absolute inset-0 bg-red-950/80 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                            ⚠️ СТУПОР
                          </div>
                        )}

                        {/* Hover hint bubbles */}
                        <div className="absolute hidden group-hover:flex bottom-16 bg-slate-900 text-slate-200 text-[10px] rounded border border-slate-800 p-2 whitespace-nowrap z-20 flex-col items-center shadow-lg pointer-events-none">
                          <span className="font-bold text-cyan-400">{reg.cashier.name}</span>
                          <span className="text-slate-400 text-3xs mt-0.5">{reg.cashier.specialtyName}</span>
                          <span className="text-[8px] text-green-400 mt-1 font-mono uppercase tracking-wider">Кликните</span>
                        </div>
                      </button>

                      {/* Cashier Name / Levels */}
                      <div className="mt-2.5">
                        <div className="font-bold text-[10px] uppercase font-mono tracking-tight text-slate-300 flex items-center justify-center gap-1.5">
                          <span className="truncate max-w-[80px]">{reg.cashier.name.split(' ')[0]}</span>
                          <span className="text-cyan-500 bg-cyan-950/30 border border-cyan-900/50 px-1 rounded-sm text-[8px]">LVL {reg.cashier.level}</span>
                        </div>
                        {/* Stamina bar small */}
                        <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mt-2 overflow-hidden">
                          <div 
                            className={`h-full ${
                              reg.cashier.stamina < 30 ? 'bg-red-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${reg.cashier.stamina}%` }}
                          />
                        </div>
                      </div>

                      {/* Cashier state screen overlay */}
                      {hasError && (
                        <div className="absolute top-1 right-1 left-1 bottom-1 rounded bg-red-950/95 border border-red-800 flex flex-col items-center justify-center p-2 z-10 animate-pulse text-center">
                          <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
                          <span className="text-[10px] font-bold uppercase text-red-200">Галя, отмена!</span>
                          <span className="text-[9px] text-slate-300 font-mono mt-0.5">Исправится: {errorCooldownRemaining}s</span>
                          <button
                            onClick={() => onManualResetError(reg.cashier!.id)}
                            className="mt-2 bg-red-600 hover:bg-red-500 text-white font-extrabold px-2 py-0.5 rounded text-[8px] uppercase tracking-wide cursor-pointer shadow-sm transition"
                          >
                            Сбросить
                          </button>
                        </div>
                      )}

                      {isResting && (
                        <div className="absolute top-1 right-1 left-1 bottom-1 rounded bg-[#0A0A0C]/90 border border-slate-800 flex flex-col items-center justify-center p-2 z-10 text-center">
                          <span className="text-base mb-1 animate-bounce">☕</span>
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest font-mono">Перерыв</span>
                          <span className="text-[8px] text-slate-500 mt-1 leading-normal px-2">Кассир отдыхает</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-slate-600">
                      <Ban className="w-7 h-7 text-slate-800 mb-2" />
                      <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Пустая касса</span>
                      {onAssignCashierClick && (
                        <button
                          onClick={() => onAssignCashierClick(reg.index)}
                          className="mt-2 py-1 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-sm text-[9px] cursor-pointer transition uppercase tracking-wider font-mono text-[8px]"
                        >
                          Назначить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border-b border-slate-850 bg-slate-900/10 min-h-[140px] flex items-center justify-center text-center">
                  <span className="text-slate-600 text-[10px] uppercase tracking-wider font-mono">Деактивировано</span>
                </div>
              )}

              {/* CURRENT ACTIVE CUSTOMER BEING SERVED AT THE REBELT */}
              {reg.isOpen && (
                <div className="p-3 border-b border-slate-850 bg-slate-900/10 min-h-[100px] flex flex-col justify-between">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono border-b border-slate-800 pb-1 mb-2">
                    Лента обслуживания:
                  </div>

                  {activeCustomer ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${getPatienceColor(activeCustomer.patience)} border`}>
                            {getCustomerEmoji(activeCustomer.patience)}
                          </div>
                          <span className="text-[11px] font-bold text-slate-200 truncate scale-95 origin-left" title={activeCustomer.name}>
                            {activeCustomer.name.split(' (')[0]}
                          </span>
                        </div>
                        {/* Patience badge */}
                        <span className={`text-[10px] font-mono font-semibold ${getPatienceTextColor(activeCustomer.patience)}`}>
                          {Math.round(activeCustomer.patience)}%
                        </span>
                      </div>

                      {/* Items process tracking bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                          <span className="flex items-center gap-0.5">
                            <ShoppingCart className="w-2.5 h-2.5 text-cyan-500" />
                            Товары: <strong>{activeCustomer.itemCount} шт</strong>
                          </span>
                          <span className="text-cyan-400 font-bold">
                            {Math.floor(activeCustomer.itemsProcessed)} / {activeCustomer.initialItemCount}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${(activeCustomer.itemsProcessed / activeCustomer.initialItemCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[9px] text-slate-600 font-mono uppercase tracking-wider">
                      Лента свободна
                    </div>
                  )}
                </div>
              )}

              {/* WAITING QUEUE LANERS BELOW COUNTER (Premium 2D Map Style Dotted Pathway) */}
              {reg.isOpen && config.queueAlgorithm !== 'single-snake' && (
                <div className="flex-1 p-3 flex flex-col gap-2.5 bg-[#0A0A0C]/50 min-h-[160px] max-h-[300px] overflow-y-auto relative border-t border-slate-900/50">
                  <div className="text-[9px] uppercase font-mono font-bold text-slate-500 border-b border-slate-900 pb-1.5 flex justify-between z-10">
                    <span>Путь Очереди:</span>
                    <span className="font-mono text-cyan-400 font-bold">{waitingCustomers.length} чел.</span>
                  </div>

                  {waitingCustomers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-900/60 rounded-sm text-[9px] text-slate-700 py-8">
                      <span className="text-xl mb-1 opacity-40">👥</span>
                      <span>Свободная дорожка</span>
                    </div>
                  ) : (
                    <div className="space-y-2 relative">
                      {/* Vertical connector dashed line mimicking a physical floor queue tape */}
                      <div className="absolute left-4.5 top-0 bottom-0 border-l border-dashed border-slate-800/40 w-0 h-full pointer-events-none z-0" />
                      
                      {waitingCustomers.slice(0, 5).map((cust, qi) => {
                        const patienceP = Math.max(0, cust.patience);
                        const outlineColor = 
                          patienceP > 70 ? 'border-emerald-500/80' :
                          patienceP > 35 ? 'border-amber-500/80' : 'border-red-500/80 animate-pulse';
                        return (
                          <div 
                            key={cust.id}
                            className="relative flex items-center gap-2 bg-[#0C0D11] border border-slate-850 rounded-sm p-1.5 shadow-sm transition-all duration-150 hover:border-cyan-500/30 hover:bg-[#111216] group cursor-default z-10"
                          >
                            <div className="relative shrink-0 z-10">
                              {/* Customer Avatar Circle with Patience Outline */}
                              <div className={`w-6 h-6 rounded-full border bg-slate-950 flex items-center justify-center ${outlineColor}`}>
                                <span className="text-[11px] select-none">
                                  {getCustomerEmoji(patienceP)}
                                </span>
                              </div>
                              {/* Index tag */}
                              <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-800 text-[8px] font-mono text-slate-500 flex items-center justify-center">
                                {qi + 1}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-slate-300 truncate tracking-tight font-display" title={cust.name}>
                                {cust.name.split(' (')[0]}
                              </div>
                              <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono mt-0.5 leading-none">
                                <span className="flex items-center gap-0.5 text-cyan-500">
                                  🛒 {cust.itemCount} ш.
                                </span>
                                <span className={getPatienceTextColor(patienceP)}>
                                  {Math.round(patienceP)}%
                                </span>
                              </div>
                            </div>

                            {/* Hover detailed bubble */}
                            <div className="absolute hidden group-hover:block bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 text-slate-200 border border-slate-800 rounded p-2 text-[9px] leading-relaxed whitespace-nowrap shadow-xl z-30">
                              <div className="font-bold text-cyan-400">{cust.name}</div>
                              <div>Товары в корзине: <strong className="text-white">{cust.itemCount} шт.</strong></div>
                              <div>Ожидание в очереди: <strong className="text-white">{cust.waitingTime} сек.</strong></div>
                              <div>Лимит терпения: <strong className="text-white">{cust.patienceDuration} сек.</strong></div>
                            </div>
                          </div>
                        );
                      })}
                      {waitingCustomers.length > 5 && (
                        <div className="text-center text-[9px] text-slate-500 font-mono italic pt-1 border-t border-slate-900 mt-1">
                          + еще {waitingCustomers.length - 5} чел. в линии
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
