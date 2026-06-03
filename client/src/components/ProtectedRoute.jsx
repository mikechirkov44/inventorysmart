/**
 * @module ProtectedRoute
 * @description Маршрут с проверкой авторизации и прав доступа.
 * Перенаправляет на страницу входа, начальную настройку или главную
 * в зависимости от состояния авторизации и наличии 필요한 прав.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Обёртка маршрута с проверкой доступа.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Защищаемый контент
 * @param {string} [props.requiredPermission] - Требуемое разрешение для просмотра
 */
function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading, setupRequired, canView } = useAuth();

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user && setupRequired) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredPermission && !canView(requiredPermission)) return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;
