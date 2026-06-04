/**
 * @module LoginPage
 * @description Страница авторизации пользователя. Если система не настроена — перенаправляет на SetupPage.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Package, ArrowRight } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';

function LoginPage() {
  /** Получение метода входа и флага необходимости настройки из AuthContext */
  const { login, setupRequired } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** Если система не настроена — показываем экран первоначальной настройки */
  if (setupRequired) {
    return (
      <div className="login-page">
        <div className="login-split">
          <div className="login-left">
            <div className="login-brand">
              <Package size={48} strokeWidth={1.5} />
              <h1>InventorySmart</h1>
              <p>Система учёта оборудования и ЗИП</p>
            </div>
            <div className="login-features">
              <div className="login-feature">
                <div className="login-feature-icon">QR</div>
                <span>QR-сканирование оборудования</span>
              </div>
              <div className="login-feature">
                <div className="login-feature-icon">Gantt</div>
                <span>План-график ремонтов</span>
              </div>
              <div className="login-feature">
                <div className="login-feature-icon">ZIP</div>
                <span>Учёт запасных частей</span>
              </div>
            </div>
          </div>
          <div className="login-right">
            <div className="login-card">
              <div className="login-header">
                <h1>InventorySmart</h1>
                <p>Первоначальная настройка системы</p>
              </div>
              <div className="info">
                Учётные записи ещё не созданы. Необходима первоначальная настройка администратора.
              </div>
              <button onClick={() => navigate('/setup')} className="btn btn-primary btn-full">
                Начать настройку <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** Обработчик отправки формы входа */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, companyName);
    } catch {
      setError('Неверное имя пользователя, пароль или наименование компании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split">
        <div className="login-left">
          <div className="login-brand">
            <Package size={48} strokeWidth={1.5} />
            <h1>InventorySmart</h1>
            <p>Система учёта оборудования и ЗИП</p>
          </div>
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">QR</div>
              <span>QR-сканирование оборудования</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">Gantt</div>
              <span>План-график ремонтов</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">ZIP</div>
              <span>Учёт запасных частей</span>
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h1>Вход в систему</h1>
              <p>Введите учётные данные для входа</p>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="error">{error}</div>}
              <div className="form-group">
                <label>Компания</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Введите наименование компании"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Логин</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Введите логин"
                />
              </div>
              <div className="form-group">
                <label>Пароль</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'} {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
