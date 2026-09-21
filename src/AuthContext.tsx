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
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => Promise<void>;
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
  const [user, setUser] = React.useState<Member | null>(() => {
    try {
      const cached = localStorage.getItem('auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = React.useState(() => !localStorage.getItem('auth_user'));
  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      return window.location.hash.includes('type=recovery') ||
        new URLSearchParams(window.location.search).get('type') === 'recovery';
    } catch {
      return false;
    }
  });
  const isPasswordRecoveryRef = React.useRef(isPasswordRecovery);

  React.useEffect(() => {
    isPasswordRecoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  const clearPasswordRecovery = React.useCallback(async () => {
    isPasswordRecoveryRef.current = false;
    setIsPasswordRecovery(false);
    setUser(null);
    try {
      localStorage.removeItem('auth_user');
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      await supabase.auth.signOut().catch(err => {
        console.warn('Erro ao encerrar sessão de recuperação:', err);
      });
    } catch (err) {
      console.error('Erro ao limpar fluxo de recuperação:', err);
    }
  }, []);

  // In-flight promise tracker to deduplicate concurrent fetch requests for the same profile
  const fetchingProfileIdRef = React.useRef<string | null>(null);
  const inFlightProfilePromiseRef = React.useRef<Promise<Member | null> | null>(null);

  const fetchProfile = React.useCallback(async (userId: string): Promise<Member | null> => {
    if (!userId) return null;

    // Reuse in-flight request if one is already running for this user
    if (fetchingProfileIdRef.current === userId && inFlightProfilePromiseRef.current) {
      return inFlightProfilePromiseRef.current;
    }

    fetchingProfileIdRef.current = userId;
    const promise = (async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Erro ao buscar perfil:', error);
          const cached = localStorage.getItem('auth_user');
          if (cached) {
            try { return JSON.parse(cached); } catch {}
          }
          return null;
        }

        const camel = profile ? toCamel(profile) : null;
        if (camel) {
          try {
            localStorage.setItem('auth_user', JSON.stringify(camel));
          } catch {}
        }
        return camel;
      } catch (err) {
        console.error('Exceção ao buscar perfil:', err);
        const cached = localStorage.getItem('auth_user');
        if (cached) {
          try { return JSON.parse(cached); } catch {}
        }
        return null;
      } finally {
        fetchingProfileIdRef.current = null;
        inFlightProfilePromiseRef.current = null;
      }
    })();

    inFlightProfilePromiseRef.current = promise;
    return promise;
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    // Single source of truth: onAuthStateChange handles initial session and all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'PASSWORD_RECOVERY') {
          isPasswordRecoveryRef.current = true;
          if (isMounted) {
            setIsPasswordRecovery(true);
            setUser(null);
          }
          return;
        }

        // Se estiver em fluxo de recuperação de senha, não tratar eventos subsequentes como login de usuário normal
        if (isPasswordRecoveryRef.current) {
          return;
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (isMounted) {
            if (profile) {
              setUser(profile);
            } else {
              // Fallback minimal user profile if row is not created yet
              setUser(prev => prev || ({
                id: session.user.id,
                email: session.user.email || '',
                role: 'MEMBER',
                status: 'ACTIVE',
                firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'Membro'
              } as Member));
            }
          }
        } else {
          if (isMounted) setUser(null);
        }
      } catch (error) {
        console.error('Erro ao processar estado de autenticação:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);


  const login = async (email: string, pass: string) => {
    // 1. Autenticar com Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha no login. Tente novamente.');

    // 2. Buscar o perfil de forma deduplicada
    const profile = await fetchProfile(authData.user.id);
    if (profile) {
      setUser(profile);
    } else {
      const minimalUser: any = {
        id: authData.user.id,
        email: authData.user.email || email,
        role: 'MEMBER',
        status: 'ACTIVE',
        firstName: authData.user.user_metadata?.first_name || email.split('@')[0],
      };
      setUser(minimalUser);
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

    const updatedUser: Member = {
      ...user,
      ...data,
      lastUpdated: now.toISOString(),
      validUntil: validUntilDate.toISOString().split('T')[0]
    };

    // 1) Persiste no Supabase PRIMEIRO (sem atualização otimista prematura)
    const snakeData = toSnake({
      ...data,
      lastUpdated: updatedUser.lastUpdated,
      validUntil: updatedUser.validUntil
    });

    // Remover campos que não devem ser sobrescritos
    delete snakeData.id;
    delete snakeData.email;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(snakeData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[CADASTRO] Erro ao sincronizar perfil no Supabase:', error);
      throw error;
    }

    if (!updatedProfile) {
      const notFoundError = new Error('Nenhum registro foi atualizado no banco de dados.');
      console.error('[CADASTRO]', notFoundError);
      throw notFoundError;
    }

    // 2) SOMENTE após a confirmação real do banco de dados:
    const camelUpdated = toCamel(updatedProfile) as Member;
    const finalUser: Member = {
      ...user,
      ...camelUpdated,
      validUntil: updatedUser.validUntil,
      lastUpdated: updatedUser.lastUpdated
    };

    setUser(finalUser);
    try {
      localStorage.setItem('auth_user', JSON.stringify(finalUser));
    } catch {}

    return finalUser;
  };


  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || null,
      login,
      register,
      logout,
      updateUser,
      isLoading,
      isPasswordRecovery,
      clearPasswordRecovery
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
