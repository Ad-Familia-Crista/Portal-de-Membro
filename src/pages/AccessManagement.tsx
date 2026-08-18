import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Member, UserRole } from '../types';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Search,
  ArrowRightLeft,
  Info,
  Loader2,
  ClipboardList
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toCamel } from '../lib/mapper';
import { Modal } from '../components/Modal';

export const AccessManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [normalMembers, setNormalMembers] = React.useState<Member[]>([]);
  const [loadingNormal, setLoadingNormal] = React.useState(false);
  const [searchNewUser, setSearchNewUser] = React.useState('');

  const fetchPrivilegedUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, status')
      .in('role', ['ADMIN', 'SECRETARY', 'RECEPTION'])
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar usuários de acesso:', error);
    } else {
      setUsers(toCamel(data));
    }
    setLoading(false);
  };

  const fetchNormalMembers = async () => {
    setLoadingNormal(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, status')
      .eq('role', 'MEMBER')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar membros:', error);
    } else {
      setNormalMembers(toCamel(data));
    }
    setLoadingNormal(false);
  };

  const handleGrantAccess = async (id: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);

    if (error) {
      alert('Erro ao conceder permissão: ' + error.message);
    } else {
      setIsAddModalOpen(false);
      setSearchNewUser('');
      fetchPrivilegedUsers(); // Recarrega a lista da tela
    }
  };

  React.useEffect(() => {
    fetchPrivilegedUsers();
  }, []);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-primary">Acesso Negado</h1>
        <p className="text-muted">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    if (id === currentUser.id) {
      alert('Você não pode alterar seu próprio nível de acesso.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);

    if (error) {
      alert('Erro ao alterar permissão: ' + error.message);
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <ShieldCheck className="w-5 h-5 text-rose-600" />;
      case 'SECRETARY': return <Shield className="w-5 h-5 text-amber-600" />;
      case 'RECEPTION': return <ClipboardList className="w-5 h-5 text-teal-600" />;
      default: return <User className="w-5 h-5 text-blue-600" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'SECRETARY': return 'Secretária';
      case 'RECEPTION': return 'Recepção';
      default: return 'Membro';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <header>
        <h1 className="text-2xl font-display font-bold text-primary">Gerenciamento de Acesso</h1>
        <p className="text-muted text-sm">Controle quem pode gerenciar a plataforma e os níveis de permissão</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Explicação dos Níveis */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Níveis de Permissão" className="bg-primary text-white border-none">
            <div className="space-y-6 mt-4">
              <div className="flex gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <p className="font-bold text-sm">Administrador</p>
                  <p className="text-[10px] text-white/70">Acesso total, exclusão de dados e gestão de permissões.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Shield className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <p className="font-bold text-sm">Secretária</p>
                  <p className="text-[10px] text-white/70">Gestão de membros, edição de dados e relatórios do Dash.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <p className="font-bold text-sm">Recepção</p>
                  <p className="text-[10px] text-white/70">Registro de frequências e relatórios de aniversariantes.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <User className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <p className="font-bold text-sm">Membro</p>
                  <p className="text-[10px] text-white/70">Acesso apenas aos próprios dados e carteirinha digital.</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Atenção:</strong> Alterar o nível de acesso de um usuário impacta imediatamente o que ele pode ver e fazer no portal.
            </p>
          </div>
        </div>

        {/* Lista de Usuários com Acesso */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text"
              placeholder="Buscar usuários com acesso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-muted/10 card-shadow outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id} className="p-4 hover:border-primary/20 transition-all group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-primary font-bold text-lg border-2 border-primary/5">
                      {u.firstName[0]}
                    </div>
                    <div>
                      <p className="font-bold text-primary">{u.firstName} {u.lastName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{u.email}</span>
                        <span className="w-1 h-1 rounded-full bg-muted/30" />
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                          {getRoleIcon(u.role)}
                          {getRoleLabel(u.role)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="text-xs font-bold p-2 rounded-lg border border-muted/10 bg-background outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="MEMBER">Membro (Padrão)</option>
                      <option value="RECEPTION">Recepção</option>
                      <option value="SECRETARY">Secretária</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                    <div className="p-2 text-muted group-hover:text-primary transition-colors">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button 
            variant="outline" 
            className="w-full py-6 border-dashed border-2 hover:bg-primary/5 text-muted hover:text-primary"
            onClick={() => {
              setIsAddModalOpen(true);
              fetchNormalMembers();
            }}
          >
            <User className="w-4 h-4 mr-2" /> Conceder acesso a novo usuário
          </Button>
        </div>
      </div>

      {/* Modal Adicionar Acesso */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Conceder Acesso Administrativo"
        footer={
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="w-full">
            Fechar
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">Pesquise por um membro comum para promovê-lo a Secretária ou Administrador.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchNewUser}
              onChange={(e) => setSearchNewUser(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-muted/20 focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {normalMembers.length === 0 && !loadingNormal ? (
              <p className="text-center text-sm text-muted italic py-4">Nenhum membro comum encontrado.</p>
            ) : loadingNormal ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              normalMembers
                .filter(m => 
                  (m.firstName || '').toLowerCase().includes(searchNewUser.toLowerCase()) || 
                  (m.email || '').toLowerCase().includes(searchNewUser.toLowerCase())
                )
                .map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-muted/10 rounded-lg hover:bg-primary/5">
                    <div>
                      <p className="text-sm font-bold text-primary">{member.firstName} {member.lastName}</p>
                      <p className="text-[10px] text-muted">{member.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleGrantAccess(member.id, 'RECEPTION')}
                        className="text-[10px] h-7 px-2 border-teal-500 text-teal-600 hover:bg-teal-50 hover:text-teal-700"
                      >
                        Recepção
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleGrantAccess(member.id, 'SECRETARY')}
                        className="text-[10px] h-7 px-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      >
                        Secretária
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleGrantAccess(member.id, 'ADMIN')}
                        className="text-[10px] h-7 px-2 border-rose-500 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        Admin
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
