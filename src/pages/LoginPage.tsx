import React from 'react';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../components/Toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

import { Logo } from '../components/Logo';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [isRegistering, setIsRegistering] = React.useState(false);
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
          <Logo className="mb-4" />
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary tracking-[0.2em] uppercase leading-none">
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
          <h2 className="text-2xl font-display font-bold text-primary mb-6 text-center">
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none">
                  {showPassword ? <EyeOff className="w-5 h-5 text-muted" /> : <Eye className="w-5 h-5 text-muted" />}
                </button>
              }
            />

            {!isRegistering && (
              <div className="text-right">
                <button type="button" className="text-sm text-primary hover:underline">
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
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
              className="w-full"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
