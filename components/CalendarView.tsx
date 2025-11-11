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
      if (boleto.createdAt) {
        const date = new Date(boleto.createdAt);
        if (!isNaN(date.getTime())) {
          // Use toLocaleString to get a date object representing the time in Brazil.
          // This avoids manual offset calculations and handles DST correctly.
          const brtDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
          
          const year = brtDate.getFullYear();
          const month = (brtDate.getMonth() + 1).toString().padStart(2, '0');
          const day = brtDate.getDate().toString().padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(boleto);
        } else {
          console.warn(`Invalid createdAt format detected for boleto ID ${boleto.id}: ${boleto.createdAt}`);
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

  // --- Monthly Summaries Calculation ---
  const monthlyBoletos = useMemo(() => {
    return boletos.filter(b => {
        if (!b.createdAt) return false;
        try {
            const createdAtDate = new Date(b.createdAt);
            return createdAtDate.getFullYear() === currentDate.getFullYear() &&
                   createdAtDate.getMonth() === currentDate.getMonth();
        } catch(e) { return false; }
    });
  }, [boletos, currentDate]);

  const totalDue = useMemo(() => {
      return monthlyBoletos
          .filter(b => b.status === BoletoStatus.TO_PAY || b.status === BoletoStatus.VERIFYING)
          .reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [monthlyBoletos]);

  const totalPaid = useMemo(() => {
      return monthlyBoletos
          .filter(b => b.status === BoletoStatus.PAID)
          .reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [monthlyBoletos]);


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
      
      <div className="flex flex-col sm:flex-row justify-around my-4 gap-4">
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center border border-red-200 dark:border-red-800/50">
              <p className="text-sm font-medium text-red-600 dark:text-red-300">{t('totalToPay')} (Mês)</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200">{formatCurrency(totalDue)}</p>
          </div>
          <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center border border-green-200 dark:border-green-800/50">
              <p className="text-sm font-medium text-green-600 dark:text-green-300">{t('totalPaid')} (Mês)</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-200">{formatCurrency(totalPaid)}</p>
          </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase pb-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700 border-t border-l border-gray-200 dark:border-slate-700">
        {calendarGrid.map((date, index) => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;

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
                      try {
                        const dueDateObj = new Date(`${boleto.dueDate}T00:00:00`);
                        if (!isNaN(dueDateObj.getTime())) {
                            isOverdue = dueDateObj < today && boleto.status !== BoletoStatus.PAID;
                        }
                      } catch(e) {}
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