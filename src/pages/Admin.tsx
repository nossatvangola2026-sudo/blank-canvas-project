import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Play, ArrowLeft, Users, ListVideo, Wallet, Plus, Edit, Trash2, 
  CheckCircle, XCircle, Loader2, Clock, Smartphone, Ban, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  channel_name: string;
  video_id: string;
  duration_seconds: number;
  reward_amount: number;
  status: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  email?: string | null;
  balance: number;
  created_at: string;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string;
  phone_number: string | null;
  requested_at: string;
  profiles?: { username: string | null; email?: string | null };
}

interface DeviceFingerprint {
  id: string;
  user_id: string;
  fingerprint: string;
  user_agent: string | null;
  platform: string | null;
  screen_resolution: string | null;
  timezone: string | null;
  language: string | null;
  created_at: string;
  last_seen_at: string;
  is_blocked: boolean;
  block_reason: string | null;
  profiles?: { username: string | null; email?: string | null };
}

const Admin = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    channel_name: '',
    video_id: '',
    duration_seconds: 180,
    reward_amount: 50,
    status: 'active',
  });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Users state
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(true);

  // Devices state
  const [devices, setDevices] = useState<DeviceFingerprint[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchWithdrawals();
    fetchDevices();
  }, []);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setIsLoadingTasks(false);
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      // Fetch emails for users without username
      const usersWithEmails = await Promise.all(
        (data || []).map(async (u) => {
          if (!u.username) {
            const { data: emailData } = await supabase.rpc('get_user_email', { _user_id: u.id });
            return { ...u, email: emailData };
          }
          return u;
        })
      );
      setUsers(usersWithEmails);
    }
    setIsLoadingUsers(false);
  };

  const fetchWithdrawals = async () => {
    setIsLoadingWithdrawals(true);
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
    } else {
      // Fetch usernames and emails separately
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (w) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', w.user_id)
            .maybeSingle();
          
          let email = null;
          if (!profileData?.username) {
            const { data: emailData } = await supabase.rpc('get_user_email', { _user_id: w.user_id });
            email = emailData;
          }
          
          return { ...w, profiles: { ...profileData, email } };
        })
      );
      setWithdrawals(withdrawalsWithProfiles);
    }
    setIsLoadingWithdrawals(false);
  };

  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    const { data, error } = await supabase
      .from('device_fingerprints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching devices:', error);
    } else {
      // Fetch usernames and emails separately
      const devicesWithProfiles = await Promise.all(
        (data || []).map(async (d) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', d.user_id)
            .maybeSingle();
          
          let email = null;
          if (!profileData?.username) {
            const { data: emailData } = await supabase.rpc('get_user_email', { _user_id: d.user_id });
            email = emailData;
          }
          
          return { ...d, profiles: { ...profileData, email } };
        })
      );
      setDevices(devicesWithProfiles as DeviceFingerprint[]);
    }
    setIsLoadingDevices(false);
  };

  const handleBlockDevice = async (deviceId: string, shouldBlock: boolean, reason?: string) => {
    const { error } = await supabase
      .from('device_fingerprints')
      .update({ 
        is_blocked: shouldBlock, 
        block_reason: shouldBlock ? (reason || 'Bloqueado pelo administrador') : null 
      })
      .eq('id', deviceId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } else {
      toast({ title: shouldBlock ? 'Dispositivo bloqueado!' : 'Dispositivo desbloqueado!' });
      fetchDevices();
    }
  };

  const handleSaveTask = async () => {
    setIsSubmittingTask(true);

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskForm.title,
          channel_name: taskForm.channel_name,
          video_id: taskForm.video_id,
          duration_seconds: taskForm.duration_seconds,
          reward_amount: taskForm.reward_amount,
          status: taskForm.status as 'active' | 'inactive',
        })
        .eq('id', editingTask.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
      } else {
        toast({ title: 'Tarefa atualizada!' });
        fetchTasks();
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: taskForm.title,
          channel_name: taskForm.channel_name,
          video_id: taskForm.video_id,
          duration_seconds: taskForm.duration_seconds,
          reward_amount: taskForm.reward_amount,
          status: taskForm.status as 'active' | 'inactive',
        });

      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
      } else {
        toast({ title: 'Tarefa criada!' });
        fetchTasks();
      }
    }

    setIsSubmittingTask(false);
    setIsTaskModalOpen(false);
    resetTaskForm();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      channel_name: task.channel_name,
      video_id: task.video_id,
      duration_seconds: task.duration_seconds,
      reward_amount: task.reward_amount,
      status: task.status,
    });
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } else {
      toast({ title: 'Tarefa excluída!' });
      fetchTasks();
    }
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      channel_name: '',
      video_id: '',
      duration_seconds: 180,
      reward_amount: 50,
      status: 'active',
    });
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('withdrawals')
      .update({ 
        status: action, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', withdrawalId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } else {
      toast({ title: action === 'approved' ? 'Saque aprovado!' : 'Saque rejeitado!' });
      fetchWithdrawals();
      fetchUsers(); // Refresh balances
    }
  };

  // Helper function to display user identification (username or email)
  const getUserDisplayName = (username: string | null | undefined, email: string | null | undefined): string => {
    if (username) return username;
    if (email) return email;
    return 'Sem identificação';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500">Ativo</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-500">Inativo</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500">Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500">Rejeitado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary glow-sm">
                  <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">
                  Admin <span className="text-primary">Panel</span>
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={() => { signOut(); navigate('/'); }}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListVideo className="h-4 w-4" />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Saques</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Dispositivos</span>
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card className="glass border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gerenciar Tarefas</CardTitle>
                <Button variant="hero" onClick={() => { resetTaskForm(); setIsTaskModalOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTasks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Recompensa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.channel_name}</TableCell>
                          <TableCell>{Math.floor(task.duration_seconds / 60)}min</TableCell>
                          <TableCell>Kz {task.reward_amount.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle>Usuários Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{getUserDisplayName(user.username, user.email)}</TableCell>
                          <TableCell>Kz {user.balance.toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('pt-AO')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle>Solicitações de Saque</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWithdrawals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">
                            {getUserDisplayName(withdrawal.profiles?.username, withdrawal.profiles?.email)}
                          </TableCell>
                          <TableCell>Kz {withdrawal.amount.toFixed(2)}</TableCell>
                          <TableCell className="capitalize">{withdrawal.payment_method}</TableCell>
                          <TableCell>{withdrawal.phone_number || '-'}</TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell>
                            {new Date(withdrawal.requested_at).toLocaleDateString('pt-AO')}
                          </TableCell>
                          <TableCell>
                            {withdrawal.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleWithdrawalAction(withdrawal.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleWithdrawalAction(withdrawal.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Controle de Dispositivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Sistema Anti-Fraude:</strong> Cada dispositivo é identificado por uma impressão digital única. 
                    Um dispositivo só pode estar associado a uma conta. Bloqueie dispositivos suspeitos para impedir acesso.
                  </p>
                </div>
                {isLoadingDevices ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dispositivo registrado ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Plataforma</TableHead>
                          <TableHead>Resolução</TableHead>
                          <TableHead>Fuso Horário</TableHead>
                          <TableHead>Primeiro Acesso</TableHead>
                          <TableHead>Último Acesso</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((device) => (
                          <TableRow key={device.id} className={device.is_blocked ? 'bg-red-500/10' : ''}>
                            <TableCell className="font-medium">
                              {getUserDisplayName(device.profiles?.username, device.profiles?.email)}
                            </TableCell>
                            <TableCell>{device.platform || '-'}</TableCell>
                            <TableCell>{device.screen_resolution || '-'}</TableCell>
                            <TableCell>{device.timezone || '-'}</TableCell>
                            <TableCell>
                              {new Date(device.created_at).toLocaleDateString('pt-AO')}
                            </TableCell>
                            <TableCell>
                              {new Date(device.last_seen_at).toLocaleDateString('pt-AO')}
                            </TableCell>
                            <TableCell>
                              {device.is_blocked ? (
                                <Badge className="bg-red-500/20 text-red-500">
                                  <Ban className="h-3 w-3 mr-1" />
                                  Bloqueado
                                </Badge>
                              ) : (
                                <Badge className="bg-green-500/20 text-green-500">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Ativo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleBlockDevice(device.id, !device.is_blocked)}
                                className={device.is_blocked ? 'text-green-500' : 'text-red-500'}
                              >
                                {device.is_blocked ? (
                                  <>
                                    <ShieldCheck className="h-4 w-4 mr-1" />
                                    Desbloquear
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-4 w-4 mr-1" />
                                    Bloquear
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="glass border-border/50">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do vídeo para criar uma nova tarefa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Título do vídeo"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Nome do Canal</Label>
              <Input
                id="channel"
                value={taskForm.channel_name}
                onChange={(e) => setTaskForm({ ...taskForm, channel_name: e.target.value })}
                placeholder="Nome do canal"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoId">ID do Vídeo (YouTube)</Label>
              <Input
                id="videoId"
                value={taskForm.video_id}
                onChange={(e) => setTaskForm({ ...taskForm, video_id: e.target.value })}
                placeholder="Ex: dQw4w9WgXcQ"
                className="bg-background/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (segundos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={taskForm.duration_seconds}
                  onChange={(e) => setTaskForm({ ...taskForm, duration_seconds: parseInt(e.target.value) })}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward">Recompensa (Kz)</Label>
                <Input
                  id="reward"
                  type="number"
                  step="0.01"
                  value={taskForm.reward_amount}
                  onChange={(e) => setTaskForm({ ...taskForm, reward_amount: parseFloat(e.target.value) })}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {['active', 'inactive'].map((status) => (
                  <Card
                    key={status}
                    className={`cursor-pointer transition-all ${
                      taskForm.status === status 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 hover:border-primary/50'
                    }`}
                    onClick={() => setTaskForm({ ...taskForm, status })}
                  >
                    <CardContent className="flex items-center justify-center p-3">
                      {status === 'active' ? (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      )}
                      <span className="capitalize">{status === 'active' ? 'Ativo' : 'Inativo'}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleSaveTask} disabled={isSubmittingTask}>
              {isSubmittingTask ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingTask ? (
                'Salvar'
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
