import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import RegisterForm from '../components/Auth/RegisterForm';

export default function RegisterPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return <RegisterForm />;
}
