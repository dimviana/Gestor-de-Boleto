import React, { useState, useMemo } from 'react';
import { Boleto } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowDownIcon, ArrowUpIcon, FileTextIcon, WalletIcon } from './icons/Icons';
import { TranslationKey } from '../translations';

type SortableKeys = 'recipient' | 'amount' | 'updatedAt' | 'dueDate';
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortableKeys;
  direction: SortDirection;
}

interface OverviewViewProps {
  boletos: Boleto[];
}

const OverviewView: React.FC<OverviewViewProps> = ({ boletos }) => {
  const { t, language } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updatedAt', direction: 'descending' });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return t('notAvailable');
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (isNaN(date.getTime())) return t('notAvailable');
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    } catch (e) {
      return t('notAvailable');
    }
  };
  
  const formatTimestamp = (dateString: string | null | undefined) => {
    if (!dateString) return t('notAvailable');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('notAvailable');
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      }).format(date);
    } catch (e) {
      return t('notAvailable');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return t('notAvailable');
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
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

  const filteredBoletos = useMemo(() => {
    return boletos.filter(boleto => {
      if (!boleto.updatedAt) return false;
      const paidDate = new Date(boleto.updatedAt);
      paidDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        if (paidDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (paidDate > end) return false;
      }
      return true;
    });
  }, [boletos, startDate, endDate]);

  const sortedBoletos = useMemo(() => {
    const sortableItems = [...filteredBoletos];
    sortableItems.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Works for strings and date strings
        comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      }

      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
    return sortableItems;
  }, [filteredBoletos, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const totalInPeriod = useMemo(() => {
    return sortedBoletos.reduce((sum, boleto) => sum + (boleto.amount || 0), 0);
  }, [sortedBoletos]);

  const SortableHeader: React.FC<{ sortKey: SortableKeys, label: TranslationKey }> = ({ sortKey, label }) => (
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center">
        {t(label)}
        {sortConfig.key === sortKey ? (
            sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4 ml-1" /> : <ArrowDownIcon className="w-4 h-4 ml-1" />
        ) : <div className="w-4 h-4 ml-1" />}
      </div>
    </th>
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">{t('viewOverview')}</h2>
      
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-6 border dark:border-gray-700">
          <h3 className="text-md font-semibold mb-2">{t('filterByDateRange')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDate')}</label>
                  <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full input-field" />
              </div>
              <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDate')}</label>
                  <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full input-field" />
              </div>
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                  {t('clearFilters')}
              </button>
          </div>
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-800/50 mb-6">
        <p className="text-md font-medium text-green-700 dark:text-green-300">{t('totalPaidInPeriod')}</p>
        <p className="text-3xl font-bold text-green-800 dark:text-green-200">{formatCurrency(totalInPeriod)}</p>
      </div>

      <div className="overflow-x-auto">
        <div className="align-middle inline-block min-w-full">
          <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <SortableHeader sortKey="recipient" label="recipient" />
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('documentNumberShort')}</th>
                  <SortableHeader sortKey="dueDate" label="dueDate" />
                  <SortableHeader sortKey="updatedAt" label="paidDate" />
                  <SortableHeader sortKey="amount" label="amount" />
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">PDF</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {sortedBoletos.map(boleto => (
                  <tr key={boleto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{boleto.recipient}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{boleto.guideNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(boleto.extractedData?.dueDate || boleto.dueDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(boleto.updatedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(boleto.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenPdf(boleto)} className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                        <FileTextIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedBoletos.length === 0 && (
                <div className="text-center py-12">
                    <WalletIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">{t('noPaidBoletosInPeriod')}</h3>
                </div>
            )}
          </div>
        </div>
      </div>
      <style>{`.input-field { color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; background-color: #F9FAFB; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
    </div>
  );
};

export default OverviewView;