/**
 * @module AuthContext
 * @description Контекст авторизации приложения.
 * Управляет состоянием пользователя, токеном, правами доступа
 * и методами входа/выхода из системы.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

/** Контекст авторизации */
const AuthContext = createContext(null);

/**
 * Провайдер авторизации.
 * При загрузке проверяет наличие токена и валидирует его через API.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => { setUser(res.data); setLoading(false); })
        .catch(() => { logout(); setLoading(false); });
    } else {
      api.get('/setup')
        .then(res => { setSetupRequired(res.data.setupRequired); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [token]);

  /**
   * Выполняет вход пользователя в систему.
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @returns {Promise<Object>} Данные пользователя
   */
  const login = async (username, password, companyName) => {
    const res = await api.post('/auth/login', { username, password, companyName });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  /** Выходит из системы, очищая токен и данные пользователя */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const permissions = user?.permissions || {};

  /**
   * Проверяет наличие права на действие с ресурсом.
   * @param {string} resource - Идентификатор ресурса
   * @param {'view'|'edit'} [action='view'] - Тип действия
   * @returns {boolean} Есть ли доступ
   */
  const can = (resource, action = 'view') => {
    const perm = permissions[resource];
    if (perm === undefined || perm === null || perm === 'none') return false;
    if (typeof perm === 'boolean') return perm;
    if (typeof perm === 'string') {
      if (perm === 'full') return true;
      if (perm === 'view') return action === 'view';
    }
    return false;
  };

  const canView = (resource) => can(resource, 'view');
  const canEdit = (resource) => can(resource, 'edit');

  return (
    <AuthContext.Provider value={{ user, token, loading, setupRequired, login, logout, permissions, can, canView, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Хук для доступа к данным авторизации и методам управления доступом. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
