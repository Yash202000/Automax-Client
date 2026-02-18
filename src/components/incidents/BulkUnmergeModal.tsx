import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { incidentMergeApi } from '../../api/admin';
import type { Incident } from '../../types';
import { Button } from '../ui';

interface BulkUnmergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  onUnmergeSuccess: () => void;
}

export const BulkUnmergeModal: React.FC<BulkUnmergeModalProps> = ({
  isOpen,
  onClose,
  incidents,
  onUnmergeSuccess,
}) => {
  const { t } = useTranslation();
  const [isUnmerging, setIsUnmerging] = useState(false);
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleBulkUnmerge = async () => {
    setIsUnmerging(true);
    setError('');

    try {
      const response = await incidentMergeApi.bulkUnmergeIncidents({
        incident_ids: incidents.map((inc) => inc.id),
        comment: comment || undefined,
      });

      const data = response.data;
      if (data && data.failures && data.failures.length > 0) {
        setError(`${data.unmerged_count} unmerged, ${data.failures.length} failed`);
      }

      onUnmergeSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t('incidents.merge.unmergeFailed'));
    } finally {
      setIsUnmerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('incidents.merge.unmergeTitle')} ({incidents.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-2">
                  {t('incidents.merge.unmergeWarning')}
                </h4>
                <p className="text-sm text-amber-700">
                  {incidents.length} {t('incidents.merge.incidentsWillBeUnmerged', 'incident(s) will be unmerged from this master.')}
                </p>
              </div>
            </div>
          </div>

          {/* Incidents List */}
          <div className="mb-6 max-h-48 overflow-y-auto space-y-2">
            {incidents.map((inc) => (
              <div key={inc.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 text-sm">
                  {inc.incident_number} - {inc.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('incidents.status')}: {inc.current_state?.name}
                </p>
              </div>
            ))}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('incidents.merge.comment')} <span className="text-gray-400">({t('common.optional')})</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('incidents.merge.commentPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUnmerging}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkUnmerge}
            isLoading={isUnmerging}
          >
            {t('incidentMerge.confirmUnmerge')} ({incidents.length})
          </Button>
        </div>
      </div>
    </div>
  );
};
