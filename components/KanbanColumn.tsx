import React from 'react';
import { Boleto, BoletoStatus } from '../types';
import BoletoCard from './BoletoCard';
import { useLanguage } from '../contexts/LanguageContext';

interface KanbanColumnProps {
  status: BoletoStatus;
  title: string;
  icon: React.ReactNode;
  boletos: Boleto[];
  onUpdateStatus: (id: string, status: BoletoStatus) => void;
  onDelete: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, title, icon, boletos, onUpdateStatus, onDelete }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-gray-50/70 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200 h-full">
      <div className="flex items-center mb-4">
        {icon}
        <h2 className="text-lg font-bold text-gray-700">{title}</h2>
        <span className="ml-2 text-sm font-semibold text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
          {boletos.length}
        </span>
      </div>
      <div className="space-y-4 overflow-y-auto h-[calc(100vh-20rem)] pr-1">
        {boletos.length > 0 ? (
          boletos.map(boleto => (
            <BoletoCard
              key={boleto.id}
              boleto={boleto}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            {t('emptyColumn')}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;