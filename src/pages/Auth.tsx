import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Loader2, Youtube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable';

const Auth = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: error.message || 'Não foi possível conectar com o YouTube. Tente novamente.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao conectar. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass border-border/50 relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary glow-sm">
              <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            Make<span className="text-primary">Money</span>
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Entre com sua conta do YouTube para começar a ganhar dinheiro assistindo vídeos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* YouTube/Google Login Button */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            size="xl"
            className="w-full bg-[#FF0000]/10 hover:bg-[#FF0000]/20 border-[#FF0000]/30 hover:border-[#FF0000]/50 text-foreground group"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Youtube className="h-5 w-5 text-[#FF0000] group-hover:scale-110 transition-transform" />
                <span>Entrar com YouTube</span>
              </>
            )}
          </Button>

          {/* Info Box */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Youtube className="h-4 w-4 text-[#FF0000]" />
              Porquê usar conta YouTube?
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Validação automática dos vídeos assistidos</li>
              <li>• Segurança contra fraudes e múltiplas contas</li>
              <li>• Recompensas garantidas após cada tarefa</li>
              <li>• Saques rápidos e seguros</li>
            </ul>
          </div>

          {/* Terms */}
          <p className="text-xs text-center text-muted-foreground">
            Ao entrar, você concorda com os nossos{' '}
            <a href="#" className="text-primary hover:underline">Termos de Uso</a>{' '}
            e{' '}
            <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
