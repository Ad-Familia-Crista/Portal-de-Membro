import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Mail, Lock, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [email, setEmail] = React.useState(user?.email || '');
  const [newEmail, setNewEmail] = React.useState('');
  const [currentPass, setCurrentPass] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [confirmPass, setConfirmPass] = React.useState('');

  const [loadingEmail, setLoadingEmail] = React.useState(false);
  const [loadingPass, setLoadingPass] = React.useState(false);

  React.useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = (newEmail || '').trim().toLowerCase();

    if (!cleanEmail) {
      showToast('Por favor, informe o novo e-mail.', 'error');
      return;
    }

    if (cleanEmail === email.toLowerCase()) {
      showToast('O novo e-mail deve ser diferente do e-mail atual.', 'error');
      return;
    }

    setLoadingEmail(true);
    try {
      // 1. Atualizar e-mail no Auth do Supabase
      const { error: authError } = await supabase.auth.updateUser({ email: cleanEmail });
      if (authError) throw authError;

      // 2. Atualizar e-mail na tabela de perfis
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: cleanEmail })
          .eq('id', user.id);

        if (profileError) {
          console.warn('Aviso ao atualizar email na tabela profiles:', profileError);
        }
      }

      showToast('Solicitação enviada! Verifique a caixa de entrada do seu novo e-mail para confirmar a alteração.', 'success');
      setNewEmail('');
    } catch (error: any) {
      console.error('Erro ao atualizar e-mail:', error);
      showToast(error.message || 'Não foi possível atualizar o e-mail. Verifique os dados.', 'error');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPass) {
      showToast('Por favor, digite a sua senha atual.', 'error');
      return;
    }

    if (!newPass || newPass.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    if (newPass !== confirmPass) {
      showToast('A confirmação da nova senha não confere.', 'error');
      return;
    }

    setLoadingPass(true);
    try {
      // 1. Validar a senha atual autenticando com o Supabase
      const userEmail = user?.email || email;
      if (userEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPass,
        });

        if (signInError) {
          showToast('A senha atual informada está incorreta.', 'error');
          setLoadingPass(false);
          return;
        }
      }

      // 2. Atualizar para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
      if (updateError) throw updateError;

      showToast('Senha alterada com sucesso!', 'success');
      setNewPass('');
      setConfirmPass('');
      setCurrentPass('');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      showToast(error.message || 'Erro ao alterar senha. Tente novamente.', 'error');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <ToastContainer />
      <header>
        <h1 className="text-2xl font-display font-bold text-primary">Meu Login</h1>
        <p className="text-muted">Gerencie suas credenciais de acesso</p>
      </header>

      <Card title="Alterar E-mail">
        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>Para sua segurança, a alteração de e-mail requer confirmação via link enviado ao novo endereço.</span>
          </div>
          <Input
            label="E-mail Atual"
            value={email}
            disabled
            icon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Novo E-mail"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="novo@email.com"
            required
          />
          <Button type="submit" className="w-full" disabled={loadingEmail || !newEmail}>
            {loadingEmail ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Solicitando...
              </span>
            ) : (
              'Solicitar Alteração de E-mail'
            )}
          </Button>
        </form>
      </Card>

      <Card title="Alterar Senha">
        <form onSubmit={handleUpdatePass} className="space-y-4">
          <Input
            label="Senha Atual *"
            type="password"
            value={currentPass}
            onChange={e => setCurrentPass(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input
            label="Nova Senha (mínimo 6 caracteres) *"
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input
            label="Confirmar Nova Senha *"
            type="password"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={loadingPass || !currentPass || !newPass || !confirmPass}>
            {loadingPass ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Atualizando Senha...
              </span>
            ) : (
              'Atualizar Senha'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};
