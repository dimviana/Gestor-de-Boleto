import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Boleto, BoletoStatus, Role } from '../types';
import BoletoCard from './BoletoCard';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../translations';

interface KanbanColumnProps {
  title: string;
  boletos: Boleto[];
  status: BoletoStatus;
  onUpdateStatus: (id: string, newStatus: BoletoStatus) => void;
  onDelete: (id: string) => void;
  onUpdateComments: (id: string, comments: string) => void;
  onUploadProof: (id: string, file: File) => Promise<void>;
  selectedBoletoIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: (boletos: Boleto[]) => void;
  userRole: Role;
  cardsPerPage: number;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, boletos, status, onUpdateStatus, onDelete, onUpdateComments, onUploadProof, selectedBoletoIds, onToggleSelection, onToggleSelectAll, userRole, cardsPerPage }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const filteredBoletos = useMemo(() => {
        if (!searchTerm) {
            return boletos;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return boletos.filter(boleto => 
            boleto.guideNumber && boleto.guideNumber.toLowerCase().includes(lowercasedTerm)
        );
    }, [boletos, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const safeCardsPerPage = Math.max(1, cardsPerPage);
    const totalPages = Math.ceil(filteredBoletos.length / safeCardsPerPage);

    const paginatedBoletos = useMemo(() => {
        const startIndex = (currentPage - 1) * safeCardsPerPage;
        return filteredBoletos.slice(startIndex, startIndex + safeCardsPerPage);
    }, [filteredBoletos, currentPage, safeCardsPerPage]);


    const columnBoletoIds = useMemo(() => filteredBoletos.map(b => b.id), [filteredBoletos]);
    const selectedInColumn = useMemo(() => columnBoletoIds.filter(id => selectedBoletoIds.includes(id)), [columnBoletoIds, selectedBoletoIds]);
    const [isOver, setIsOver] = useState(false);

    const isAllSelected = filteredBoletos.length > 0 && selectedInColumn.length === filteredBoletos.length;
    const isPartiallySelected = selectedInColumn.length > 0 && !isAllSelected;

    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = isPartiallySelected;
        }
    }, [isPartiallySelected]);
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = () => {
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        const id = e.dataTransfer.getData('boletoId');
        const sourceStatus = e.dataTransfer.getData('sourceStatus');

        if (id && sourceStatus !== status) {
            onUpdateStatus(id, status);
        }
    };


  return (
    <div 
        className="w-full md:w-1/3 p-2"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <div className={`bg-gray-100/80 dark:bg-gray-800/80 rounded-xl shadow-inner h-full flex flex-col transition-colors duration-300 ${isOver ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
        <div className="sticky top-16 bg-gray-100/80 dark:bg-gray-800/80 rounded-t-xl backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span>{title} ({boletos.length})</span>
              {boletos.length > 0 && userRole !== 'viewer' && (
                <input
                    ref={checkboxRef}
                    type="checkbox"
                    className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-800 cursor-pointer"
                    checked={isAllSelected}
                    onChange={() => onToggleSelectAll(filteredBoletos)}
                    title="Selecionar todos nesta coluna"
                />
              )}
            </h2>
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    placeholder={t('searchByDocumentNumber' as TranslationKey)}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
        </div>
        <div className="p-2 space-y-4 overflow-y-auto flex-1">
          {paginatedBoletos.length > 0 ? (
            paginatedBoletos.map(boleto => (
              <BoletoCard
                key={boleto.id}
                boleto={boleto}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
                onUpdateComments={onUpdateComments}
                onUploadProof={onUploadProof}
                isSelected={selectedBoletoIds.includes(boleto.id)}
                onToggleSelection={onToggleSelection}
                userRole={userRole}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500 dark:text-gray-400 italic">No items</p>
            </div>
          )}
        </div>
        {totalPages > 1 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                    {t('paginationPrevious')}
                </button>
                <span className="text-gray-600 dark:text-gray-300 font-semibold">
                    {t('paginationPage')} {currentPage} {t('paginationOf')} {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                    {t('paginationNext')}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;