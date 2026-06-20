import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { RegistrationForm } from './pages/RegistrationForm';
import { AdminDashboard } from './pages/AdminDashboard';
import { MemberManagement } from './pages/MemberManagement';
import { AccessManagement } from './pages/AccessManagement';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyConsent } from './components/PrivacyConsent';
import { DigitalIDCard } from './components/DigitalIDCard';
import { Button } from './components/Button';
import { ChevronLeft } from 'lucide-react';
import { supabase } from './lib/supabase';
import { toCamel } from './lib/mapper';
import { Member } from './types';
import { WorshipFrequencyPage } from './pages/WorshipFrequency';
import { BirthdayDashboard } from './pages/BirthdayDashboard';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('home');
  const [showPrivacyModal, setShowPrivacyModal] = React.useState(false);

  // Cache global de membros para otimização de performance
  const [members, setMembers] = React.useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [hasFetchedMembers, setHasFetchedMembers] = React.useState(false);

  // Refs de controle de sincronismo para evitar loops infinitos de renderização no useEffect
  const isFetchingRef = React.useRef(false);
  const hasFetchedRef = React.useRef(false);

  const fetchMembersGlobal = React.useCallback(async (force = false) => {
    if (isFetchingRef.current) return;
    if (hasFetchedRef.current && !force) return;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SECRETARY' && user.role !== 'RECEPTION')) return;

    isFetchingRef.current = true;
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true }); // Ordena por nome na origem

      if (error) {
        console.error('Erro ao carregar membros no cache global:', error);
      } else {
        setMembers(toCamel(data) || []);
        hasFetchedRef.current = true;
        setHasFetchedMembers(true);
      }
    } catch (err) {
      console.error('Exceção ao carregar membros no cache global:', err);
    } finally {
      isFetchingRef.current = false;
      setMembersLoading(false);
    }
  }, [user]);

  // Carrega os dados sob demanda quando entra em abas administrativas ou aniversariantes
  React.useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SECRETARY' || user.role === 'RECEPTION')) {
      if (['dashboard', 'members', 'birthday-dashboard'].includes(currentPage)) {
        fetchMembersGlobal();
      }
    }
  }, [currentPage, user, fetchMembersGlobal]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'register':
        return <RegistrationForm />;
      case 'dashboard':
        return (
          <AdminDashboard 
            members={members} 
            loading={membersLoading} 
            onRefresh={() => fetchMembersGlobal(true)} 
          />
        );
      case 'members':
        return (
          <MemberManagement 
            members={members} 
            loading={membersLoading} 
            onRefresh={() => fetchMembersGlobal(true)}
            onUpdateMembers={setMembers}
          />
        );
      case 'access':
        return <AccessManagement />;
      case 'profile':
        return <ProfilePage />;
      case 'worship-frequency':
        if (user.role !== 'ADMIN' && user.role !== 'SECRETARY' && user.role !== 'RECEPTION') {
          return <HomePage onNavigate={setCurrentPage} />;
        }
        return <WorshipFrequencyPage />;
      case 'birthday-dashboard':
        if (user.role !== 'ADMIN' && user.role !== 'SECRETARY' && user.role !== 'RECEPTION') {
          return <HomePage onNavigate={setCurrentPage} />;
        }
        return (
          <BirthdayDashboard 
            members={members} 
            loading={membersLoading} 
            onRefresh={() => fetchMembersGlobal(true)} 
          />
        );
      case 'idcard':
        return (
          <div className="max-w-[500px] mx-auto p-4 flex flex-col items-center gap-8">
            <h1 className="text-2xl font-display font-bold text-primary">Carteira de Membro Digital</h1>
            <DigitalIDCard member={user} />
            <div className="text-center text-sm text-muted">
              <p>Se há alguma informação desatualizada na carteira digital, atualize seu cadastro.</p>
              <p className="mt-2 font-bold">Válida até: {user.validUntil}</p>
            </div>
          </div>
        );
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PrivacyConsent 
        forceOpen={showPrivacyModal} 
        onCloseForceOpen={() => setShowPrivacyModal(false)} 
      />
      
      {currentPage !== 'home' && (
        <div className="max-w-6xl mx-auto w-full p-4">
          <Button variant="ghost" onClick={() => setCurrentPage('home')}>
            <ChevronLeft className="w-5 h-5 mr-2" />
            Voltar para o Início
          </Button>
        </div>
      )}

      <main className="flex-1 py-8">
        {renderPage()}
      </main>

      <footer className="py-8 border-t border-muted/10 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-primary font-display font-bold mb-2">Assembleia de Deus Família Cristã</p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted">
            <button 
              onClick={() => setShowPrivacyModal(true)} 
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span>|</span>
            <button 
              onClick={() => setShowPrivacyModal(true)} 
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Termo de Uso
            </button>
          </div>
          <p className="mt-4 text-[10px] text-muted/60">
            © {new Date().getFullYear()} Ministério Vila dos Remédios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
