import React from 'react';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { Loader2, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const getErrorMessage = (error: any): string => {
    const msg = error?.message || '';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    }
    if (msg.includes('User already registered')) {
      return 'Este e-mail já está cadastrado. Tente fazer login.';
    }
    if (msg.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (msg.includes('Unable to validate email address')) {
      return 'E-mail inválido. Verifique o endereço digitado.';
    }
    return error?.message || 'Ocorreu um erro. Tente novamente.';
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Por favor, informe seu e-mail cadastrado.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/?type=recovery`
      });

      if (error) throw error;

      showToast('Instruções de recuperação enviadas! Verifique sua caixa de entrada e o spam.', 'success');
      setIsRecovering(false);
    } catch (error: any) {
      console.error('Erro ao recuperar senha:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Preencha o e-mail e a senha.', 'error');
      return;
    }
    if (isRegistering && !name) {
      showToast('Preencha seu nome completo.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await register({ email, firstName: name, password });
        showToast('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ToastContainer />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10 relative flex flex-col items-center">
          <Logo className="mb-4 w-48 h-48" />
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-black tracking-[0.2em] uppercase leading-none">
            Assembleia
          </h1>
          <div className="font-script text-5xl sm:text-6xl text-secondary -mt-6 sm:-mt-8 ml-12 sm:ml-16 relative z-10 drop-shadow-sm">
            Família Cristã
          </div>
          <p className="text-muted text-xs uppercase tracking-widest mt-2 font-semibold">
            Portal do Membro
          </p>
        </div>

        <Card className="p-8 border-t-4 border-secondary">
          {isRecovering ? (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2 text-black">
                <KeyRound className="w-6 h-6 text-secondary" />
                <h2 className="text-2xl font-display font-bold">Recuperar Senha</h2>
              </div>
              <p className="text-xs text-muted text-center mb-6">
                Informe o e-mail cadastrado no Portal de Membro. Enviaremos um link seguro para você redefinir sua senha.
              </p>

              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <Input
                  label="E-mail Cadastrado"
                  type="email"
                  placeholder="SEU@EMAIL.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toUpperCase())}
                  required
                  className="uppercase"
                />

                <Button type="submit" className="w-full bg-black hover:bg-black/80 focus:ring-black/30 border-black" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    'Enviar Link de Recuperação'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2 border-black text-black hover:bg-black/10 focus:ring-black/30"
                  onClick={() => setIsRecovering(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-display font-bold text-black mb-6 text-center">
                {isRegistering ? 'Criar Conta' : 'Acesso ao Portal'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <Input
                    label="Nome Completo"
                    type="text"
                    placeholder="SEU NOME"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    required={isRegistering}
                    className="uppercase"
                  />
                )}
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="SEU@EMAIL.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toUpperCase())}
                  required
                  className="uppercase"
                />

                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none cursor-pointer">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted" /> : <Eye className="w-5 h-5 text-muted" />}
                    </button>
                  }
                />

                {!isRegistering && (
                  <div className="text-right">
                    <button 
                      type="button" 
                      onClick={() => setIsRecovering(true)} 
                      className="text-sm text-black hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full bg-black hover:bg-black/80 focus:ring-black/30 border-black" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isRegistering ? 'Cadastrando...' : 'Entrando...'}
                    </span>
                  ) : (
                    isRegistering ? 'Cadastrar' : 'Entrar'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-muted/10 text-center">
                <p className="text-sm text-muted mb-2">
                  {isRegistering ? 'Já possui uma conta?' : 'Ainda não é cadastrado?'}
                </p>
                <Button
                  variant="outline"
                  className="w-full border-black text-black hover:bg-black/10 focus:ring-black/30"
                  onClick={() => setIsRegistering(!isRegistering)}
                >
                  {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

