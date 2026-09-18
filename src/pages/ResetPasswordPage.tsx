import React from 'react';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { Loader2, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

export const ResetPasswordPage: React.FC = () => {
  const { clearPasswordRecovery } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const getErrorMessage = (error: any): string => {
    const msg = error?.message || '';
    if (msg.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (msg.includes('same_password') || msg.includes('should be different')) {
      return 'A nova senha deve ser diferente da senha anterior.';
    }
    if (msg.includes('session') || msg.includes('Auth session missing') || msg.includes('expired')) {
      return 'O link de recuperação expirou ou é inválido. Solicite um novo link.';
    }
    return error?.message || 'Ocorreu um erro ao redefinir a senha. Tente novamente.';
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast('Preencha os campos de nova senha e confirmação.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('As senhas digitadas não coincidem. Verifique e tente novamente.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setIsSuccess(true);
      showToast('Senha redefinida com sucesso!', 'success');

      // Aguarda breve intervalo para que o usuário veja a confirmação visual antes de ir para o login
      setTimeout(async () => {
        await clearPasswordRecovery();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = async () => {
    await clearPasswordRecovery();
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
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              </div>
              <h2 className="text-2xl font-display font-bold text-black">
                Senha Redefinida!
              </h2>
              <p className="text-sm text-muted">
                Sua senha foi alterada com sucesso. Redirecionando para a tela de login...
              </p>
              <Button
                type="button"
                className="w-full bg-black hover:bg-black/80 focus:ring-black/30 border-black mt-4"
                size="lg"
                onClick={handleBackToLogin}
              >
                Ir para o Login
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2 text-black">
                <KeyRound className="w-6 h-6 text-secondary" />
                <h2 className="text-2xl font-display font-bold">Redefinir Senha</h2>
              </div>
              <p className="text-xs text-muted text-center mb-6">
                Crie uma nova senha de acesso para sua conta no Portal de Membro.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  label="Nova Senha"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="focus:outline-none cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-muted" />
                      ) : (
                        <Eye className="w-5 h-5 text-muted" />
                      )}
                    </button>
                  }
                />

                <Input
                  label="Confirmar Nova Senha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-muted" />
                      ) : (
                        <Eye className="w-5 h-5 text-muted" />
                      )}
                    </button>
                  }
                />

                <p className="text-[11px] text-muted">
                  * A senha deve conter no mínimo 6 caracteres.
                </p>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-black/80 focus:ring-black/30 border-black"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redefinindo...
                    </span>
                  ) : (
                    'Redefinir Senha'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2 border-black text-black hover:bg-black/10 focus:ring-black/30"
                  onClick={handleBackToLogin}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Button>
              </form>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};
