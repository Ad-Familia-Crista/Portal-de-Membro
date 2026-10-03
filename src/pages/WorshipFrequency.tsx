import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { WorshipFrequency, CULT_THEMES } from '../types';
import { supabase } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/mapper';
import { memoryCache } from '../lib/cache';
import { 
  ClipboardList, 
  Calendar, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  Info,
  AlertTriangle,
  Mic,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const WorshipFrequencyPage: React.FC = () => {
  const { user } = useAuth();
  
  // Constante de paginação (10 registros por página conforme solicitado)
  const PAGE_SIZE = 10;

  // State da Lista paginada com contagem total
  const [records, setRecords] = React.useState<WorshipFrequency[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [pageLoading, setPageLoading] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);
  
  // State do Formulário
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  const [cultDate, setCultDate] = React.useState('');
  const [theme, setTheme] = React.useState<WorshipFrequency['theme']>('Culto da Família');
  const [speaker, setSpeaker] = React.useState('');
  const [totalAttendance, setTotalAttendance] = React.useState<number | ''>('');
  const [visitorsAttendance, setVisitorsAttendance] = React.useState<number | ''>('');
  const [childrenAttendance, setChildrenAttendance] = React.useState<number | ''>('');
  
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // States de Exportação e Importação Excel
  const [exporting, setExporting] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importFileName, setImportFileName] = React.useState<string | null>(null);
  const [importPreview, setImportPreview] = React.useState<Array<{
    cultDate: string;
    theme: WorshipFrequency['theme'];
    speaker: string;
    totalAttendance: number;
    visitorsAttendance: number;
    childrenAttendance: number;
    adultsAttendance: number;
    isValid: boolean;
    errorReason?: string;
  }>>([]);
  const [importStatusMsg, setImportStatusMsg] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Buscar registros de forma paginada de 10 em 10 (otimizado para Vercel)
  const fetchRecords = React.useCallback(async (page: number = 1, force = false) => {
    const cacheKey = `worship_frequency_page_${page}`;
    if (!force) {
      const cached = memoryCache.get<{ records: WorshipFrequency[]; total: number }>(cacheKey);
      if (cached) {
        setRecords(cached.records);
        setTotalCount(cached.total);
        setLoading(false);
        setPageLoading(false);
        hasLoadedOnce.current = true;
        return;
      }
    }

    if (!hasLoadedOnce.current) {
      setLoading(true);
    } else {
      setPageLoading(true);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let data: any = null;
      let count: any = null;
      let error: any = null;

      const res = await supabase
        .from('worship_frequency')
        .select('id, cult_date, theme, speaker, total_attendance, visitors_attendance, children_attendance, created_at, updated_at', { count: 'exact' })
        .order('cult_date', { ascending: false })
        .range(from, to);

      data = res.data;
      count = res.count;
      error = res.error;

      // Fallback gracioso caso a coluna speaker ainda não tenha sido criada no Supabase
      if (error && (error.message?.includes('speaker') || (error as any).code === '42703')) {
        const fallbackRes = await supabase
          .from('worship_frequency')
          .select('id, cult_date, theme, total_attendance, visitors_attendance, children_attendance, created_at, updated_at', { count: 'exact' })
          .order('cult_date', { ascending: false })
          .range(from, to);
        data = fallbackRes.data;
        count = fallbackRes.count;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro ao buscar frequências:', error);
        setErrorMsg('Erro ao carregar histórico de frequências.');
      } else {
        const camel = toCamel(data) || [];
        const total = count ?? camel.length;
        setRecords(camel);
        setTotalCount(total);
        memoryCache.set(cacheKey, { records: camel, total }, 2 * 60 * 1000);
        hasLoadedOnce.current = true;
      }
    } catch (err: any) {
      console.error('Exceção ao buscar frequências:', err);
      setErrorMsg('Erro de conexão ao carregar frequências.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRecords(currentPage);
  }, [currentPage, fetchRecords]);

  // Calcular adultos presentes reativamente (Fórmula: Total - (Visitantes + Crianças))
  const calculatedAdults = React.useMemo(() => {
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
    setSpeaker(record.speaker || '');
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
    setSpeaker('');
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
      memoryCache.invalidate('worship_frequency');
      memoryCache.invalidate('worship_frequency_all');
      setSuccessMsg('Registro de frequência excluído com sucesso.');
      setTimeout(() => setSuccessMsg(null), 3000);

      // Se for o único item da página e não estiver na primeira, volta uma página
      if (records.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchRecords(currentPage, true);
      }
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
      speaker: speaker.trim() || null,
      totalAttendance: Number(totalAttendance),
      visitorsAttendance: Number(visitorsAttendance),
      childrenAttendance: Number(childrenAttendance)
    });

    try {
      if (isEditing && editingId) {
        // Atualizar
        let { error } = await supabase
          .from('worship_frequency')
          .update(recordPayload)
          .eq('id', editingId);

        // Fallback caso a coluna speaker não exista ainda no Supabase
        if (error && (error.message?.includes('speaker') || (error as any).code === '42703')) {
          const { speaker: _, ...fallbackPayload } = recordPayload;
          const retryRes = await supabase
            .from('worship_frequency')
            .update(fallbackPayload)
            .eq('id', editingId);
          error = retryRes.error;
        }

        if (error) throw error;
        
        setSuccessMsg('Frequência atualizada com sucesso!');
        // Invalidar caches compartilhados
        memoryCache.invalidate('worship_frequency');
        memoryCache.invalidate('worship_frequency_all');
        handleCancel();
        fetchRecords(currentPage, true);
      } else {
        // Criar novo
        let { error } = await supabase
          .from('worship_frequency')
          .insert([recordPayload]);

        // Fallback caso a coluna speaker não exista ainda no Supabase
        if (error && (error.message?.includes('speaker') || (error as any).code === '42703')) {
          const { speaker: _, ...fallbackPayload } = recordPayload;
          const retryRes = await supabase
            .from('worship_frequency')
            .insert([fallbackPayload]);
          error = retryRes.error;
        }

        if (error) throw error;

        setSuccessMsg('Frequência registrada com sucesso!');
        // Invalidar caches compartilhados
        memoryCache.invalidate('worship_frequency');
        memoryCache.invalidate('worship_frequency_all');
        handleCancel();
        if (currentPage === 1) {
          fetchRecords(1, true);
        } else {
          setCurrentPage(1);
        }
      }

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar frequência:', err);
      if (err.code === '23505') {
        setErrorMsg('Já existe um registro de frequência cadastrado para este tema nesta data.');
      } else {
        setErrorMsg('Erro ao salvar no banco de dados: ' + (err.message || err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // EXPORTAR EXCEL (.CSV formatado para Excel)
  // ==========================================
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      let data: any = null;
      let error: any = null;

      const res = await supabase
        .from('worship_frequency')
        .select('id, cult_date, theme, speaker, total_attendance, visitors_attendance, children_attendance')
        .order('cult_date', { ascending: false });

      data = res.data;
      error = res.error;

      if (error && (error.message?.includes('speaker') || (error as any).code === '42703')) {
        const fallbackRes = await supabase
          .from('worship_frequency')
          .select('id, cult_date, theme, total_attendance, visitors_attendance, children_attendance')
          .order('cult_date', { ascending: false });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;

      const allRecords: WorshipFrequency[] = toCamel(data) || [];
      if (allRecords.length === 0) {
        alert('Não há registros de frequência cadastrados para exportação.');
        return;
      }

      const headers = [
        'Data do Culto',
        'Tema do Culto',
        'Preleitor',
        'Visitantes',
        'Crianças',
        'Adultos',
        'Presença Total'
      ];

      const rows = allRecords.map(r => {
        const adults = Math.max(0, r.totalAttendance - (r.visitorsAttendance + (r.childrenAttendance || 0)));
        return [
          formatDateDisplay(r.cultDate),
          r.theme || '',
          r.speaker || '',
          r.visitorsAttendance ?? 0,
          r.childrenAttendance ?? 0,
          adults,
          r.totalAttendance ?? 0
        ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `frequencia_cultos_adfc_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      alert('Erro ao exportar registros para o Excel: ' + (err.message || err));
    } finally {
      setExporting(false);
    }
  };

  // ==========================================
  // IMPORTAR EXCEL / CSV
  // ==========================================
  const handleDownloadTemplate = () => {
    const headers = ['Data do Culto (AAAA-MM-DD)', 'Tema do Culto', 'Preleitor', 'Presenca Total', 'Visitantes', 'Criancas'];
    const sampleRows = [
      ['2026-10-04', 'Culto da Família', 'Pr. João Silva', '160', '25', '20'],
      ['2026-10-07', 'Culto de Primícias', 'Miss. Maria Souza', '130', '15', '12']
    ];
    const csvContent = '\uFEFF' + [headers.join(';'), ...sampleRows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_importacao_frequencia_adfc.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizeTheme = (raw: string): WorshipFrequency['theme'] => {
    const clean = raw.trim().toLowerCase();
    if (clean.includes('primícia') || clean.includes('primicia')) return 'Culto de Primícias';
    if (clean.includes('missão') || clean.includes('missoes') || clean.includes('missões')) return 'Culto de Missões';
    if (clean.includes('santa ceia') || clean.includes('ceia')) return 'Culto de Santa Ceia';
    if (clean.includes('altar') || clean.includes('minha família no altar')) return 'Culto Minha Família no Altar do Senhor';
    if (clean.includes('vitória') || clean.includes('vitoria')) return 'Culto da Vitória';
    if (clean.includes('search')) return 'Culto The Search';
    if (clean.includes('circulo') || clean.includes('círculo') || clean.includes('oração') || clean.includes('oracao')) return 'Culto Circulo de Oração';
    return 'Culto da Família';
  };

  const parseInputDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    // Formato DD/MM/AAAA ou DD-MM-AAAA
    if (clean.includes('/')) {
      const p = clean.split('/');
      if (p.length === 3 && p[0].length <= 2 && p[1].length <= 2 && p[2].length === 4) {
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }
    // Formato AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

      if (lines.length <= 1) {
        setImportPreview([]);
        setImportStatusMsg({ text: 'O arquivo selecionado está vazio ou contém apenas o cabeçalho.', type: 'error' });
        return;
      }

      // Detectar delimitador (';' ou ',')
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';

      // Ignorar cabeçalho se a primeira coluna contiver "data" ou "cult_date"
      const startIndex = lines[0].toLowerCase().includes('data') || lines[0].toLowerCase().includes('cult') ? 1 : 0;
      const parsedRows: typeof importPreview = [];

      for (let i = startIndex; i < lines.length; i++) {
        const rawCols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (rawCols.length < 4 || rawCols.every(c => c === '')) continue;

        const rawDate = rawCols[0] || '';
        const parsedDate = parseInputDate(rawDate);
        const rawTheme = rawCols[1] || 'Culto da Família';
        const normTheme = normalizeTheme(rawTheme);
        
        let speakerVal = '';
        let totalVal = 0;
        let visitorsVal = 0;
        let childrenVal = 0;

        // Se tem 6 ou mais colunas: Data, Tema, Preleitor, Total, Visitantes, Crianças
        if (rawCols.length >= 6) {
          speakerVal = rawCols[2] || '';
          totalVal = parseInt(rawCols[3], 10) || 0;
          visitorsVal = parseInt(rawCols[4], 10) || 0;
          childrenVal = parseInt(rawCols[5], 10) || 0;
        } else if (rawCols.length === 5) {
          // 5 colunas: Pode ser Data, Tema, Total, Visitantes, Crianças OU Data, Tema, Preleitor, Total, Visitantes
          const thirdIsNumber = !isNaN(Number(rawCols[2])) && rawCols[2] !== '';
          if (thirdIsNumber) {
            totalVal = parseInt(rawCols[2], 10) || 0;
            visitorsVal = parseInt(rawCols[3], 10) || 0;
            childrenVal = parseInt(rawCols[4], 10) || 0;
          } else {
            speakerVal = rawCols[2];
            totalVal = parseInt(rawCols[3], 10) || 0;
            visitorsVal = parseInt(rawCols[4], 10) || 0;
          }
        } else {
          // 4 colunas: Data, Tema, Total, Visitantes
          totalVal = parseInt(rawCols[2], 10) || 0;
          visitorsVal = parseInt(rawCols[3], 10) || 0;
        }

        let isValid = true;
        let errorReason = '';

        if (!parsedDate) {
          isValid = false;
          errorReason = 'Data inválida (use AAAA-MM-DD ou DD/MM/AAAA)';
        } else if (totalVal < 0 || visitorsVal < 0 || childrenVal < 0) {
          isValid = false;
          errorReason = 'Valores de presença devem ser maiores ou iguais a zero';
        } else if (visitorsVal + childrenVal > totalVal) {
          isValid = false;
          errorReason = `Visitantes (${visitorsVal}) + Crianças (${childrenVal}) excede Total (${totalVal})`;
        }

        const calculatedAdults = Math.max(0, totalVal - (visitorsVal + childrenVal));

        parsedRows.push({
          cultDate: parsedDate || rawDate,
          theme: normTheme,
          speaker: speakerVal,
          totalAttendance: totalVal,
          visitorsAttendance: visitorsVal,
          childrenAttendance: childrenVal,
          adultsAttendance: calculatedAdults,
          isValid,
          errorReason
        });
      }

      setImportPreview(parsedRows);
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validRows = importPreview.filter(r => r.isValid);
    if (validRows.length === 0) {
      setImportStatusMsg({ text: 'Nenhum registro válido para importar na planilha.', type: 'error' });
      return;
    }

    setImporting(true);
    setImportStatusMsg(null);

    try {
      const payloads = validRows.map(r => toSnake({
        cultDate: r.cultDate,
        theme: r.theme,
        speaker: r.speaker.trim() || null,
        totalAttendance: r.totalAttendance,
        visitorsAttendance: r.visitorsAttendance,
        childrenAttendance: r.childrenAttendance
      }));

      // Inserir ou atualizar via upsert na chave única (cult_date, theme)
      let { error } = await supabase
        .from('worship_frequency')
        .upsert(payloads, { onConflict: 'cult_date, theme' });

      // Fallback gracioso se a coluna speaker ainda não existir no banco
      if (error && (error.message?.includes('speaker') || (error as any).code === '42703')) {
        const payloadsWithoutSpeaker = payloads.map((p: any) => {
          const { speaker: _, ...rest } = p;
          return rest;
        });
        const retryRes = await supabase
          .from('worship_frequency')
          .upsert(payloadsWithoutSpeaker, { onConflict: 'cult_date, theme' });
        error = retryRes.error;
      }

      if (error) throw error;

      // Invalidar caches
      memoryCache.invalidate('worship_frequency');
      memoryCache.invalidate('worship_frequency_all');

      setImportStatusMsg({
        text: `Sucesso! ${validRows.length} registros foram importados/atualizados com êxito.`,
        type: 'success'
      });

      // Recarrega listagem
      fetchRecords(currentPage, true);

      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportPreview([]);
        setImportFileName(null);
        setImportStatusMsg(null);
      }, 2000);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      setImportStatusMsg({
        text: 'Erro ao salvar registros no banco de dados: ' + (err.message || err),
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  // Cálculo do total de páginas (10 registros por página)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
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

            {/* Campo 3: Preleitor (Quem pregou no culto) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Preleitor (Ministro da Palavra)
              </label>
              <div className="relative">
                <Mic className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="text" 
                  placeholder="Ex: Pr. João Silva" 
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-muted/15 outline-none focus:ring-2 focus:ring-primary text-sm bg-background/50"
                />
              </div>
            </div>
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

          {/* Campo Calculado Automático: Adultos Presentes */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-primary">Adultos Presentes (Calculado)</p>
                <p className="text-[10px] text-muted font-medium">Fórmula: Presença Total - (Total Visitantes + Total Crianças)</p>
              </div>
            </div>
            <div className="text-2xl font-display font-bold text-primary">
              {calculatedAdults}
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

      {/* LISTAGEM DE HISTÓRICO COM EXPORTAÇÃO E IMPORTAÇÃO EXCEL */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-muted/10">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-primary">Histórico de Frequência de Cultos</h2>
            <p className="text-xs text-muted">Histórico detalhado das presenças e relatórios analíticos</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs font-semibold shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-primary" /> Importar Excel
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleExportExcel}
              disabled={exporting}
              className="text-xs font-semibold shadow-sm"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
              )}
              Exportar Excel
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-bold text-primary">Buscando histórico...</p>
          </div>
        ) : totalCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted italic">Nenhuma frequência registrada até o momento.</p>
        ) : (
          <div className="overflow-x-auto mt-4 rounded-xl border border-muted/10 relative">
            {pageLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            )}
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-background text-primary border-b border-muted/15 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Data do Culto</th>
                  <th className="p-4">Tema do Culto</th>
                  <th className="p-4">Preleitor</th>
                  <th className="p-4 text-center">Visitantes</th>
                  <th className="p-4 text-center">Crianças</th>
                  <th className="p-4 text-center">Adultos</th>
                  <th className="p-4 text-center">Total Geral</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/10">
                {records.map((r) => {
                  const calculatedAdultsRow = Math.max(0, r.totalAttendance - (r.visitorsAttendance + (r.childrenAttendance || 0)));
                  return (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary">{formatDateDisplay(r.cultDate)}</td>
                      <td className="p-4 font-semibold text-primary">{r.theme}</td>
                      <td className="p-4 text-slate-700 font-medium">
                        {r.speaker ? (
                          <span className="flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-muted shrink-0" />
                            {r.speaker}
                          </span>
                        ) : (
                          <span className="text-muted/40 italic text-xs">Não informado</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-medium text-amber-600 bg-amber-500/5">{r.visitorsAttendance}</td>
                      <td className="p-4 text-center font-medium text-indigo-600 bg-indigo-500/5">{r.childrenAttendance || 0}</td>
                      <td className="p-4 text-center font-medium text-primary bg-primary/5">{calculatedAdultsRow}</td>
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
                          
                          {/* Excluir disponível para Admin, Secretária e Recepção */}
                          {(user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'RECEPTION') && (
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

            {/* CONTROLES DE PAGINAÇÃO (10 em 10) */}
            {totalCount > PAGE_SIZE && (
              <div className="p-4 border-t border-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                <span className="text-xs text-muted font-medium">
                  Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} a {Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount} registros
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || pageLoading}
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
                    disabled={currentPage === totalPages || pageLoading}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA EXCEL / CSV */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!importing) {
            setIsImportModalOpen(false);
            setImportPreview([]);
            setImportFileName(null);
            setImportStatusMsg(null);
          }
        }}
        title="Importar Frequência de Cultos via Excel"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              type="button"
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar Modelo de Planilha
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
                disabled={importing}
                type="button"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                disabled={importing || importPreview.filter(r => r.isValid).length === 0}
                type="button"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Importando...
                  </>
                ) : (
                  `Confirmar Importação (${importPreview.filter(r => r.isValid).length})`
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Instruções de Importação:
            </p>
            <p>1. O arquivo deve ser formato <strong>.CSV</strong> (separado por ponto e vírgula <code>;</code> ou vírgula <code>,</code>).</p>
            <p>2. Colunas esperadas: <code>Data; Tema; Preleitor; Presença Total; Visitantes; Crianças</code>.</p>
            <p>3. Registros de mesma data e tema serão atualizados com os novos dados importados.</p>
          </div>

          {/* UPLOAD DE ARQUIVO */}
          <div className="border-2 border-dashed border-muted/20 hover:border-primary/50 transition-colors rounded-xl p-6 text-center bg-background/30">
            <input 
              type="file" 
              accept=".csv, text/csv, .txt, .xlsx"
              id="excel-freq-input"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="excel-freq-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-primary" />
              <p className="text-sm font-bold text-primary">
                {importFileName ? `Arquivo: ${importFileName}` : 'Clique para selecionar a planilha (.csv)'}
              </p>
              <p className="text-[11px] text-muted">Formatos aceitos: Planilha CSV exportada do Excel</p>
            </label>
          </div>

          {/* MENSAGEM DE STATUS */}
          {importStatusMsg && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              importStatusMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {importStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              {importStatusMsg.text}
            </div>
          )}

          {/* PREVIEW DOS DADOS */}
          {importPreview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-primary">
                  Prévia dos Registros ({importPreview.filter(r => r.isValid).length} válidos de {importPreview.length})
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto border border-muted/15 rounded-lg text-xs">
                <table className="w-full text-left">
                  <thead className="bg-background sticky top-0 text-[10px] uppercase font-bold text-primary border-b border-muted/10">
                    <tr>
                      <th className="p-2">Status</th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Tema</th>
                      <th className="p-2">Preleitor</th>
                      <th className="p-2 text-center">Visitantes</th>
                      <th className="p-2 text-center">Crianças</th>
                      <th className="p-2 text-center">Adultos</th>
                      <th className="p-2 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/10">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className={item.isValid ? 'hover:bg-primary/5' : 'bg-rose-50/60'}>
                        <td className="p-2 font-bold whitespace-nowrap">
                          {item.isValid ? (
                            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">Válido</span>
                          ) : (
                            <span className="text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-[10px]" title={item.errorReason}>
                              Erro
                            </span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap">{formatDateDisplay(item.cultDate)}</td>
                        <td className="p-2 whitespace-nowrap">{item.theme}</td>
                        <td className="p-2 whitespace-nowrap text-muted font-medium">{item.speaker || '-'}</td>
                        <td className="p-2 text-center">{item.visitorsAttendance}</td>
                        <td className="p-2 text-center">{item.childrenAttendance}</td>
                        <td className="p-2 text-center font-bold text-primary">{item.adultsAttendance}</td>
                        <td className="p-2 text-center font-bold">{item.totalAttendance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
