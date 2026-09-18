import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Member, UserRole, DEPARTMENTS, CONSECRATIONS, POSITIONS, MinisterialEvent } from '../types';
import {
  Search,
  Edit2,
  Trash2,
  UserPlus,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Shield,
  X,
  Plus,
  ShieldAlert,
  Loader2,
  Camera,
  History
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';
import { toSnake, toCamel } from '../lib/mapper';
import { optimizeImage } from '../lib/imageOptimizer';
import { MemberTableSkeleton } from '../components/Skeletons';

interface MemberManagementProps {
  members: Member[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onUpdateMembers: (newMembers: Member[]) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  members,
  loading,
  onRefresh,
  onUpdateMembers
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [showHistoryForm, setShowHistoryForm] = React.useState(false);
  const [eventData, setEventData] = React.useState<Partial<MinisterialEvent>>({
    type: 'PROMOÇÃO',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  // PAGINAÇÃO (10 registros por página conforme solicitado)
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Resetar página quando fizer busca
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddEvent = () => {
    if (!selectedMember || !eventData.description || !eventData.date) return;

    const newEvent: MinisterialEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: eventData.type as any,
      description: eventData.description,
      position: eventData.position,
      department: eventData.department,
      date: eventData.date,
      registeredBy: user?.firstName || 'Admin'
    };

    setSelectedMember({
      ...selectedMember,
      ministerialHistory: [newEvent, ...selectedMember.ministerialHistory]
    });

    setEventData({
      type: 'PROMOÇÃO',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowHistoryForm(false);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isSecretary = user?.role === 'SECRETARY';
  const isReception = user?.role === 'RECEPTION';

  // Memoiza os filtros para não travar na renderização
  const filteredMembers = React.useMemo(() => {
    return members.filter(m => {
      // Ocultar perfis de secretaria, administrador e recepção da visualização
      if (m.role === 'ADMIN' || m.role === 'SECRETARY' || m.role === 'RECEPTION') {
        return false;
      }
      const term = searchTerm.toLowerCase();
      return (
        (m.firstName || '').toLowerCase().includes(term) ||
        (m.lastName || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term) ||
        (m.cpf || '').includes(searchTerm)
      );
    });
  }, [members, searchTerm]);

  // Aplica paginação sobre os resultados filtrados
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', member.id);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    } else {
      onUpdateMembers(members.map(m => m.id === member.id ? { ...m, status: newStatus as any } : m));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cadastro permanentemente?')) {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Erro ao excluir: ' + error.message);
      } else {
        onUpdateMembers(members.filter(m => m.id !== id));
      }
    }
  };

  const handleEdit = (member: Member) => {
    setSelectedMember({
      ...member,
      education: member.education ? (member.education.startsWith('Ensino ') ? member.education : `Ensino ${member.education}`) : ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (selectedMember) {
      const { error } = await supabase
        .from('profiles')
        .update(toSnake(selectedMember))
        .eq('id', selectedMember.id);

      if (error) {
        alert('Erro ao salvar: ' + error.message);
      } else {
        onUpdateMembers(members.map(m => m.id === selectedMember.id ? selectedMember : m));
        setIsEditModalOpen(false);
      }
    }
  };

  const handleExportExcel = () => {
    if (filteredMembers.length === 0) return;

    const headers = [
      'Nome', 'Sobrenome', 'Email', 'Status', 'Nível de Acesso', 'Nascimento',
      'CPF', 'RG', 'Celular', 'Endereço', 'Número', 'Bairro', 'Cidade', 'Estado', 'CEP',
      'Estado Civil', 'Cônjuge', 'Data Casamento',
      'Profissão', 'Escolaridade',
      'Batizado', 'Batismo Espírito Santo', 'Data Entrada',
      'Posição Atual', 'Departamentos'
    ];

    const csvContent = [
      headers.join(';'),
      ...filteredMembers.map(m => [
        m.firstName || '',
        m.lastName || '',
        m.email || '',
        m.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
        m.role || '',
        m.birthDate ? m.birthDate.split('-').reverse().join('/') : '',
        m.cpf || '',
        m.rg || '',
        m.cell || '',
        m.address || '',
        m.number || '',
        m.neighborhood || '',
        m.city || '',
        m.state || '',
        m.cep || '',
        m.maritalStatus || '',
        m.spouseName || '',
        m.marriageDate ? m.marriageDate.split('-').reverse().join('/') : '',
        m.profession || '',
        m.education || '',
        m.isBaptized ? 'Sim' : 'Não',
        m.isHolySpiritBaptized ? 'Sim' : 'Não',
        m.entryDate || '',
        m.currentPosition || '',
        (m.departments || []).join(', ')
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gestao_membros_adfc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Gestão de Membros</h1>
          <p className="text-muted text-sm">Visualize e gerencie todos os cadastros da igreja</p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isSecretary || isReception) && (
            <Button onClick={handleExportExcel} variant="outline" className="shadow-sm">
              <Download className="w-4 h-4 mr-2" /> Exportar Excel
            </Button>
          )}
        </div>
      </header>

      <Card className="p-0 overflow-hidden min-h-[400px] flex flex-col">
        <div className="p-4 border-b border-muted/10 bg-background/20 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-muted/20 focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-muted" onClick={onRefresh}>
              <Filter className="w-4 h-4 mr-2" /> Recarregar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-bold text-primary">Carregando membros...</p>
              </div>
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/40 text-[10px] uppercase tracking-wider font-bold text-muted">
                <th className="px-6 py-3 border-b border-muted/10">Membro</th>
                <th className="px-6 py-3 border-b border-muted/10">Status</th>
                <th className="px-6 py-3 border-b border-muted/10">Perfil</th>
                <th className="px-6 py-3 border-b border-muted/10">CPF</th>
                <th className="px-6 py-3 border-b border-muted/10 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/10">
              {filteredMembers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted italic">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(member.firstName || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-muted">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${member.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          }`}
                      >
                        {member.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inativo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Shield className="w-3 h-3" />
                        {member.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted font-mono">
                      {member.cpf}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(isAdmin || isSecretary) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(member)}
                            className="text-primary hover:bg-primary/10"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                            className="text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* CONTROLES DE PAGINAÇÃO */}
          {!loading && filteredMembers.length > itemsPerPage && (
            <div className="p-4 border-t border-muted/10 flex items-center justify-between bg-white sticky bottom-0">
              <span className="text-xs text-muted font-medium">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredMembers.length)} de {filteredMembers.length} registros
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center px-3 text-sm font-bold text-primary bg-primary/5 rounded-md">
                  Pág {currentPage} de {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modal de Edição */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cadastro Completo"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </div>
        }
      >
        {selectedMember && (
          <div className="space-y-6">
            {/* Foto de Perfil 3x3 */}
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-muted/20 rounded-xl bg-background/10 gap-3">
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider text-center">Foto do Membro (3x3)</label>
              <div className="relative w-28 h-28 rounded-xl border border-muted/20 overflow-hidden shadow-sm bg-white flex items-center justify-center group">
                {selectedMember.photoUrl ? (
                  <img src={selectedMember.photoUrl} alt="Foto do Membro" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted/50" />
                )}
                <div
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e: any) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await optimizeImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.82 });
                        setSelectedMember({
                          ...selectedMember,
                          photoUrl: compressed
                        });
                      } catch (err) {
                        console.error('Erro ao otimizar imagem:', err);
                        alert('Erro ao processar imagem.');
                      }
                    };
                    input.click();
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Alterar
                </div>
              </div>
              {selectedMember.photoUrl && (
                <button
                  type="button"
                  onClick={() => setSelectedMember({ ...selectedMember, photoUrl: '' })}
                  className="text-[10px] font-bold text-rose-500 hover:underline hover:text-rose-700"
                >
                  REMOVER FOTO
                </button>
              )}
            </div>

            {/* Dados Básicos */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-primary border-b border-muted/10 pb-1 uppercase tracking-wider">Dados Básicos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Nome Completo</label>
                  <input
                    type="text"
                    value={selectedMember.firstName}
                    onChange={(e) => setSelectedMember({ ...selectedMember, firstName: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">CPF</label>
                  <input
                    type="text"
                    value={selectedMember.cpf}
                    onChange={(e) => setSelectedMember({ ...selectedMember, cpf: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">RG</label>
                  <input
                    type="text"
                    value={selectedMember.rg}
                    onChange={(e) => setSelectedMember({ ...selectedMember, rg: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Data de Nascimento</label>
                  <input
                    type="text"
                    value={selectedMember.birthDate}
                    onChange={(e) => setSelectedMember({ ...selectedMember, birthDate: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Naturalidade</label>
                  <input
                    type="text"
                    value={selectedMember.naturalness}
                    onChange={(e) => setSelectedMember({ ...selectedMember, naturalness: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Estado Civil</label>
                  <select
                    value={selectedMember.maritalStatus}
                    onChange={(e) => setSelectedMember({ ...selectedMember, maritalStatus: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Solteiro">Solteiro(a)</option>
                    <option value="Casado">Casado(a)</option>
                    <option value="Viúvo">Viúvo(a)</option>
                    <option value="Separado">Separado(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Nacionalidade</label>
                  <input
                    type="text"
                    value={selectedMember.nationality}
                    onChange={(e) => setSelectedMember({ ...selectedMember, nationality: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Status</label>
                  <select
                    value={selectedMember.status}
                    onChange={(e) => setSelectedMember({ ...selectedMember, status: e.target.value as any })}
                    className="w-full p-2 rounded border border-muted/20 text-sm bg-white"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Família */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-primary border-b border-muted/10 pb-1 uppercase tracking-wider">Família</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedMember.maritalStatus === 'Casado' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Data de Casamento</label>
                      <input
                        type="text"
                        value={selectedMember.marriageDate || ''}
                        onChange={(e) => setSelectedMember({ ...selectedMember, marriageDate: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Nome do Cônjuge</label>
                      <input
                        type="text"
                        value={selectedMember.spouseName || ''}
                        onChange={(e) => setSelectedMember({ ...selectedMember, spouseName: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm"
                      />
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="block text-[10px] font-bold text-muted uppercase">Possui Filhos?</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input type="radio" checked={selectedMember.hasChildren} onChange={() => setSelectedMember({ ...selectedMember, hasChildren: true })} /> Sim
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="radio" checked={!selectedMember.hasChildren} onChange={() => setSelectedMember({ ...selectedMember, hasChildren: false })} /> Não
                      </label>
                    </div>
                  </div>

                  {selectedMember.hasChildren && (
                    <div className="space-y-3 mt-2 p-3 bg-muted/5 rounded-lg border border-muted/10">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-muted uppercase">Lista de Filhos</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newChild = { name: '', cpf: '', birthDate: '', congregates: 'Não' as const };
                            setSelectedMember({
                              ...selectedMember,
                              children: [...(selectedMember.children || []), newChild]
                            });
                          }}
                          className="text-[10px] font-bold text-secondary hover:underline"
                        >
                          + ADICIONAR FILHO
                        </button>
                      </div>
                      <div className="space-y-3">
                        {selectedMember.children?.map((child, idx) => (
                          <div key={idx} className="p-3 bg-white rounded border border-muted/10 space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                const newChildren = selectedMember.children?.filter((_, i) => i !== idx);
                                setSelectedMember({ ...selectedMember, children: newChildren });
                              }}
                              className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Nome do Filho"
                                value={child.name}
                                onChange={(e) => {
                                  const newChildren = [...(selectedMember.children || [])];
                                  newChildren[idx].name = e.target.value;
                                  setSelectedMember({ ...selectedMember, children: newChildren });
                                }}
                                className="w-full p-1.5 rounded border border-muted/20 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="CPF"
                                value={child.cpf}
                                onChange={(e) => {
                                  const newChildren = [...(selectedMember.children || [])];
                                  newChildren[idx].cpf = e.target.value;
                                  setSelectedMember({ ...selectedMember, children: newChildren });
                                }}
                                className="w-full p-1.5 rounded border border-muted/20 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Nascimento"
                                value={child.birthDate}
                                onChange={(e) => {
                                  const newChildren = [...(selectedMember.children || [])];
                                  newChildren[idx].birthDate = e.target.value;
                                  setSelectedMember({ ...selectedMember, children: newChildren });
                                }}
                                className="w-full p-1.5 rounded border border-muted/20 text-xs"
                              />
                              <select
                                value={child.congregates}
                                onChange={(e) => {
                                  const newChildren = [...(selectedMember.children || [])];
                                  newChildren[idx].congregates = e.target.value as any;
                                  setSelectedMember({ ...selectedMember, children: newChildren });
                                }}
                                className="w-full p-1.5 rounded border border-muted/20 text-xs bg-white"
                              >
                                <option value="Sim">Congrega</option>
                                <option value="Não">Não Congrega</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Endereço e Contato */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-primary border-b border-muted/10 pb-1 uppercase tracking-wider">Endereço e Contato</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">CEP</label>
                  <input
                    type="text"
                    value={selectedMember.cep}
                    onChange={(e) => setSelectedMember({ ...selectedMember, cep: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Endereço</label>
                  <input
                    type="text"
                    value={selectedMember.address}
                    onChange={(e) => setSelectedMember({ ...selectedMember, address: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Número</label>
                  <input
                    type="text"
                    value={selectedMember.number}
                    onChange={(e) => setSelectedMember({ ...selectedMember, number: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Complemento</label>
                  <input
                    type="text"
                    value={selectedMember.complement || ''}
                    onChange={(e) => setSelectedMember({ ...selectedMember, complement: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Bairro</label>
                  <input
                    type="text"
                    value={selectedMember.neighborhood}
                    onChange={(e) => setSelectedMember({ ...selectedMember, neighborhood: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Cidade</label>
                  <input
                    type="text"
                    value={selectedMember.city}
                    onChange={(e) => setSelectedMember({ ...selectedMember, city: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">UF</label>
                  <input
                    type="text"
                    value={selectedMember.state}
                    onChange={(e) => setSelectedMember({ ...selectedMember, state: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">WhatsApp</label>
                  <input
                    type="text"
                    value={selectedMember.cell}
                    onChange={(e) => setSelectedMember({ ...selectedMember, cell: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-muted uppercase">Outros Telefones</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember({
                          ...selectedMember,
                          phones: [...(selectedMember.phones || []), '']
                        });
                      }}
                      className="text-[10px] font-bold text-secondary hover:underline"
                    >
                      + ADICIONAR
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedMember.phones?.map((phone, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => {
                            const newPhones = [...(selectedMember.phones || [])];
                            newPhones[idx] = e.target.value;
                            setSelectedMember({ ...selectedMember, phones: newPhones });
                          }}
                          className="flex-1 p-2 rounded border border-muted/20 text-sm"
                          placeholder="(00) 00000-0000"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPhones = selectedMember.phones?.filter((_, i) => i !== idx);
                            setSelectedMember({ ...selectedMember, phones: newPhones });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">E-mail</label>
                  <input
                    type="email"
                    value={selectedMember.email}
                    onChange={(e) => setSelectedMember({ ...selectedMember, email: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Profissional e Espiritual */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-primary border-b border-muted/10 pb-1 uppercase tracking-wider">Profissional e Espiritual</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Escolaridade</label>
                  <select
                    value={selectedMember.education}
                    onChange={(e) => setSelectedMember({ ...selectedMember, education: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                    <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                    <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                    <option value="Ensino Médio Completo (ou colegial)">Ensino Médio Completo (ou colegial)</option>
                    <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                    <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Profissão</label>
                  <input
                    type="text"
                    value={selectedMember.profession}
                    onChange={(e) => setSelectedMember({ ...selectedMember, profession: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="block text-[10px] font-bold text-muted uppercase">Batizado nas Águas?</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="radio" checked={selectedMember.isBaptized} onChange={() => setSelectedMember({ ...selectedMember, isBaptized: true })} /> Sim
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="radio" checked={!selectedMember.isBaptized} onChange={() => setSelectedMember({ ...selectedMember, isBaptized: false })} /> Não
                    </label>
                  </div>
                </div>
                {selectedMember.isBaptized && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Igreja Batismo</label>
                      <input
                        type="text"
                        value={selectedMember.baptismChurch || ''}
                        onChange={(e) => setSelectedMember({ ...selectedMember, baptismChurch: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Data Batismo (MM/AAAA)</label>
                      <input
                        type="text"
                        value={selectedMember.baptismDate || ''}
                        onChange={(e) => setSelectedMember({ ...selectedMember, baptismDate: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm"
                      />
                    </div>
                  </>
                )}
                <div className="flex items-center gap-4">
                  <label className="block text-[10px] font-bold text-muted uppercase">Batizado no E.S.?</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="radio" checked={selectedMember.isHolySpiritBaptized} onChange={() => setSelectedMember({ ...selectedMember, isHolySpiritBaptized: true })} /> Sim
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="radio" checked={!selectedMember.isHolySpiritBaptized} onChange={() => setSelectedMember({ ...selectedMember, isHolySpiritBaptized: false })} /> Não
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Igreja Anterior</label>
                  <input
                    type="text"
                    value={selectedMember.previousChurch || ''}
                    onChange={(e) => setSelectedMember({ ...selectedMember, previousChurch: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="block text-[10px] font-bold text-muted uppercase">Participa de Convenção?</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="radio" checked={selectedMember.participatesInConvention} onChange={() => setSelectedMember({ ...selectedMember, participatesInConvention: true })} /> Sim
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="radio" checked={!selectedMember.participatesInConvention} onChange={() => setSelectedMember({ ...selectedMember, participatesInConvention: false })} /> Não
                    </label>
                  </div>
                </div>
                {selectedMember.participatesInConvention && (
                  <div>
                    <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Nome da Convenção</label>
                    <input
                      type="text"
                      value={selectedMember.conventionName || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, conventionName: e.target.value })}
                      className="w-full p-2 rounded border border-muted/20 text-sm"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* 7 - Evolução Ministerial */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-muted/10 pb-1">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">7 - Evolução Ministerial</h4>
                {!(isAdmin || isSecretary) && (
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> SOMENTE LEITURA
                  </span>
                )}
              </div>

              {/* Summary for Member */}
              {!(isAdmin || isSecretary) && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted uppercase font-bold">Cargo Atual</p>
                      <p className="text-sm font-bold text-primary">{selectedMember.currentPosition}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted uppercase font-bold">Departamentos</p>
                      <p className="text-sm font-bold text-primary">
                        {selectedMember.departments.length > 0 ? selectedMember.departments.join(', ') : 'Nenhum'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted uppercase font-bold">Tempo no Cargo</p>
                      <p className="text-sm font-bold text-primary">
                        {(() => {
                          const start = new Date(selectedMember.positionStartDate);
                          const now = new Date();
                          const diffTime = Math.abs(now.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const years = Math.floor(diffDays / 365);
                          const months = Math.floor((diffDays % 365) / 30);
                          return `${years} anos e ${months} meses`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Edit Form */}
              {(isAdmin || isSecretary) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-muted uppercase">Recebido como</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="radio"
                            checked={selectedMember.receivedAs === 'MEMBRO'}
                            onChange={() => setSelectedMember({ ...selectedMember, receivedAs: 'MEMBRO' })}
                          /> Membro
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="radio"
                            checked={selectedMember.receivedAs === 'CONGREGADO'}
                            onChange={() => setSelectedMember({ ...selectedMember, receivedAs: 'CONGREGADO' })}
                          /> Congregado
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Cargo Atual</label>
                      <select
                        value={selectedMember.currentPosition}
                        onChange={(e) => setSelectedMember({ ...selectedMember, currentPosition: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm bg-white"
                      >
                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Data de Início no Cargo</label>
                      <input
                        type="date"
                        value={selectedMember.positionStartDate}
                        onChange={(e) => setSelectedMember({ ...selectedMember, positionStartDate: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-muted uppercase">Departamentos Atuais</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {DEPARTMENTS.map(dept => (
                        <label key={dept} className="flex items-center gap-2 text-[10px] p-2 bg-muted/5 rounded">
                          <input
                            type="checkbox"
                            checked={selectedMember.departments.includes(dept)}
                            onChange={(e) => {
                              const current = selectedMember.departments;
                              const next = e.target.checked ? [...current, dept] : current.filter(d => d !== dept);
                              setSelectedMember({ ...selectedMember, departments: next });
                            }}
                            className="w-3 h-3 rounded text-secondary focus:ring-secondary"
                          />
                          {dept}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Consagração (Admin Only) */}
              {(isAdmin || isSecretary) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-muted/5">
                  <div>
                    <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Consagrado a:</label>
                    <select
                      value={selectedMember.consecratedTo || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, consecratedTo: e.target.value })}
                      className="w-full p-2 rounded border border-muted/20 text-sm bg-white h-10"
                    >
                      <option value="">Selecione...</option>
                      {CONSECRATIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Data da Consagração</label>
                    <input
                      type="date"
                      value={selectedMember.consecrationDate || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, consecrationDate: e.target.value })}
                      className="w-full p-2 rounded border border-muted/20 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Histórico Timeline */}
              <div className="space-y-4 pt-4 border-t border-muted/5">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3" /> Histórico Ministerial
                  </h5>
                  {(isAdmin || isSecretary) && (
                    <button
                      onClick={() => setShowHistoryForm(!showHistoryForm)}
                      className="text-[10px] font-bold text-secondary hover:underline"
                    >
                      {showHistoryForm ? 'CANCELAR' : '+ ADICIONAR EVENTO'}
                    </button>
                  )}
                </div>

                {showHistoryForm && (
                  <div className="p-4 bg-muted/5 rounded-lg border border-muted/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Tipo de Evento</label>
                        <select
                          value={eventData.type}
                          onChange={(e) => setEventData({ ...eventData, type: e.target.value as any })}
                          className="w-full p-2 rounded border border-muted/20 text-sm bg-white"
                        >
                          <option value="PROMOÇÃO">Promoção</option>
                          <option value="MUDANÇA_CARGO">Mudança de Cargo</option>
                          <option value="ENTRADA_DEPTO">Entrada em Departamento</option>
                          <option value="SAÍDA_DEPTO">Saída de Departamento</option>
                          <option value="CONSAGRAÇÃO">Consagração</option>
                          <option value="OUTRO">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Data do Evento</label>
                        <input
                          type="date"
                          value={eventData.date}
                          onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                          className="w-full p-2 rounded border border-muted/20 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Descrição</label>
                        <input
                          type="text"
                          value={eventData.description}
                          onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                          className="w-full p-2 rounded border border-muted/20 text-sm"
                          placeholder="Ex: Ingressou como Congregado"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddEvent} className="w-full h-8 text-xs">Salvar Evento</Button>
                  </div>
                )}

                <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/10">
                  {selectedMember.ministerialHistory.map((event, idx) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full bg-secondary border-2 border-white shadow-sm" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">
                            📅 {new Date(event.date).getFullYear()}
                          </span>
                          <span className="text-[10px] text-muted font-mono">{event.date}</span>
                        </div>
                        <p className="text-sm text-primary font-medium">{event.description}</p>
                        <p className="text-[10px] text-muted">
                          Registrado por: {event.registeredBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Foto e Metadados */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-primary border-b border-muted/10 pb-1 uppercase tracking-wider">Foto e Controle Administrativo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">URL da Foto</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedMember.photoUrl || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, photoUrl: e.target.value })}
                      className="flex-1 p-2 rounded border border-muted/20 text-sm"
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                    <div className="w-10 h-10 bg-muted/10 rounded border border-muted/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedMember.photoUrl ? (
                        <img src={selectedMember.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-muted" />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Ano de Entrada</label>
                  <input
                    type="text"
                    value={selectedMember.entryDate}
                    onChange={(e) => setSelectedMember({ ...selectedMember, entryDate: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Validade da Carteirinha</label>
                  <input
                    type="text"
                    value={selectedMember.validUntil}
                    onChange={(e) => setSelectedMember({ ...selectedMember, validUntil: e.target.value })}
                    className="w-full p-2 rounded border border-muted/20 text-sm"
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
};
