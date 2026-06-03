import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading, setupRequired, canView } = useAuth();

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user && setupRequired) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredPermission && !canView(requiredPermission)) return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;
