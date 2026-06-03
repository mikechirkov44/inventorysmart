/**
 * @module Toast
 * @description Система всплывающих уведомлений (туастов).
 * Предоставляет контекст для отображения кратких сообщений
 * об успехе, ошибке, предупреждении или информации.
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/** Контекст для передачи методов управления туастами */
const ToastContext = createContext(null);

/** Счётчик уникальных ID туастов */
let toastId = 0;

/**
 * Провайдер системы уведомлений.
 * Управляет списком активных туастов и их автоматическим скрытием.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  /** Удаляет туаст по ID с анимацией выхода */
  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  /**
   * Добавляет новый туаст.
   * @param {Object} params
   * @param {'success'|'error'|'warning'|'info'} [params.type='info'] - Тип уведомления
   * @param {string} [params.title] - Заголовок
   * @param {string} [params.message] - Текст сообщения
   * @param {number} [params.duration=4000] - Время показа в мс (0 — без автоскрытия)
   * @returns {number} ID созданного туаста
   */
  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message, exiting: false }]);
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = useCallback({
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message, duration: 6000 }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
    dismiss: removeToast,
  }, [addToast, removeToast]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : ''}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">{icons[t.type]}</span>
            <div className="toast-body">
              {t.title && <div className="toast-title">{t.title}</div>}
              {t.message && <div className="toast-message">{t.message}</div>}
            </div>
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); removeToast(t.id); }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Хук для доступа к методам управления туастами. Использовать внутри ToastProvider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
