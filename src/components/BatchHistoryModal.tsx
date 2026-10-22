import React, { useEffect, useState } from 'react';
import { HistoricalBatch } from '../types';
import { getHistoricalBatches, deleteHistoricalBatch } from '../utils/storage';
import { X, History, Trash2, ArrowRight, Calendar } from 'lucide-react';

interface BatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreBatch: (batch: HistoricalBatch) => void;
}

export const BatchHistoryModal: React.FC<BatchHistoryModalProps> = ({
  isOpen,
  onClose,
  onRestoreBatch
}) => {
  const [batches, setBatches] = useState<HistoricalBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadBatches();
    }
  }, [isOpen]);

  const loadBatches = async () => {
    setLoading(true);
    const list = await getHistoricalBatches();
    setBatches(list.sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistoricalBatch(id);
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Saved Extraction Batches (IndexedDB)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading saved batches...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No saved batches in local storage. Once you extract or load data, you can save the snapshot here.
            </div>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                onClick={() => {
                  onRestoreBatch(batch);
                  onClose();
                }}
                className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                    <span>{batch.title}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(batch.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{batch.startDate} to {batch.endDate}</span>
                    <span aria-hidden="true">·</span>
                    <span>{batch.rowsCount} employees</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, batch.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
