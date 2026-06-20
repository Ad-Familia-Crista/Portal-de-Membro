import React from 'react';
import { Member, UserRole } from './types';
import { supabase } from './lib/supabase';
import { toSnake, toCamel } from './lib/mapper';

interface AuthContextType {
  user: Member | null;
  role: UserRole | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<Member>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Mock Data
const MOCK_MEMBER: Member = {
  id: '1',
  email: 'membro@igreja.com',
  role: 'MEMBER',
  status: 'ACTIVE',
  firstName: 'João',
  lastName: 'Silva',
  cpf: '123.***.***-00',
  rg: '12.345.678-9',
  birthDate: '1990-05-15',
  naturalness: 'São Paulo-SP',
  nationality: 'Brasileiro(a)',
  maritalStatus: 'Casado',
  cep: '05107-000',
  address: 'Av. dos Remédios',
  number: '458',
  neighborhood: 'Vila dos Remédios',
  city: 'São Paulo',
  state: 'SP',
  phones: [],
  cell: '(11) 98765-4321',
  education: 'Superior Completo',
  profession: 'Engenheiro',
  isBaptized: true,
  isHolySpiritBaptized: true,
  entryDate: '2010',
  participatesInConvention: false,
  receivedAs: 'MEMBRO',
  departments: ['Mídia', 'Sonoplastia e Slide'],
  leaderDepartment: '',
  consecratedTo: '',
  consecrationDate: '',
  currentPosition: 'Membro',
  positionStartDate: '2010-01-01',
  ministerialHistory: [
    {
      id: 'h1',
      type: 'OUTRO',
      description: 'Ingressou como Congregado',
      date: '2010-01-01',
      registeredBy: 'Sistema'
    },
    {
      id: 'h2',
      type: 'MUDANÇA_CARGO',
      description: 'Recebido como Membro',
      date: '2011-05-15',
      registeredBy: 'Secretaria'
    }
  ],
  validUntil: '2025-12-31',
  lastUpdated: '2024-02-24',
  hasChildren: true,
  children: [
    {
      name: 'Pedro Silva',
      cpf: '444.555.666-77',
      birthDate: '2015-10-10',
      congregates: 'Sim',
      departments: ['Departamento Infantil – Cordeirinhos']
    }
  ],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<Member | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      // Safety timeout: if Supabase hangs (e.g. lock issue in StrictMode), we stop loading after 6s
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.warn('⚠️  Supabase demorou demais. Encerrando estado de carregamento.');
          setIsLoading(false);
        }
      }, 6000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
          } else if (profile && isMounted) {
            setUser(toCamel(profile));
          }
        }
      } catch (error) {
        console.error('Erro na inicialização da sessão:', error);
      } finally {
        clearTimeout(timeout);
        if (isMounted) setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (isMounted) setUser(profile ? toCamel(profile) : null);
        } else {
          if (isMounted) setUser(null);
        }
      } catch (error) {
        console.error('Erro ao processar mudança de estado de auth:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const login = async (email: string, pass: string) => {
    // 1. Autenticar com Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha no login. Tente novamente.');

    // 2. Buscar o perfil diretamente (sem depender do onAuthStateChange)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil após login:', profileError);
        // Perfil não encontrado na tabela - criar registro mínimo para o usuário entrar
        const minimalUser: any = {
          id: authData.user.id,
          email: authData.user.email || email,
          role: 'MEMBER',
          status: 'ACTIVE',
          firstName: authData.user.user_metadata?.first_name || email.split('@')[0],
        };
        setUser(minimalUser);
      } else if (profile) {
        setUser(toCamel(profile));
      } else {
        throw new Error('Perfil não encontrado. Entre em contato com a secretaria.');
      }
    } catch (err) {
      console.error('Erro no fluxo de login:', err);
    }
  };


  const register = async (data: any) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName || '',
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const newProfile = toSnake({
          id: authData.user.id,
          email: authData.user.email,
          role: 'MEMBER',
          status: 'ACTIVE',
          ...data 
        });
        
        delete newProfile.password;

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(newProfile);

        if (profileError) console.error('Erro ao criar perfil:', profileError);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    // Limpar o estado local imediatamente para dar feedback instantâneo na interface
    setUser(null);
    localStorage.removeItem('auth_user');
    setIsLoading(false);

    try {
      // Dispara o encerramento de sessão no Supabase em segundo plano (background) sem bloquear a UI
      supabase.auth.signOut().catch(error => {
        console.warn('Erro assíncrono ao encerrar sessão no Supabase:', error);
      });
    } catch (error) {
      console.error('Erro ao disparar encerramento de sessão no Supabase:', error);
    }
  };

  const updateUser = async (data: Partial<Member>) => {
    if (!user) return;
    
    const now = new Date();
    // Validade de 1 ano e 6 meses após a atualização
    const validUntilDate = new Date(now);
    validUntilDate.setMonth(validUntilDate.getMonth() + 18);

    const snakeData = toSnake({
      ...data,
      lastUpdated: now.toISOString(),
      validUntil: validUntilDate.toISOString().split('T')[0]
    });
    
    const { error } = await supabase
      .from('profiles')
      .update(snakeData)
      .eq('id', user.id);

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }

    setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
