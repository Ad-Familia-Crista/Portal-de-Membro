import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { DigitalIDCard } from '../components/DigitalIDCard';
import { Button } from '../components/Button';
import {
  User,
  CreditCard,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Bell,
  Calendar,
  Info,
  Plus,
  UserPlus,
  Shield,
  Cake,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/mapper';
import { Announcement } from '../types';
import { useToast } from '../components/Toast';
import { MuralSkeleton } from '../components/Skeletons';
import { memoryCache } from '../lib/cache';

export const HomePage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>(() => {
    return memoryCache.get<Announcement[]>('announcements') || [];
  });
  const [loading, setLoading] = React.useState(() => !memoryCache.get('announcements'));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null);

  const [formData, setFormData] = React.useState({
    title: '',
    dateInfo: '',
    type: 'info' as 'info' | 'event' | 'alert',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  const [blockingMessage, setBlockingMessage] = React.useState<string | null>(null);

  const fetchAnnouncements = React.useCallback(async (force = false) => {
    if (!force) {
      const cached = memoryCache.get<Announcement[]>('announcements');
      if (cached) {
        setAnnouncements(cached);
        setLoading(false);
        setLoadError(null);
        return;
      }
    }

    setLoading(true);
    setLoadError(null);
    try {
      // Otimização: Selecionar apenas as colunas necessárias para o mural
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, date_info, type, start_date, end_date, created_at')
        .order('start_date', { ascending: false });

      if (error) {
        console.warn('Aviso sobre busca de avisos no mural:', error.message || error);
        setLoadError('Não foi possível carregar os avisos do mural no momento.');
      } else if (data) {
        const camelData = toCamel(data) || [];
        setAnnouncements(camelData);
        memoryCache.set('announcements', camelData, 3 * 60 * 1000); // 3 minutos de cache
      }
    } catch (err: any) {
      console.warn('Exceção ao buscar avisos no mural:', err);
      setLoadError('Erro de conexão ao carregar avisos.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  if (!user) return null;

  const isAdminOrSecretary = user.role === 'ADMIN' || user.role === 'SECRETARY';
  const today = new Date().toISOString().split('T')[0];
  const userFirstName = (user.firstName || '').trim().split(/\s+/)[0] || 'Membro';

  const displayedAnnouncements = React.useMemo(() => {
    if (isAdminOrSecretary) return announcements;
    return announcements.filter(a => {
      const start = a.startDate;
      const end = a.endDate;
      const afterStart = !start || start <= today;
      const beforeEnd = !end || end >= today;
      return afterStart && beforeEnd;
    });
  }, [announcements, isAdminOrSecretary, today]);

  const handleNavigate = (pageId: string) => {
    if (user.aceitou_politica === false && user.data_recusa && (pageId === 'idcard' || pageId === 'register')) {
      setBlockingMessage("Não foi possível dar continuidade ao acesso à Carteira Digital e à Atualização de Cadastro, devido à não concordância com os termos de privacidade e consentimento de dados. Para mais informações, procure a secretaria da instituição.");
      return;
    }
    onNavigate(pageId);
  };

  const handleSaveAnnouncement = async () => {
    if (!formData.title || !formData.dateInfo || !formData.startDate) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    try {
      const payload = toSnake({
        title: formData.title,
        dateInfo: formData.dateInfo,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate || null
      });

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        showToast('Aviso atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([payload]);

        if (error) throw error;
        showToast('Aviso criado com sucesso!', 'success');
      }

      setIsModalOpen(false);
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        dateInfo: '',
        type: 'info',
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      });
      memoryCache.invalidate('announcements');
      fetchAnnouncements(true);
    } catch (err: any) {
      console.error('Erro ao salvar aviso:', err);
      showToast(err.message || 'Erro ao salvar aviso.', 'error');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      dateInfo: announcement.dateInfo,
      type: announcement.type,
      startDate: announcement.startDate,
      endDate: announcement.endDate || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este aviso permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Aviso excluído com sucesso!', 'success');
      memoryCache.invalidate('announcements');
      fetchAnnouncements(true);
    } catch (err: any) {
      console.error('Erro ao excluir aviso:', err);
      showToast(err.message || 'Erro ao excluir aviso.', 'error');
    }
  };

  const icons = {
    event: Calendar,
    info: Info,
    alert: Bell
  };

  const colors = {
    event: 'text-secondary bg-amber-50',
    info: 'text-black bg-black/10',
    alert: 'text-rose-500 bg-rose-50'
  };

  const menuItems: any[] = [];

  // Common items for all roles
  if (user.role === 'MEMBER') {
    menuItems.push({ id: 'register', label: 'Atualizar Cadastro', icon: ClipboardList, description: 'Mantenha seus dados em dia' });
    menuItems.push({ id: 'idcard', label: 'Carteirinha Digital', icon: CreditCard, description: 'Acesse sua identificação' });
  }

  // Reception specific items
  if (user.role === 'RECEPTION') {
    menuItems.push({ id: 'worship-frequency', label: 'Registrar Frequência', icon: ClipboardList, description: 'Lançar presenças dos cultos' });
    menuItems.push({ id: 'birthday-dashboard', label: 'Aniversariantes', icon: Cake, description: 'Ver e exportar aniversariantes' });
  }

  // Admin / Secretary items in required order
  if (user.role === 'ADMIN' || user.role === 'SECRETARY') {
    menuItems.push({ id: 'dashboard', label: 'Dashboards', icon: LayoutDashboard, description: 'KPIs e Gestão de Membros' });
    menuItems.push({ id: 'worship-frequency', label: 'Registrar Frequência', icon: ClipboardList, description: 'Lançar presenças dos cultos' });
    menuItems.push({ id: 'members', label: 'Gestão de Membros', icon: UserPlus, description: 'Visualizar e editar cadastros' });
    // Access management only for ADMIN, added later if applicable
  }

  // Access management (ADMIN only)
  if (user.role === 'ADMIN') {
    menuItems.push({ id: 'access', label: 'Gerenciamento de Acesso', icon: Shield, description: 'Gerir permissões de secretárias e membros' });
  }

  // Profile (Meu Login) should appear last
  menuItems.push({ id: 'profile', label: 'Meu Login', icon: User, description: 'Alterar e-mail e senha' });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <ToastContainer />

      <header className="flex items-center justify-between bg-[#343434] px-6 py-4 rounded-xl shadow-md border border-white/5">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-tight">Olá, {userFirstName.toUpperCase()}!</h1>
          <p className="text-[#EAAA00] text-sm font-medium mt-0.5">Seja bem-vindo(a) ao Portal de Membro</p>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="text-white hover:bg-white/10 font-semibold text-sm h-9 px-3 rounded-lg border border-white/15 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2 text-white" />
          Sair
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="space-y-4 pt-6">
          <div className="relative border-b border-[#E5E1DA] pb-2.5 mb-4">
            <h3 className="text-xl font-display font-bold text-[#111111]">
              Acesso Rápido
            </h3>
            <div className="absolute -bottom-[1px] left-0 w-12 h-[2px] bg-[#EAAA00] rounded-full" />
          </div>
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              onClick={() => handleNavigate(item.id)}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-xl card-shadow border border-[#E5E1DA] hover:border-[#EAAA00]/60 hover:bg-[#FFF9EB] hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="p-3 bg-[#FAF3E1] rounded-full text-[#EAAA00] group-hover:bg-[#111111] group-hover:text-[#EAAA00] transition-all shadow-sm">
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#111111] group-hover:text-black transition-colors">{item.label}</p>
                <p className="text-xs text-[#806F5F] font-medium">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#806F5F] group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          ))}
        </div>

        <Card title="Mural de Avisos" className="h-full flex flex-col gap-4">
          {loading ? (
            <div className="py-4 flex-1">
              <MuralSkeleton />
            </div>
          ) : loadError ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 flex-1 text-center">
              <p className="text-xs text-rose-600 font-semibold">{loadError}</p>
              <button 
                className="bg-[#EAAA00] text-[#111111] font-bold hover:bg-[#D99B00] px-4 py-2 rounded-lg text-xs shadow-sm transition-all cursor-pointer" 
                onClick={() => fetchAnnouncements(true)}
              >
                Tentar Novamente
              </button>
            </div>
          ) : displayedAnnouncements.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center flex-1">
              <p className="text-center text-xs text-[#806F5F] italic">Nenhum aviso ativo no momento.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[360px] md:max-h-[420px]">
              {displayedAnnouncements.map((notice) => {
                const Icon = icons[notice.type] || Info;

                // Calcular status do aviso para exibir selo aos administradores
                const start = notice.startDate;
                const end = notice.endDate;
                const isFuture = start && start > today;
                const isPast = end && end < today;
                let statusLabel = '';
                let statusColor = '';
                if (isFuture) {
                  statusLabel = 'Agendado';
                  statusColor = 'bg-amber-50 text-amber-800 border-amber-200';
                } else if (isPast) {
                  statusLabel = 'Expirado';
                  statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
                } else {
                  statusLabel = 'Ativo';
                  statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                }

                return (
                  <div
                    key={notice.id}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-[#FAF3E1]/40 hover:bg-[#FAF3E1]/80 transition-all border border-[#E5E1DA]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-[#FAF3E1] text-[#EAAA00] border border-[#EAAA00]/20 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[#111111] leading-tight">{notice.title}</p>
                          {isAdminOrSecretary && (
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#806F5F] font-semibold mt-1">{notice.dateInfo}</p>
                      </div>
                    </div>
                    {isAdminOrSecretary && (
                      <div className="flex gap-1 flex-shrink-0 self-center">
                        <button
                          onClick={() => handleEdit(notice)}
                          className="p-1 hover:bg-[#FAF3E1] rounded text-[#806F5F] hover:text-[#111111] transition-colors cursor-pointer"
                          title="Editar Aviso"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(notice.id)}
                          className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Excluir Aviso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isAdminOrSecretary && (
            <div className="flex gap-2 mt-auto pt-2">
              <Button 
                onClick={() => {
                  setEditingAnnouncement(null);
                  setFormData({
                    title: '',
                    dateInfo: '',
                    type: 'info',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: ''
                  });
                  setIsModalOpen(true);
                }} 
                size="sm" 
                className="w-full bg-[#343434] text-white hover:bg-[#222222] font-semibold py-2.5 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1 text-[#EAAA00]" /> Novo Aviso
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Modal CRUD de Avisos */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAnnouncement(null);
        }}
        title={editingAnnouncement ? "Editar Aviso" : "Adicionar Novo Aviso"}
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-[#E5E1DA] text-[#806F5F] hover:bg-black/5"
              onClick={() => {
                setIsModalOpen(false);
                setEditingAnnouncement(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-[#EAAA00] text-[#111111] font-bold hover:bg-[#D99B00] shadow-sm transition-colors"
              onClick={handleSaveAnnouncement} 
              disabled={!formData.title || !formData.dateInfo || !formData.startDate}
            >
              {editingAnnouncement ? "Salvar Alterações" : "Salvar Aviso"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1 uppercase">Título do Aviso *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Culto de Jovens"
              className="w-full p-2.5 rounded-lg border border-[#E5E1DA] focus:ring-2 focus:ring-[#EAAA00]/40 focus:border-[#EAAA00] outline-none text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1 uppercase">Descrição de Data/Horário *</label>
            <input
              type="text"
              value={formData.dateInfo}
              onChange={(e) => setFormData({ ...formData, dateInfo: e.target.value })}
              placeholder="Ex: Domingo às 18:00"
              className="w-full p-2.5 rounded-lg border border-[#E5E1DA] focus:ring-2 focus:ring-[#EAAA00]/40 focus:border-[#EAAA00] outline-none text-sm bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1 uppercase">Data de Início *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-[#E5E1DA] focus:ring-2 focus:ring-[#EAAA00]/40 focus:border-[#EAAA00] outline-none text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1 uppercase">Data de Fim (Opcional)</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-[#E5E1DA] focus:ring-2 focus:ring-[#EAAA00]/40 focus:border-[#EAAA00] outline-none text-sm bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1 uppercase">Tipo de Aviso *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full p-2.5 rounded-lg border border-[#E5E1DA] focus:ring-2 focus:ring-[#EAAA00]/40 focus:border-[#EAAA00] outline-none bg-white text-sm"
            >
              <option value="info">Informativo</option>
              <option value="event">Evento</option>
              <option value="alert">Alerta</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal de Termo de Consentimento Bloqueado */}
      <Modal
        isOpen={!!blockingMessage}
        onClose={() => setBlockingMessage(null)}
        title="Acesso Restrito"
        footer={
          <Button onClick={() => setBlockingMessage(null)} className="w-full">Entendido</Button>
        }
      >
        <div className="p-4 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <p className="text-sm text-muted font-medium leading-relaxed">
            {blockingMessage}
          </p>
        </div>
      </Modal>
    </div>
  );
};
