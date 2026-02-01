import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão:', error);
          navigate('/auth?error=callback_failed');
          return;
        }

        if (data.session) {
          console.log('Sessão criada com sucesso');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('Sem sessão ativa');
          navigate('/auth');
        }
      } catch (err) {
        console.error('Erro no callback:', err);
        navigate('/auth?error=unexpected');
      }
    };

    // Handle hash fragment from OAuth redirect
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (accessToken) {
      // Let Supabase handle the token exchange
      supabase.auth.getSession().then(({ data, error }) => {
        if (data.session) {
          navigate('/dashboard', { replace: true });
        } else if (error) {
          console.error('Erro:', error);
          navigate('/auth?error=token_exchange');
        }
      });
    } else {
      handleCallback();
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">A processar autenticação...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
