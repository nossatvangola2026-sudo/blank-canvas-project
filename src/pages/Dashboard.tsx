import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Wallet, Clock, CheckCircle, LogOut, Settings, ArrowDownCircle } from 'lucide-react';
import TaskCard from '@/components/home/TaskCard';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import WithdrawModal from '@/components/WithdrawModal';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  channel_name: string;
  video_id: string;
  duration_seconds: number;
  reward_amount: number;
  status: string;
}

interface TaskCompletion {
  task_id: string;
}

const Dashboard = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    fetchCompletedTasks();
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'active')
      .order('reward_amount', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  };

  const fetchCompletedTasks = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching completions:', error);
    } else {
      setCompletedTaskIds((data || []).map((c: TaskCompletion) => c.task_id));
    }
  };

  const handleTaskClick = (task: Task) => {
    if (completedTaskIds.includes(task.id)) {
      toast({
        title: 'Tarefa já concluída',
        description: 'Você já completou esta tarefa.',
      });
      return;
    }
    setSelectedTask(task);
    setIsVideoModalOpen(true);
  };

  const handleTaskComplete = async () => {
    if (!selectedTask || !user) return;

    const { error } = await supabase
      .from('task_completions')
      .insert({
        user_id: user.id,
        task_id: selectedTask.id,
        reward_earned: selectedTask.reward_amount,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          variant: 'destructive',
          title: 'Tarefa já concluída',
          description: 'Você já completou esta tarefa anteriormente.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível registrar a conclusão.',
        });
      }
    } else {
      toast({
        title: 'Parabéns! 🎉',
        description: `Você ganhou Kz ${selectedTask.reward_amount.toFixed(2)}!`,
      });
      setCompletedTaskIds([...completedTaskIds, selectedTask.id]);
      await refreshProfile();
    }

    setIsVideoModalOpen(false);
    setSelectedTask(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const availableTasks = tasks.filter(t => !completedTaskIds.includes(t.id));
  const completedCount = completedTaskIds.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary glow-sm">
                <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Make<span className="text-primary">Money</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="glass" size="sm" onClick={() => setIsWithdrawModalOpen(true)}>
                <Wallet className="h-4 w-4" />
                <span>Kz {profile?.balance?.toFixed(2) || '0,00'}</span>
              </Button>
              
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Atual
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient">
                Kz {profile?.balance?.toFixed(2) || '0,00'}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarefas Disponíveis
              </CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableTasks.length}</div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarefas Concluídas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw CTA */}
        {(profile?.balance || 0) >= 500 && (
          <Card className="glass border-primary/30 mb-8 glow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <ArrowDownCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Saldo disponível para saque!</p>
                  <p className="text-sm text-muted-foreground">
                    Você tem Kz {profile?.balance?.toFixed(2)} disponível
                  </p>
                </div>
              </div>
              <Button variant="hero" onClick={() => setIsWithdrawModalOpen(true)}>
                Sacar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tasks Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Tarefas <span className="text-gradient">Disponíveis</span>
          </h2>
          <p className="text-muted-foreground">
            Assista aos vídeos até o final para receber sua recompensa
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass border-border/50 animate-pulse">
                <div className="aspect-video bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : availableTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTasks.map((task, index) => (
              <div key={task.id} onClick={() => handleTaskClick(task)} className="cursor-pointer">
                <TaskCard
                  title={task.title}
                  channelName={task.channel_name}
                  videoId={task.video_id}
                  duration={task.duration_seconds}
                  reward={task.reward_amount}
                  index={index}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Todas as tarefas concluídas!</h3>
              <p className="text-muted-foreground text-center">
                Volte mais tarde para novas tarefas disponíveis.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modals */}
      <VideoPlayerModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        task={selectedTask}
        onComplete={handleTaskComplete}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        balance={profile?.balance || 0}
        onSuccess={refreshProfile}
      />
    </div>
  );
};

export default Dashboard;
