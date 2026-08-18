import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { Button } from './components/Button';
import { ChevronLeft } from 'lucide-react';
import { supabase } from './lib/supabase';
import { toCamel } from './lib/mapper';
import { Member } from './types';
import { PageSkeleton } from './components/Skeletons';
import { memoryCache } from './lib/cache';

// Lazy loading / Code splitting de páginas e componentes pesados
const RegistrationForm = lazy(() => import('./pages/RegistrationForm').then(m => ({ default: m.RegistrationForm })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MemberManagement = lazy(() => import('./pages/MemberManagement').then(m => ({ default: m.MemberManagement })));
const AccessManagement = lazy(() => import('./pages/AccessManagement').then(m => ({ default: m.AccessManagement })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const WorshipFrequencyPage = lazy(() => import('./pages/WorshipFrequency').then(m => ({ default: m.WorshipFrequencyPage })));
const BirthdayDashboard = lazy(() => import('./pages/BirthdayDashboard').then(m => ({ default: m.BirthdayDashboard })));
const DigitalIDCard = lazy(() => import('./components/DigitalIDCard').then(m => ({ default: m.DigitalIDCard })));
const PrivacyConsent = lazy(() => import('./components/PrivacyConsent').then(m => ({ default: m.PrivacyConsent })));

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('home');
  const [showPrivacyModal, setShowPrivacyModal] = React.useState(false);

  // Cache global de membros para otimização de performance
  const [members, setMembers] = React.useState<Member[]>(() => {
    return memoryCache.get<Member[]>('members_list') || [];
  });
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [hasFetchedMembers, setHasFetchedMembers] = React.useState(() => !!memoryCache.get('members_list'));

  // Refs de controle de sincronismo para evitar loops de renderização
  const isFetchingRef = React.useRef(false);

  const fetchMembersGlobal = React.useCallback(async (force = false) => {
    if (isFetchingRef.current) return;
    if (!force) {
      const cached = memoryCache.get<Member[]>('members_list');
      if (cached) {
        setMembers(cached);
        setHasFetchedMembers(true);
        return;
      }
    }
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SECRETARY' && user.role !== 'RECEPTION')) return;

    isFetchingRef.current = true;
    setMembersLoading(true);
    try {
      // Otimização: Seleção explícita de campos para listagem sem puxar blobs gigantes
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, first_name, last_name, cpf, rg, birth_date, marriage_date, spouse_name, 
          naturalness, nationality, marital_status, cep, address, number, neighborhood, city, state, 
          cell, phones, education, profession, is_baptized, is_holy_spirit_baptized, entry_date, 
          current_position, position_start_date, consecrated_to, consecration_date, departments, 
          leader_department, role, status, photo_url, valid_until, last_updated, aceitou_politica, 
          data_aceite, data_recusa, has_children, children, ministerial_history
        `)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Erro ao carregar membros no cache global:', error);
      } else {
        const camel = toCamel(data) || [];
        setMembers(camel);
        memoryCache.set('members_list', camel, 4 * 60 * 1000); // 4 minutos de cache
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
        return (
          <Suspense fallback={<PageSkeleton />}>
            <RegistrationForm />
          </Suspense>
        );
      case 'dashboard':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <AdminDashboard 
              members={members} 
              loading={membersLoading} 
              onRefresh={() => {
                memoryCache.invalidate('members_list');
                fetchMembersGlobal(true);
              }} 
            />
          </Suspense>
        );
      case 'members':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <MemberManagement 
              members={members} 
              loading={membersLoading} 
              onRefresh={() => {
                memoryCache.invalidate('members_list');
                fetchMembersGlobal(true);
              }}
              onUpdateMembers={(newMembers) => {
                setMembers(newMembers);
                memoryCache.set('members_list', newMembers, 4 * 60 * 1000);
              }}
            />
          </Suspense>
        );
      case 'access':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <AccessManagement />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <ProfilePage />
          </Suspense>
        );
      case 'worship-frequency':
        if (user.role !== 'ADMIN' && user.role !== 'SECRETARY' && user.role !== 'RECEPTION') {
          return <HomePage onNavigate={setCurrentPage} />;
        }
        return (
          <Suspense fallback={<PageSkeleton />}>
            <WorshipFrequencyPage />
          </Suspense>
        );
      case 'birthday-dashboard':
        if (user.role !== 'ADMIN' && user.role !== 'SECRETARY' && user.role !== 'RECEPTION') {
          return <HomePage onNavigate={setCurrentPage} />;
        }
        return (
          <Suspense fallback={<PageSkeleton />}>
            <BirthdayDashboard 
              members={members} 
              loading={membersLoading} 
              onRefresh={() => {
                memoryCache.invalidate('members_list');
                fetchMembersGlobal(true);
              }} 
            />
          </Suspense>
        );
      case 'idcard':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <div className="max-w-[500px] mx-auto p-4 flex flex-col items-center gap-8">
              <h1 className="text-2xl font-display font-bold text-primary">Carteira de Membro Digital</h1>
              <DigitalIDCard member={user} />
              <div className="text-center text-sm text-muted">
                <p>Se há alguma informação desatualizada na carteira digital, atualize seu cadastro.</p>
                <p className="mt-2 font-bold">Válida até: {user.validUntil}</p>
              </div>
            </div>
          </Suspense>
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
