import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactsList } from './components/ContactsList';

export const CallCentrePage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">{t('callCentre.title', 'Call Centre')}</h1>
                <p className="text-slate-500 mt-1">{t('callCentre.subtitle', 'Manage calls and view contacts')}</p>
            </div>

            <div className="mt-6">
                <ContactsList variant="call-centre" />
            </div>
        </div>
    );
};