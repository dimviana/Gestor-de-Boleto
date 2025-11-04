
import React from 'react';
import { Boleto } from '../types';
import Modal from './Modal';
import PdfViewer from './PdfViewer';

interface PdfViewerModalProps {
  boleto: Boleto;
  onClose: () => void;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ boleto, onClose }) => {
  if (!boleto) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title={boleto.fileName}>
      <PdfViewer fileData={boleto.fileData} />
    </Modal>
  );
};

export default PdfViewerModal;
