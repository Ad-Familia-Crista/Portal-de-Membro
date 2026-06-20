import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = React.useState(user?.email || '');
  const [newEmail, setNewEmail] = React.useState('');
  const [currentPass, setCurrentPass] = React.useState('');
  const [newPass, setNewPass] = React.useState('');

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      alert('Um e-mail de confirmação foi enviado para o novo endereço. A alteração será concluída após a confirmação em ambos os e-mails.');
      setNewEmail('');
    } catch (error: any) {
      alert('Erro ao atualizar e-mail: ' + error.message);
    }
  };

  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass) return;

    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      alert('Senha alterada com sucesso!');
      setNewPass('');
      setCurrentPass('');
    } catch (error: any) {
      alert('Erro ao atualizar senha: ' + error.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <header>
        <h1 className="text-2xl font-display font-bold text-primary">Meu Login</h1>
        <p className="text-muted">Gerencie suas credenciais de acesso</p>
      </header>

      <Card title="Alterar E-mail">
        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
            <ShieldCheck className="w-5 h-5" />
            <span>Para sua segurança, a alteração de e-mail requer autenticação via link enviado ao novo endereço.</span>
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
          <Button type="submit" className="w-full">Solicitar Alteração</Button>
        </form>
      </Card>

      <Card title="Alterar Senha">
        <form onSubmit={handleUpdatePass} className="space-y-4">
          <Input 
            label="Senha Atual" 
            type="password" 
            value={currentPass}
            onChange={e => setCurrentPass(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input 
            label="Nova Senha" 
            type="password" 
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button type="submit" variant="secondary" className="w-full">Atualizar Senha</Button>
        </form>
      </Card>
    </div>
  );
};
