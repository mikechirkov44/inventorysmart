/**
 * @module ConfirmModal
 * @description Модальное окно подтверждения действий.
 * Предоставляет контекст для глобального вызова диалогов подтверждения.
 */

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

/** Контекст для передачи функции confirm */
const ConfirmContext = createContext(null);

/**
 * Провайдер контекста подтверждений.
 * Управляет состоянием модального окна и обрабатывает нажатия клавиш.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  /**
   * Открывает модальное окно подтверждения.
   * @param {Object} params - Параметры диалога
   * @param {string} params.title - Заголовок окна
   * @param {string} params.message - Текст сообщения
   * @param {'danger'|'warning'|'info'} [params.type='danger'] - Тип сообщения
   * @param {string} [params.confirmText='Подтвердить'] - Текст кнопки подтверждения
   * @param {string} [params.cancelText='Отмена'] - Текст кнопки отмены
   * @returns {Promise<boolean>} Результат подтверждения
   */
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

/** Хук для доступа к функции подтверждения. Использовать внутри ConfirmProvider. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
