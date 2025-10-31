
import React from 'react';
import { Boleto, BoletoStatus } from '../types';
import BoletoCard from './BoletoCard';

interface KanbanColumnProps {
  title: string;
  boletos: Boleto[];
  onUpdateStatus: (id: string, newStatus: BoletoStatus) => void;
  onDelete: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, boletos, onUpdateStatus, onDelete }) => {
  return (
    <div className="w-full md:w-1/3 p-2">
      <div className="bg-gray-100/80 rounded-xl shadow-inner h-full flex flex-col">
        <h2 className="text-lg font-bold text-gray-700 p-4 border-b border-gray-200 sticky top-16 bg-gray-100/80 rounded-t-xl backdrop-blur-sm">
          {title} ({boletos.length})
        </h2>
        <div className="p-2 space-y-4 overflow-y-auto flex-1">
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
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500 italic">No items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KanbanColumn;
