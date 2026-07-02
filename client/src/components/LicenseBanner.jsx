import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Sticky-баннер статуса лицензии / демо-режима.
 */
export default function LicenseBanner() {
  const { license, canView } = useAuth();

  if (!license || license.status === 'active') return null;

  const isDemo = license.status === 'demo';
  const isExpired = license.status === 'expired' || license.status === 'invalid';
  const canSettings = canView('settings');

  return (
    <div className={`license-banner license-banner-${license.status}`}>
      <div className="license-banner-content">
        {isDemo ? <Sparkles size={18} /> : <AlertTriangle size={18} />}
        <span className="license-banner-text">
          {isDemo && (
            <>Демо-режим: осталось <strong>{license.daysLeft}</strong> раб. дн.</>
          )}
          {isExpired && <>Лицензия истекла или недействительна</>}
          {license.status === 'blocked' && <>Доступ ограничен — {license.message}</>}
        </span>
      </div>
      {canSettings && (isDemo || isExpired) && (
        <Link to="/settings" className="license-banner-cta">Активировать лицензию</Link>
      )}
    </div>
  );
}
