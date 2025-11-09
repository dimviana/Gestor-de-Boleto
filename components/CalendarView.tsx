
import React, { useState, useMemo } from 'react';
import { Boleto, BoletoStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRightIcon, ArrowLeftIcon } from './icons/Icons';

interface CalendarViewProps {
  boletos: Boleto[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ boletos }) => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  
  const handleOpenPdf = (boleto: Boleto) => {
    if (!boleto.fileData) return;
    const byteCharacters = atob(boleto.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
  };

  const boletosByDate = useMemo(() => {
    const map = new Map<string, Boleto[]>();
    boletos.forEach(boleto => {
      if (boleto.dueDate) {
        const date = new Date(`${boleto.dueDate}T00:00:00`);
        if (!isNaN(date.getTime())) {
          const dateKey = date.toISOString().split('T')[0];
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(boleto);
        } else {
          console.warn(`Invalid dueDate format detected for boleto ID ${boleto.id}: ${boleto.dueDate}`);
        }
      }
    });
    return map;
  }, [boletos]);
  
  const calendarGrid = useMemo(() => {
    const grid = [];
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from the previous Sunday

    for (let i = 0; i < 42; i++) { // 6 weeks grid
      grid.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    return grid;
  }, [firstDayOfMonth]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const daysOfWeek = language === 'pt' ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
      <header className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
            <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 capitalize">
          {currentDate.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
            <ArrowRightIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="grid grid-cols-7 gap-px">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase pb-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700 border-t border-l border-gray-200 dark:border-slate-700">
        {calendarGrid.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.getTime() === today.getTime();
          const boletosForDay = boletosByDate.get(dateKey) || [];

          return (
            <div key={index} className={`p-1.5 min-h-[120px] bg-white dark:bg-slate-800 flex flex-col ${isCurrentMonth ? '' : 'bg-gray-50 dark:bg-slate-800/50'}`}>
              <div className={`text-xs sm:text-sm font-semibold mb-1 flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-blue-600 text-white' : (isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500')}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1 overflow-y-auto flex-1">
                {boletosForDay.map(boleto => {
                  let isOverdue = false;
                  if (boleto.dueDate) {
                      const dueDateObj = new Date(`${boleto.dueDate}T00:00:00`);
                      if (!isNaN(dueDateObj.getTime())) {
                          isOverdue = dueDateObj < today && boleto.status !== BoletoStatus.PAID;
                      }
                  }
                  
                  return (
                    <button 
                        key={boleto.id} 
                        onClick={() => handleOpenPdf(boleto)}
                        className={`w-full text-left p-1.5 rounded-md text-xs transition-colors ${
                            boleto.status === BoletoStatus.PAID ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                            isOverdue ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' :
                            boleto.status === BoletoStatus.VERIFYING ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' :
                            'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                        }`}
                    >
                      <p className="font-bold truncate">{boleto.recipient}</p>
                      <p>{formatCurrency(boleto.amount)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;