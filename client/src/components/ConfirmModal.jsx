import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(({ title, message, type = 'danger', confirmText = 'Подтвердить', cancelText = 'Отмена' }) => {
    return new Promise((resolve) => {
      setState({ title, message, type, confirmText, cancelText, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleCancel();
    if (e.key === 'Enter') handleConfirm();
  };

  useEffect(() => {
    if (state) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon confirm-icon-${state.type}`}>
              {state.type === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <h3 className="confirm-title">{state.title}</h3>
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-actions">
              <button className="btn" onClick={handleCancel}>{state.cancelText}</button>
              <button
                className={`btn ${state.type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleConfirm}
                autoFocus
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
