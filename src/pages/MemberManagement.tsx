import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Member, DEPARTMENTS, CHILD_DEPARTMENTS, POSITIONS, MinisterialEvent } from '../types';
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
import { toCamel } from '../lib/mapper';
import { optimizeImage } from '../lib/imageOptimizer';
import { uploadMemberPhoto, deleteMemberPhoto } from '../services/storageService';
import { MemberTableSkeleton } from '../components/Skeletons';
import { useToast } from '../components/Toast';
import { exportTableToExcel } from '../services/excel/excelExportService';
import { loadAllDepartments, addDepartment, subscribeDepartments } from '../lib/departmentsService';
import { MinisterialEvolutionView } from '../components/MinisterialEvolutionView';
import { DepartmentSelect } from '../components/DepartmentSelect';

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
  const { showToast, ToastContainer } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const isSavingRef = React.useRef(false);
  const originalPhotoRef = React.useRef<string>('');
  const [showHistoryForm, setShowHistoryForm] = React.useState(false);
  const [customDeptInput, setCustomDeptInput] = React.useState('');
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
      ministerialHistory: [newEvent, ...(selectedMember.ministerialHistory || [])]
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

  const handleEdit = async (member: Member) => {
    setLoadingDetailsId(member.id);
    try {
      // Carregamento sob demanda pontual de photo_url e ministerial_history
      const { data, error } = await supabase
        .from('profiles')
        .select('photo_url, ministerial_history')
        .eq('id', member.id)
        .single();

      if (error) {
        console.warn('Aviso ao carregar dados complementares do membro:', error.message || error);
      }

      const camelDetails = data ? toCamel(data) : {};
      const fetchedPhoto = camelDetails.photoUrl !== undefined ? camelDetails.photoUrl : (member.photoUrl || '');
      originalPhotoRef.current = fetchedPhoto || '';

      // Garante sincronização de papéis de liderança se só houver leaderDepartment legado
      let initialRoles = member.departmentRoles || {};
      const hasLeadershipInRoles = Object.values(initialRoles).some(
        r => r && r !== 'Integrante' && r !== 'Membro'
      );
      if (!hasLeadershipInRoles && member.leaderDepartment) {
        const parsedRoles: Record<string, string> = { ...initialRoles };
        const segments = member.leaderDepartment.split(',').map(s => s.trim()).filter(Boolean);
        segments.forEach(seg => {
          if (seg.includes('—') || seg.includes('-')) {
            const parts = seg.split(/[—\-]/);
            const role = parts[0]?.trim() || 'Líder';
            const dept = parts.slice(1).join(' - ').trim();
            if (dept) parsedRoles[dept] = role;
          } else {
            parsedRoles[seg] = 'Líder';
          }
        });
        initialRoles = parsedRoles;
      }

      setSelectedMember({
        ...member,
        departmentRoles: initialRoles,
        photoUrl: fetchedPhoto,
        ministerialHistory: Array.isArray(camelDetails.ministerialHistory) 
          ? camelDetails.ministerialHistory 
          : (member.ministerialHistory || []),
        education: member.education ? (member.education.startsWith('Ensino ') ? member.education : `Ensino ${member.education}`) : ''
      });
      setIsEditModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao abrir edição do membro:', err);
      originalPhotoRef.current = member.photoUrl || '';
      // Fallback gracioso: abre o modal com os dados disponíveis sem travar a interface
      setSelectedMember({
        ...member,
        photoUrl: member.photoUrl || '',
        ministerialHistory: member.ministerialHistory || [],
        education: member.education ? (member.education.startsWith('Ensino ') ? member.education : `Ensino ${member.education}`) : ''
      });
      setIsEditModalOpen(true);
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (isSavingRef.current || !selectedMember) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // Calcula leader_department a partir de departmentRoles para compatibilidade retroativa
      const leaderDeptValue = selectedMember.departmentRoles
        ? Object.entries(selectedMember.departmentRoles)
            .filter(([_, role]) => role !== 'Integrante' && role !== 'Membro')
            .map(([d, r]) => `${r} - ${d}`)
            .join(', ')
        : (selectedMember.leaderDepartment || '');

      const nowIso = new Date().toISOString();

      // Payload explícito — apenas colunas que existem na tabela profiles
      const payload: Record<string, any> = {
        first_name: selectedMember.firstName || '',
        last_name: selectedMember.lastName || '',
        cpf: selectedMember.cpf || null,
        rg: selectedMember.rg || null,
        birth_date: selectedMember.birthDate || null,
        naturalness: selectedMember.naturalness || null,
        nationality: selectedMember.nationality || null,
        marital_status: selectedMember.maritalStatus || null,
        marriage_date: selectedMember.marriageDate || null,
        spouse_name: selectedMember.spouseName || null,
        has_children: selectedMember.hasChildren ?? false,
        children: selectedMember.children || [],
        cep: selectedMember.cep || null,
        address: selectedMember.address || null,
        number: selectedMember.number || null,
        complement: selectedMember.complement || null,
        neighborhood: selectedMember.neighborhood || null,
        city: selectedMember.city || null,
        state: selectedMember.state || null,
        cell: selectedMember.cell || null,
        phones: selectedMember.phones || [],
        email: selectedMember.email || null,
        education: selectedMember.education || null,
        profession: selectedMember.profession || null,
        is_baptized: selectedMember.isBaptized ?? false,
        baptism_church: selectedMember.baptismChurch || null,
        baptism_date: selectedMember.baptismDate || null,
        is_holy_spirit_baptized: selectedMember.isHolySpiritBaptized ?? false,
        previous_church: selectedMember.previousChurch || null,
        participates_in_convention: selectedMember.participatesInConvention ?? false,
        convention_name: selectedMember.conventionName || null,
        entry_date: selectedMember.entryDate || null,
        received_as: selectedMember.receivedAs || null,
        current_position: selectedMember.currentPosition || null,
        departments: selectedMember.departments || [],
        department_roles: selectedMember.departmentRoles || {},
        leader_department: leaderDeptValue,
        consecrated_to: selectedMember.consecratedTo || null,
        consecration_date: selectedMember.consecrationDate || null,
        ministerial_history: selectedMember.ministerialHistory || [],
        status: selectedMember.status || 'ACTIVE',
        role: selectedMember.role || 'MEMBER',
        valid_until: selectedMember.validUntil || null,
        last_updated: nowIso,
      };

      // Foto: só inclui se foi alterada (evita reenvio desnecessário de Base64)
      const initialPhoto = (originalPhotoRef.current || '').trim();
      const currentPhoto = (selectedMember.photoUrl || '').trim();
      let oldPhotoToDelete: string | null = null;
      let tUpload = 0;

      if (currentPhoto !== initialPhoto) {
        if (currentPhoto && (currentPhoto.startsWith('data:') || currentPhoto.startsWith('blob:'))) {
          const tUploadStart = performance.now();
          const uploadRes = await uploadMemberPhoto(selectedMember.id, currentPhoto, initialPhoto);
          tUpload = performance.now() - tUploadStart;
          payload.photo_url = uploadRes.url || null;
          oldPhotoToDelete = uploadRes.oldPhotoToDelete || null;
          console.info(`[PERF_GESTAO] Upload/Processamento da foto: ${tUpload.toFixed(1)} ms (${uploadRes.storageType})`);
        } else if (!currentPhoto && initialPhoto) {
          oldPhotoToDelete = initialPhoto;
          payload.photo_url = null;
        } else {
          payload.photo_url = currentPhoto || null;
        }
      }

      // Sanitiza campos DATE: string vazia → null
      const dateFields = ['birth_date', 'marriage_date', 'baptism_date', 'entry_date',
        'position_start_date', 'consecration_date', 'department_start_date'];
      for (const df of dateFields) {
        if (payload[df] === '') payload[df] = null;
      }

      const tDbStart = performance.now();
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', selectedMember.id);
      const tDatabase = performance.now() - tDbStart;

      if (error) {
        console.error('Erro ao salvar alterações do membro:', error);
        showToast('Não foi possível salvar as alterações. Tente novamente.', 'error');
      } else {
        // Exclui a foto antiga SOMENTE APÓS a confirmação do update no banco
        if (oldPhotoToDelete) {
          deleteMemberPhoto(oldPhotoToDelete).catch((delErr) => {
            console.warn('[STORAGE] Aviso ao remover foto antiga na gestão:', delErr);
          });
        }

        const savedMember = {
          ...selectedMember,
          leaderDepartment: leaderDeptValue,
          lastUpdated: nowIso,
        };
        onUpdateMembers(members.map(m => m.id === selectedMember.id ? savedMember : m));
        setIsEditModalOpen(false);
        showToast('Cadastro atualizado com sucesso!', 'success');
        console.info(`[PERF_GESTAO] Salvo com sucesso! Banco: ${tDatabase.toFixed(1)} ms | Foto: ${tUpload.toFixed(1)} ms`);
      }
    } catch (err: any) {
      console.error('Exceção ao salvar membro:', err);
      showToast('Erro de conexão ao salvar alterações. Tente novamente.', 'error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleExportExcel = async () => {
    if (!isAdmin || filteredMembers.length === 0) return;

    await exportTableToExcel({
      fileName: `gestao_membros_adfc_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Gestão de Membros',
      title: 'ADFC — Relatório de Gestão de Membros',
      data: filteredMembers,
      columns: [
        { header: 'Nome', key: 'firstName', alignment: 'left', formatter: m => m.firstName || '' },
        { header: 'Sobrenome', key: 'lastName', alignment: 'left', formatter: m => m.lastName || '' },
        { header: 'E-mail', key: 'email', alignment: 'left', formatter: m => m.email || '' },
        { header: 'Status', key: 'status', alignment: 'center', formatter: m => m.status === 'ACTIVE' ? 'Ativo' : 'Inativo' },
        { header: 'Nível de Acesso', key: 'role', alignment: 'center', formatter: m => m.role || '' },
        { 
          header: 'Data de Nascimento', 
          key: 'birthDate', 
          alignment: 'center', 
          formatter: m => m.birthDate ? m.birthDate.split('-').reverse().join('/') : '' 
        },
        { header: 'CPF', key: 'cpf', alignment: 'center', dataType: 'string', formatter: m => m.cpf || '' },
        { header: 'RG', key: 'rg', alignment: 'center', dataType: 'string', formatter: m => m.rg || '' },
        { header: 'WhatsApp / Celular', key: 'cell', alignment: 'center', dataType: 'string', formatter: m => m.cell || '' },
        { header: 'Endereço', key: 'address', alignment: 'left', formatter: m => m.address || '' },
        { header: 'Número', key: 'number', alignment: 'center', dataType: 'string', formatter: m => m.number || '' },
        { header: 'Bairro', key: 'neighborhood', alignment: 'left', formatter: m => m.neighborhood || '' },
        { header: 'Cidade', key: 'city', alignment: 'left', formatter: m => m.city || '' },
        { header: 'Estado / UF', key: 'state', alignment: 'center', formatter: m => m.state || '' },
        { header: 'CEP', key: 'cep', alignment: 'center', dataType: 'string', formatter: m => m.cep || '' },
        { header: 'Estado Civil', key: 'maritalStatus', alignment: 'center', formatter: m => m.maritalStatus || '' },
        { header: 'Cônjuge', key: 'spouseName', alignment: 'left', formatter: m => m.spouseName || '' },
        { 
          header: 'Data de Casamento', 
          key: 'marriageDate', 
          alignment: 'center', 
          formatter: m => m.marriageDate ? m.marriageDate.split('-').reverse().join('/') : '' 
        },
        { header: 'Profissão', key: 'profession', alignment: 'left', formatter: m => m.profession || '' },
        { header: 'Escolaridade', key: 'education', alignment: 'left', formatter: m => m.education || '' },
        { header: 'Batizado', key: 'isBaptized', alignment: 'center', formatter: m => m.isBaptized ? 'Sim' : 'Não' },
        { header: 'Batismo Espírito Santo', key: 'isHolySpiritBaptized', alignment: 'center', formatter: m => m.isHolySpiritBaptized ? 'Sim' : 'Não' },
        { header: 'Data de Entrada', key: 'entryDate', alignment: 'center', formatter: m => m.entryDate || '' },
        { header: 'Posição Atual', key: 'currentPosition', alignment: 'left', formatter: m => m.currentPosition || '' },
        { header: 'Departamentos', key: 'departments', alignment: 'left', formatter: m => (m.departments || []).join(', ') },
      ],
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <ToastContainer />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Gestão de Membros</h1>
          <p className="text-muted text-sm">Visualize e gerencie todos os cadastros da igreja</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
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
                            disabled={loadingDetailsId === member.id}
                            onClick={() => handleEdit(member)}
                            className="text-primary hover:bg-primary/10"
                            title="Editar Cadastro"
                          >
                            {loadingDetailsId === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <Edit2 className="w-4 h-4" />
                            )}
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
        onClose={() => {
          if (!isSaving) setIsEditModalOpen(false);
        }}
        title="Editar Cadastro Completo"
        footer={
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="min-w-[160px] flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
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
                        const compressed = await optimizeImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.82, format: 'auto' });
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
                    <option value="Separado(a)/Divorciado(a)">Separado(a)/Divorciado(a)</option>
                    {selectedMember.maritalStatus === 'Separado' && (
                      <option value="Separado">Separado(a)/Divorciado(a)</option>
                    )}
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
                              {/* Departamento da criança — acesso restrito a Admin e Secretaria */}
                              {(isAdmin || isSecretary) && (
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-muted mb-1 uppercase flex items-center gap-1">
                                    Departamento da Criança
                                    <span className="ml-1 text-[9px] bg-black/10 text-black/60 px-1.5 py-0.5 rounded font-mono">Admin/Sec</span>
                                  </label>
                                  <select
                                    value={(child.departments && child.departments[0]) || 'Nenhum Departamento'}
                                    onChange={(e) => {
                                      const newChildren = [...(selectedMember.children || [])];
                                      newChildren[idx].departments = [e.target.value];
                                      setSelectedMember({ ...selectedMember, children: newChildren });
                                    }}
                                    className="w-full p-1.5 rounded border border-muted/20 text-xs bg-white"
                                  >
                                    {CHILD_DEPARTMENTS.map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
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
                <MinisterialEvolutionView
                  departments={selectedMember.departments || []}
                  departmentRoles={selectedMember.departmentRoles || {}}
                  leaderDepartment={selectedMember.leaderDepartment || ''}
                  consecratedTo={selectedMember.consecratedTo || ''}
                  consecrationDate={selectedMember.consecrationDate || ''}
                  children={selectedMember.children || []}
                  ministerialHistory={selectedMember.ministerialHistory || []}
                  showNotice={false}
                />
              )}

              {/* Admin Edit Form */}
              {(isAdmin || isSecretary) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-muted uppercase">Recebido como</label>
                      <p className="text-[10px] text-muted/70 italic -mt-0.5">Como o usuário entrou na igreja e qual a condição atual</p>
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
                      <label className="block text-[10px] font-bold text-muted mb-1 uppercase">Condição Atual</label>
                      <select
                        value={selectedMember.currentPosition}
                        onChange={(e) => setSelectedMember({ ...selectedMember, currentPosition: e.target.value })}
                        className="w-full p-2 rounded border border-muted/20 text-sm bg-white"
                      >
                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <DepartmentSelect
                    selectedDepartments={selectedMember.departments || []}
                    departmentRoles={selectedMember.departmentRoles || {}}
                    onChange={(nextDepts, nextRoles) => {
                      const leaders = Object.entries(nextRoles)
                        .filter(([_, role]) => role !== 'Integrante')
                        .map(([d, r]) => `${r} - ${d}`);
                      setSelectedMember({
                        ...selectedMember,
                        departments: nextDepts,
                        departmentRoles: nextRoles,
                        leaderDepartment: leaders.join(', '),
                      });
                    }}
                  />
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
                  {(selectedMember.ministerialHistory || []).map((event, idx) => (
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
