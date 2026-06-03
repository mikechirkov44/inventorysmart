/**
 * @module SetupPage
 * @description Страница первоначальной настройки системы. Создание учётной записи администратора.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function SetupPage() {
  /** Получение метода автоматического входа из AuthContext */
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Проверка необходимости первоначальной настройки */
  useEffect(() => {
    api.get('/setup')
      .then(res => {
        setSetupRequired(res.data.setupRequired);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /** Обработчик создания учётной записи администратора */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/setup', {
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName
      });

      localStorage.setItem('token', res.data.token);
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания учётной записи');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  if (!setupRequired) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>InventorySmart</h1>
            <p>Учётная запись администратора уже создана</p>
          </div>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-full">
            Перейти к входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card setup-card">
        <div className="login-header">
          <div className="setup-icon">🛡️</div>
          <h1>Первоначальная настройка</h1>
          <p>Создайте учётную запись администратора для управления системой</p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Логин *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="admin"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>ФИО</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Иванов Иван Иванович"
            />
          </div>
          <div className="form-group">
            <label>Пароль *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Минимум 6 символов"
            />
          </div>
          <div className="form-group">
            <label>Повторите пароль *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Повторите пароль"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Создание...' : 'Создать администратора'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetupPage;
