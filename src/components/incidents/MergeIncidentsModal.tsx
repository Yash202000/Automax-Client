import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle, Crown } from 'lucide-react';
import { incidentMergeApi } from '../../api/admin';
import type { Incident, IncidentMergeOption } from '../../types';
import { Button } from '../ui';

interface MergeIncidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIncidents: Incident[];
  onMergeSuccess: () => void;
}

export const MergeIncidentsModal: React.FC<MergeIncidentsModalProps> = ({
  isOpen,
  onClose,
  selectedIncidents,
  onMergeSuccess,
}) => {
  const { t } = useTranslation();
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    canMerge: boolean;
    errors: string[];
    masterOptions: IncidentMergeOption[];
  } | null>(null);
  const [masterIncidentId, setMasterIncidentId] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && selectedIncidents.length >= 2) {
      validateMerge();
      // Default to first incident as master
      setMasterIncidentId(selectedIncidents[0]?.id || '');
    }
  }, [isOpen]);

  const validateMerge = async () => {
    setIsValidationLoading(true);
    setError('');
    try {
      const incidentIds = selectedIncidents.map((inc) => inc.id);
      const response = await incidentMergeApi.validateMerge(incidentIds);
      const data = response.data;

      setValidationResult({
        canMerge: data?.can_merge ?? false,
        errors: data?.errors || [],
        masterOptions: data?.master_options || [],
      });
    } catch (err: any) {
      setError(err.response?.data?.error || t('incidentMerge.validationFailed'));
    } finally {
      setIsValidationLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!masterIncidentId) {
      setError(t('incidentMerge.selectMaster'));
      return;
    }

    setIsMerging(true);
    setError('');

    try {
      await incidentMergeApi.mergeIncidents({
        incident_ids: selectedIncidents.map((inc) => inc.id),
        master_incident_id: masterIncidentId,
        comment: comment || undefined,
      });

      onMergeSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t('incidentMerge.mergeFailed'));
    } finally {
      setIsMerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('incidents.merge.title')}
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
          {/* Validation Loading */}
          {isValidationLoading && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">{t('common.loading')}</p>
            </div>
          )}

          {/* Validation Errors */}
          {validationResult && !validationResult.canMerge && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">
                    {t('incidents.merge.cannotMerge')}
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validationResult && validationResult.canMerge && (
            <>
              {/* Master Incident Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('incidentMerge.masterIncidentNumber')} <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  {t('incidentMerge.masterIncidentHint')}
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedIncidents.map((incident) => (
                    <label
                      key={incident.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        masterIncidentId === incident.id
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="masterIncident"
                        value={incident.id}
                        checked={masterIncidentId === incident.id}
                        onChange={() => setMasterIncidentId(incident.id)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {incident.incident_number} - {incident.title}
                          </p>
                          {masterIncidentId === incident.id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              <Crown className="w-3 h-3" />
                              {t('incidentMerge.master')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {t('incidents.status')}: {incident.current_state?.name}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {t('incidentMerge.masterRetainInfo')}
                </p>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('incidentMerge.comment')} <span className="text-gray-400">({t('common.optional')})</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('incidentMerge.commentPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

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
            disabled={isMerging}
          >
            {t('common.cancel')}
          </Button>
          {validationResult?.canMerge && (
            <Button
              variant="default"
              onClick={handleMerge}
              isLoading={isMerging}
              disabled={!masterIncidentId}
            >
              {t('incidentMerge.confirmMerge')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
