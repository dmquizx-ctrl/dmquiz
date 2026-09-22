import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.userType === 'admin') {
          navigate('/admin');
        } else {
          navigate('/student');
        }
      } else {
        navigate('/login');
      }
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
      </div>
    </div>
  );
};

export default Index;
