import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Loader2, Clock, CheckCircle, XCircle, Building2, CreditCard, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  phone_number: string | null;
  requested_at: string;
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess: () => void;
}

const paymentMethods = [
  {
    id: 'iban',
    name: 'Transferência IBAN',
    description: 'Transferência bancária padrão (2-3 dias úteis)',
    icon: Building2,
  },
  {
    id: 'cardless',
    name: 'Levantamento sem Cartão',
    description: 'Levante em qualquer ATM sem cartão',
    icon: CreditCard,
  },
  {
    id: 'express',
    name: 'Transferência Express',
    description: 'Receba em minutos (taxa adicional)',
    icon: Zap,
  },
];

const withdrawSchema = z.object({
  amount: z.number().min(500, 'Valor mínimo é Kz 500,00').max(100000, 'Valor máximo é Kz 100.000,00'),
  paymentMethod: z.string().min(1, 'Selecione um método de pagamento'),
  accountInfo: z.string().min(1, 'Preencha as informações da conta'),
});

const WithdrawModal = ({ isOpen, onClose, balance, onSuccess }: WithdrawModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('iban');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchWithdrawals();
    }
  }, [isOpen, user]);

  const fetchWithdrawals = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching withdrawals:', error);
    } else {
      setWithdrawals(data || []);
    }
    setIsLoadingHistory(false);
  };

  const getPlaceholder = () => {
    switch (paymentMethod) {
      case 'iban':
        return 'AO06 0000 0000 0000 0000 0000 0';
      case 'cardless':
        return 'Número de telefone (923 456 789)';
      case 'express':
        return 'IBAN ou número de telefone';
      default:
        return '';
    }
  };

  const getLabel = () => {
    switch (paymentMethod) {
      case 'iban':
        return 'IBAN da conta';
      case 'cardless':
        return 'Número de telefone';
      case 'express':
        return 'IBAN ou telefone';
      default:
        return 'Informações da conta';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    
    const validation = withdrawSchema.safeParse({
      amount: amountNum,
      paymentMethod,
      accountInfo,
    });

    if (!validation.success) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: validation.error.errors[0].message,
      });
      return;
    }

    if (amountNum > balance) {
      toast({
        variant: 'destructive',
        title: 'Saldo insuficiente',
        description: `Seu saldo atual é Kz ${balance.toFixed(2)}`,
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user?.id,
        amount: amountNum,
        payment_method: paymentMethod,
        phone_number: accountInfo,
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao solicitar saque',
        description: error.message,
      });
    } else {
      toast({
        title: 'Saque solicitado!',
        description: getSuccessMessage(),
      });
      setAmount('');
      setAccountInfo('');
      onSuccess();
      fetchWithdrawals();
    }

    setIsSubmitting(false);
  };

  const getSuccessMessage = () => {
    switch (paymentMethod) {
      case 'iban':
        return 'Transferência será processada em 2-3 dias úteis.';
      case 'cardless':
        return 'Receberá SMS com código para levantamento em ATM.';
      case 'express':
        return 'Transferência express será processada em minutos.';
      default:
        return 'Seu saque será processado em breve.';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Pendente';
    }
  };

  const getMethodName = (method: string) => {
    const found = paymentMethods.find(m => m.id === method);
    return found?.name || method;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-border/50 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Sacar Dinheiro
          </DialogTitle>
          <DialogDescription>
            Saldo disponível: <span className="font-semibold text-primary">Kz {balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="withdraw" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="withdraw">Solicitar Saque</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="withdraw" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Payment Methods */}
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Card
                        key={method.id}
                        className={`cursor-pointer transition-all ${
                          paymentMethod === method.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border/50 hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setPaymentMethod(method.id);
                          setAccountInfo('');
                        }}
                      >
                        <CardContent className="flex items-start gap-3 p-3">
                          <div className={`p-2 rounded-lg ${paymentMethod === method.id ? 'bg-primary/20' : 'bg-muted'}`}>
                            <Icon className={`h-4 w-4 ${paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-sm">{method.name}</span>
                            <p className="text-xs text-muted-foreground">{method.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (Kz)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="500"
                  step="0.01"
                  className="bg-background/50"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo: Kz 500,00 | Máximo: Kz 100.000,00
                </p>
              </div>

              {/* Account Info */}
              <div className="space-y-2">
                <Label htmlFor="accountInfo">{getLabel()}</Label>
                <Input
                  id="accountInfo"
                  type="text"
                  placeholder={getPlaceholder()}
                  value={accountInfo}
                  onChange={(e) => setAccountInfo(e.target.value)}
                  className="bg-background/50"
                  required
                />
              </div>

              {/* Express Fee Notice */}
              {paymentMethod === 'express' && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
                  <p className="text-xs text-yellow-500">
                    ⚡ Transferência Express: Taxa de 2% aplicada ao valor do saque
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={isSubmitting || balance < 500}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Solicitar Saque'
                )}
              </Button>

              {balance < 500 && (
                <p className="text-xs text-destructive text-center">
                  Saldo mínimo para saque é Kz 500,00
                </p>
              )}
            </form>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="border-border/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Kz {withdrawal.amount.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(withdrawal.status)}
                          <span className="text-sm">{getStatusText(withdrawal.status)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{getMethodName(withdrawal.payment_method)}</span>
                        <span>{new Date(withdrawal.requested_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum saque realizado ainda
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawModal;
