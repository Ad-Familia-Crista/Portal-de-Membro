import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { WorshipFrequency, CULT_THEMES } from '../types';
import { supabase } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/mapper';
import { 
  ClipboardList, 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  Info,
  AlertTriangle
} from 'lucide-react';

export const WorshipFrequencyPage: React.FC = () => {
  const { user } = useAuth();
  
  // State da Lista
  const [records, setRecords] = React.useState<WorshipFrequency[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // State do Formulário
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  const [cultDate, setCultDate] = React.useState('');
  const [theme, setTheme] = React.useState<WorshipFrequency['theme']>('Culto da Família');
  const [totalAttendance, setTotalAttendance] = React.useState<number | ''>('');
  const [visitorsAttendance, setVisitorsAttendance] = React.useState<number | ''>('');
  const [childrenAttendance, setChildrenAttendance] = React.useState<number | ''>('');
  
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Buscar registros
  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('worship_frequency')
      .select('*')
      .order('cult_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar frequências:', error);
    } else {
      setRecords(toCamel(data) || []);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchRecords();
  }, []);

  // Calcular membros presentes reativamente (Fórmula: Total - (Visitantes + Crianças))
  const calculatedMembers = React.useMemo(() => {
    const total = Number(totalAttendance) || 0;
    const visitors = Number(visitorsAttendance) || 0;
    const children = Number(childrenAttendance) || 0;
    return Math.max(0, total - (visitors + children));
  }, [totalAttendance, visitorsAttendance, childrenAttendance]);

  // Formatar data localmente para exibição (DD/MM/AAAA)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleEdit = (record: WorshipFrequency) => {
    setIsEditing(true);
    setEditingId(record.id);
    setCultDate(record.cultDate);
    setTheme(record.theme);
    setTotalAttendance(record.totalAttendance);
    setVisitorsAttendance(record.visitorsAttendance);
    setChildrenAttendance(record.childrenAttendance || 0);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    // Rola a página para o topo de forma suave para focar no formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setCultDate('');
    setTheme('Culto da Família');
    setTotalAttendance('');
    setVisitorsAttendance('');
    setChildrenAttendance('');
    setErrorMsg(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este registro de frequência?')) {
      return;
    }

    const { error } = await supabase
      .from('worship_frequency')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      setRecords(records.filter(r => r.id !== id));
      setSuccessMsg('Registro de frequência excluído com sucesso.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validações
    if (!cultDate) {
      setErrorMsg('A data do culto é obrigatória.');
      return;
    }
    if (!theme) {
      setErrorMsg('O tema do culto é obrigatório.');
      return;
    }
    if (totalAttendance === '' || Number(totalAttendance) < 0) {
      setErrorMsg('A presença total deve ser maior ou igual a zero.');
      return;
    }
    if (visitorsAttendance === '' || Number(visitorsAttendance) < 0) {
      setErrorMsg('A presença de visitantes deve ser maior ou igual a zero.');
      return;
    }
    if (childrenAttendance === '' || Number(childrenAttendance) < 0) {
      setErrorMsg('A presença de crianças deve ser maior ou igual a zero.');
      return;
    }
    if (Number(visitorsAttendance) + Number(childrenAttendance) > Number(totalAttendance)) {
      setErrorMsg('A soma de visitantes e crianças não pode exceder a presença total.');
      return;
    }

    setSubmitting(true);
    
    const recordPayload = toSnake({
      cultDate,
      theme,
      totalAttendance: Number(totalAttendance),
      visitorsAttendance: Number(visitorsAttendance),
      childrenAttendance: Number(childrenAttendance)
    });

    console.log('Enviando dados da frequência:', recordPayload);

    try {
      if (isEditing && editingId) {
        // Atualizar
        const { error } = await supabase
          .from('worship_frequency')
          .update(recordPayload)
          .eq('id', editingId);

        if (error) throw error;
        
        setSuccessMsg('Frequência atualizada com sucesso!');
      } else {
        // Criar novo
        const { error } = await supabase
          .from('worship_frequency')
          .insert([recordPayload]);

        if (error) throw error;

        setSuccessMsg('Frequência registrada com sucesso!');
      }

      // Resetar formulário e recarregar
      handleCancel();
      fetchRecords();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar frequência:', err);
      // Tratamento de duplicação no Supabase (código 23505)
      if (err.code === '23505') {
        setErrorMsg('Já existe um registro de frequência cadastrado para este tema nesta data.');
      } else {
        setErrorMsg('Erro ao salvar no banco de dados: ' + (err.message || err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <header>
        <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" /> Registro de Frequência de Cultos
        </h1>
        <p className="text-muted text-sm">Realize o lançamento e gerenciamento das presenças para relatórios gerenciais</p>
      </header>

      {/* ALERTAS */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-3 text-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}
      
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-3 text-sm">
          <Info className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* FORMULÁRIO */}
      <Card title={isEditing ? "Editar Registro de Frequência" : "Lançar Nova Frequência"}>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campo 1: Data do Culto */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Data do Culto <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="date" 
                  value={cultDate}
                  onChange={(e) => setCultDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-muted/15 outline-none focus:ring-2 focus:ring-primary text-sm bg-background/50"
                  required
                />
              </div>
            </div>

            {/* Campo 2: Tema do Culto */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Tema do Culto <span className="text-rose-500">*</span>
              </label>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-lg border border-muted/15 outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                required
              >
                {CULT_THEMES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Campo 3: Presença Total */}
            {/* Fechamento da grid anterior */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Presença Total <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number"
                min="0"
                placeholder="Ex: 300"
                value={totalAttendance}
                onChange={(e) => setTotalAttendance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-muted/15 outline-none focus:ring-2 focus:ring-primary text-sm bg-background/50"
                required
              />
            </div>

            {/* Campo 4: Presença Visitantes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Total Visitantes <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number"
                min="0"
                placeholder="Ex: 40"
                value={visitorsAttendance}
                onChange={(e) => setVisitorsAttendance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-muted/15 outline-none focus:ring-2 focus:ring-primary text-sm bg-background/50"
                required
              />
            </div>

            {/* Campo 5: Total Crianças */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Total Crianças <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number"
                min="0"
                placeholder="Ex: 35"
                value={childrenAttendance}
                onChange={(e) => setChildrenAttendance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-muted/15 outline-none focus:ring-2 focus:ring-primary text-sm bg-background/50"
                required
              />
            </div>
          </div>

          {/* Campo Calculado Automático: Membros Presentes */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-primary">Membros Presentes (Calculado)</p>
                <p className="text-[10px] text-muted font-medium">Fórmula: Presença Total - (Total Visitantes + Total Crianças)</p>
              </div>
            </div>
            <div className="text-2xl font-display font-bold text-primary">
              {calculatedMembers}
            </div>
          </div>

          {/* BOTÕES DO FORMULÁRIO */}
          <div className="flex gap-3 justify-end border-t border-muted/10 pt-4">
            {isEditing && (
              <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            )}
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> {isEditing ? "Salvar Alterações" : "Gravar Frequência"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* LISTAGEM DE HISTÓRICO */}
      <Card title="Histórico de Frequência de Cultos">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-bold text-primary">Buscando histórico...</p>
          </div>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted italic">Nenhuma frequência registrada até o momento.</p>
        ) : (
          <div className="overflow-x-auto mt-4 rounded-xl border border-muted/10">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-background text-primary border-b border-muted/15 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Data do Culto</th>
                  <th className="p-4">Tema do Culto</th>
                  <th className="p-4 text-center">Visitantes</th>
                  <th className="p-4 text-center">Crianças</th>
                  <th className="p-4 text-center">Membros</th>
                  <th className="p-4 text-center">Total Geral</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/10">
                {records.map((r) => {
                  const calculatedMemb = Math.max(0, r.totalAttendance - (r.visitorsAttendance + (r.childrenAttendance || 0)));
                  return (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary">{formatDateDisplay(r.cultDate)}</td>
                      <td className="p-4 font-semibold text-primary">{r.theme}</td>
                      <td className="p-4 text-center font-medium text-amber-600 bg-amber-500/5">{r.visitorsAttendance}</td>
                      <td className="p-4 text-center font-medium text-indigo-600 bg-indigo-500/5">{r.childrenAttendance || 0}</td>
                      <td className="p-4 text-center font-medium text-primary bg-primary/5">{calculatedMemb}</td>
                      <td className="p-4 text-center font-bold text-primary">{r.totalAttendance}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button 
                            onClick={() => handleEdit(r)}
                            className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          {/* Excluir disponível de acordo com RLS (apenas Admin) */}
                          {user?.role === 'ADMIN' && (
                            <button 
                              onClick={() => handleDelete(r.id)}
                              className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
