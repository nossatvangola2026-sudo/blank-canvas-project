import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Play, Clock, Gift, CheckCircle, Loader2, AlertTriangle, Youtube, Shield } from 'lucide-react';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useTabFocusGuard } from '@/hooks/useTabFocusGuard';
import { useNavigationBlock } from '@/hooks/useNavigationBlock';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  title: string;
  channel_name: string;
  video_id: string;
  duration_seconds: number;
  reward_amount: number;
}

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onComplete: () => void;
}

type ModalStep = 'youtube_auth' | 'playing' | 'completed' | 'violation';

const VideoPlayerModal = ({ isOpen, onClose, task, onComplete }: VideoPlayerModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<ModalStep>('youtube_auth');
  const [isYouTubeAuthenticated, setIsYouTubeAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [violationReason, setViolationReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);

  const handleViolation = useCallback((reason: string) => {
    setViolationReason(reason);
    setStep('violation');
  }, []);

  const handleVideoComplete = useCallback(() => {
    setStep('completed');
  }, []);

  const {
    containerRef,
    state: playerState,
    playVideo,
    pauseVideo,
    remainingTime,
  } = useYouTubePlayer({
    videoId: task?.video_id || '',
    targetDuration: task?.duration_seconds || 0,
    onComplete: handleVideoComplete,
    onViolation: handleViolation,
  });

  const { isFocused, focusLossCount, reset: resetFocusGuard } = useTabFocusGuard({
    isActive: isOpen && step === 'playing' && playerState.isPlaying,
    onFocusLost: () => {
      pauseVideo();
      setShowFocusWarning(true);
    },
    onFocusRestored: () => {
      setShowFocusWarning(false);
      if (step === 'playing') {
        playVideo();
      }
    },
    onViolation: handleViolation,
    maxFocusLosses: 3,
  });

  useNavigationBlock({
    isActive: isOpen && step === 'playing',
    message: 'Se você sair agora, a tarefa será cancelada e você não receberá a recompensa. Tem certeza?',
  });

  useEffect(() => {
    if (isOpen && task) {
      // Check if user already authenticated with Google
      // For this implementation, we'll check provider in user metadata
      const hasGoogleAuth = user?.app_metadata?.provider === 'google' || 
                            user?.app_metadata?.providers?.includes('google');
      
      if (hasGoogleAuth) {
        setIsYouTubeAuthenticated(true);
        setStep('playing');
      } else {
        setIsYouTubeAuthenticated(false);
        setStep('youtube_auth');
      }
      
      setViolationReason(null);
      resetFocusGuard();
    }
  }, [isOpen, task, user, resetFocusGuard]);

  const handleYouTubeAuth = async () => {
    setIsAuthenticating(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        console.error('YouTube auth error:', error);
        setIsAuthenticating(false);
      }
      // If successful, the page will redirect
    } catch (err) {
      console.error('YouTube auth error:', err);
      setIsAuthenticating(false);
    }
  };

  const handleClose = () => {
    if (step === 'playing' && playerState.isPlaying) {
      // Don't allow closing while playing
      return;
    }
    onClose();
  };

  const handleClaimReward = async () => {
    if (step !== 'completed') return;
    
    setIsSubmitting(true);
    await onComplete();
    setIsSubmitting(false);
    onClose();
  };

  const handleRetry = () => {
    setViolationReason(null);
    setStep('youtube_auth');
    resetFocusGuard();
  };

  if (!task) return null;

  const progress = Math.min(((task.duration_seconds - remainingTime) / task.duration_seconds) * 100, 100);
  const minutes = Math.floor(remainingTime / 60);
  const seconds = Math.floor(remainingTime % 60);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="glass border-border/50 max-w-4xl p-0 overflow-hidden"
        onPointerDownOutside={(e) => step === 'playing' && e.preventDefault()}
        onEscapeKeyDown={(e) => step === 'playing' && e.preventDefault()}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {step === 'youtube_auth' && <Youtube className="h-5 w-5 text-red-500" />}
            {step === 'playing' && <Play className="h-5 w-5 text-primary" />}
            {step === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {step === 'violation' && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* YouTube Authentication Step */}
          {step === 'youtube_auth' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <Youtube className="h-10 w-10 text-red-500" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Autenticação Necessária</h3>
                <p className="text-muted-foreground max-w-md">
                  Para garantir que você assista ao vídeo de forma legítima, é necessário conectar sua conta do YouTube/Google.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Seus dados estão seguros e protegidos</span>
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                onClick={handleYouTubeAuth}
                disabled={isAuthenticating}
                className="gap-2"
              >
                {isAuthenticating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Youtube className="h-5 w-5" />
                )}
                Conectar com YouTube
              </Button>

              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          )}

          {/* Video Playing Step */}
          {step === 'playing' && (
            <>
              {/* Focus Warning */}
              {showFocusWarning && (
                <Alert variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção!</AlertTitle>
                  <AlertDescription>
                    O vídeo foi pausado porque você saiu da aba. Retorne à aba para continuar assistindo.
                    Saídas restantes: {3 - focusLossCount}
                  </AlertDescription>
                </Alert>
              )}

              {/* Video Player Container */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <div ref={containerRef} className="w-full h-full" />
                
                {/* Overlay to prevent right-click and interaction */}
                <div 
                  className="absolute inset-0 z-10"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ pointerEvents: playerState.isReady ? 'none' : 'auto' }}
                />

                {/* Loading State */}
                {!playerState.isReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Progress Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Tempo restante: {minutes}:{seconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">
                      Kz {task.reward_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Progress value={progress} className="h-2" />

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Modo anti-fraude ativo
                  </span>
                  <span>•</span>
                  <span>Não é permitido avançar o vídeo</span>
                </div>
              </div>

              {/* Warning Banner */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  Assista ao vídeo até o final sem sair desta tela. 
                  Pular partes ou sair da aba invalidará a tarefa.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Completed Step */}
          {step === 'completed' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-green-500">Vídeo Completo!</h3>
                <p className="text-muted-foreground">
                  Parabéns! Você assistiu o vídeo até o final e pode resgatar sua recompensa.
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-gradient">
                  Kz {task.reward_amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Recompensa disponível</p>
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                onClick={handleClaimReward}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Gift className="h-5 w-5" />
                )}
                Resgatar Recompensa
              </Button>
            </div>
          )}

          {/* Violation Step */}
          {step === 'violation' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-destructive">Tarefa Invalidada</h3>
                <p className="text-muted-foreground max-w-md">
                  {violationReason || 'A tarefa foi invalidada devido a uma violação das regras.'}
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button variant="default" onClick={handleRetry}>
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayerModal;
