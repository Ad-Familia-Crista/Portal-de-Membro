import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Member, WorshipFrequency, CULT_THEMES } from '../types';
import { supabase } from '../lib/supabase';
import { toCamel } from '../lib/mapper';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Award, 
  Building2, 
  Cake, 
  Heart,
  Download,
  Filter,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Percent,
  UserPlus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface AdminDashboardProps {
  members: Member[];
  loading: boolean;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ members, loading, onRefresh }) => {
  const { user } = useAuth();
  
  // Abas do Dashboard
  const [activeTab, setActiveTab] = React.useState<'members' | 'frequency'>('members');
  
  // Filtros Gerais - Padrão Todos os meses (-1) para carregar os gráficos com dados imediatamente!
  const [monthFilter, setMonthFilter] = React.useState(-1);
  const [yearFilter, setYearFilter] = React.useState(new Date().getFullYear());

  // State de Frequência de Cultos
  const [frequencyRecords, setFrequencyRecords] = React.useState<WorshipFrequency[]>([]);
  const [freqLoading, setFreqLoading] = React.useState(false);

  const fetchFrequencyRecords = async () => {
    setFreqLoading(true);
    try {
      const { data, error } = await supabase
        .from('worship_frequency')
        .select('*')
        .order('cult_date', { ascending: true }); // Ordenação ascendente para linhas temporais perfeitas

      if (error) {
        console.error('Erro ao buscar frequências:', error);
      } else {
        setFrequencyRecords(toCamel(data) || []);
      }
    } catch (err) {
      console.error('Erro de requisição de frequência:', err);
    } finally {
      setFreqLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFrequencyRecords();
  }, []);

  // Sincronizar todos os dados das duas fontes
  const handleFullSync = () => {
    onRefresh();
    fetchFrequencyRecords();
  };

  // ==========================================
  // CÁLCULOS: CADASTROS & ANIVERSARIANTES
  // ==========================================
  // Filtrar apenas cadastros com nível de acesso MEMBER
  const memberList = React.useMemo(() => {
    return members.filter(m => m.role === 'MEMBER');
  }, [members]);

  const allMembers = memberList.length;
  
  // Membros ativos incluem perfis com status ACTIVE e tipo MEMBRO, somando as crianças congregantes (Congrega Conosco = SIM) sob esses perfis
  const activeParents = memberList.filter(m => m.status === 'ACTIVE' && m.receivedAs === 'MEMBRO');
  const activeChildrenCount = activeParents.reduce((acc, m) => {
    const validChildren = m.children?.filter((c: any) => c.congregates === 'Sim' || c.congregates === true) || [];
    return acc + validChildren.length;
  }, 0);
  const activeMembers = activeParents.length + activeChildrenCount;
  
  const inactiveMembers = memberList.filter(m => m.status === 'INACTIVE' && m.receivedAs === 'MEMBRO').length;

  const calculateDeptCount = (deptName: string, childDeptName?: string) => {
    const memberCount = memberList.filter(m => 
      (m.departments || []).some(d => d.toLowerCase().includes(deptName.toLowerCase()))
    ).length;

    const childrenCount = memberList.reduce((acc, m) => {
      if (!m.children) return acc;
      const matchingChildren = m.children.filter(c => {
        const doesCongregate = c.congregates === 'Sim' || c.congregates === true;
        if (deptName === 'Infantil') {
          return doesCongregate;
        }
        return doesCongregate && (c.departments || []).some(d => d.toLowerCase().includes((childDeptName || deptName).toLowerCase()));
      });
      return acc + matchingChildren.length;
    }, 0);

    return memberCount + childrenCount;
  };

  const stats = [
    { label: 'Total de Cadastros', value: allMembers, icon: Users, color: 'bg-primary' },
    { label: 'Membros Ativos', value: activeMembers, icon: UserCheck, color: 'bg-emerald-600' },
    { label: 'Membros Inativos', value: inactiveMembers, icon: UserX, color: 'bg-rose-600', sub: '> 1 ano e 6 meses' },
  ];

  const deptData = [
    { name: 'Adolescentes - Ele vem', value: calculateDeptCount('Adolescente', 'Adolescência') },
    { name: 'Infantil - Corderinhos', value: calculateDeptCount('Infantil') },
    { name: 'The Search', value: calculateDeptCount('Jovens', 'The Search') },
    { name: 'Circulo de Oração', value: calculateDeptCount('Irmãs', 'Rosas de Saron') },
    { name: 'Obreiros', value: calculateDeptCount('Obreiros') },
    { name: 'Mídia', value: calculateDeptCount('Mídia') },
  ];

  const consecrationData = React.useMemo(() => {
    return [
      { name: 'Cooperador', value: memberList.filter(m => m.consecratedTo === 'Cooperador' || m.currentPosition === 'Cooperador').length },
      { name: 'Obreiro', value: memberList.filter(m => m.consecratedTo === 'Obreiro' || m.currentPosition === 'Obreiro').length },
      { name: 'Obreira', value: memberList.filter(m => m.consecratedTo === 'Obreira' || m.currentPosition === 'Obreira').length },
      { name: 'Diácono', value: memberList.filter(m => m.consecratedTo === 'Diacono' || m.consecratedTo === 'Diácono' || m.currentPosition === 'Diácono' || m.currentPosition === 'Diacono').length },
      { name: 'Diaconisa', value: memberList.filter(m => m.consecratedTo === 'Diaconisa' || m.currentPosition === 'Diaconisa').length },
      { name: 'Missionário', value: memberList.filter(m => m.consecratedTo === 'Missionário' || m.currentPosition === 'Missionário').length },
      { name: 'Missionária', value: memberList.filter(m => m.consecratedTo === 'Missionária' || m.currentPosition === 'Missionária').length },
      { name: 'Presbítero', value: memberList.filter(m => m.consecratedTo === 'Presbitero' || m.consecratedTo === 'Presbítero' || m.currentPosition === 'Presbítero' || m.currentPosition === 'Presbitero').length },
      { name: 'Evangelista', value: memberList.filter(m => m.consecratedTo === 'Evangelista' || m.currentPosition === 'Evangelista').length },
      { name: 'Pastor', value: memberList.filter(m => m.consecratedTo === 'Pastor' || m.currentPosition === 'Pastor').length },
      { name: 'Pastora', value: memberList.filter(m => m.consecratedTo === 'Pastora' || m.currentPosition === 'Pastora').length },
    ].filter(item => item.value > 0);
  }, [memberList]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  const COLORS = ['#466486', '#ffbb24', '#95836C', '#1E2A4A', '#F47A20', '#243B6B'];

  const parseDateToMonthDayYear = (dateStr: string) => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return { month: parseInt(parts[1], 10) - 1, day: parseInt(parts[2], 10), year: parseInt(parts[0], 10) };
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) return { month: parseInt(parts[1], 10) - 1, day: parseInt(parts[0], 10), year: parseInt(parts[2], 10) };
    }
    return null;
  };

  const birthdaysInMonth = members.filter(m => {
    if (m.status !== 'ACTIVE' || !m.birthDate) return false;
    const dateParsed = parseDateToMonthDayYear(m.birthDate);
    if (!dateParsed) return false;
    return monthFilter === -1 ? true : dateParsed.month === monthFilter;
  }).sort((a, b) => {
    const dA = parseDateToMonthDayYear(a.birthDate);
    const dB = parseDateToMonthDayYear(b.birthDate);
    if (monthFilter === -1) {
      if (dA?.month !== dB?.month) return (dA?.month || 0) - (dB?.month || 0);
    }
    return (dA?.day || 0) - (dB?.day || 0);
  });

  const weddingsInMonth = members.filter(m => {
    if (m.status !== 'ACTIVE' || !m.marriageDate || !m.spouseName) return false;
    const dateParsed = parseDateToMonthDayYear(m.marriageDate);
    if (!dateParsed) return false;
    return monthFilter === -1 ? true : dateParsed.month === monthFilter;
  }).sort((a, b) => {
    const dA = parseDateToMonthDayYear(a.marriageDate!);
    const dB = parseDateToMonthDayYear(b.marriageDate!);
    if (monthFilter === -1) {
      if (dA?.month !== dB?.month) return (dA?.month || 0) - (dB?.month || 0);
    }
    return (dA?.day || 0) - (dB?.day || 0);
  });

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // ==========================================
  // CÁLCULOS: FREQUÊNCIA DE CULTOS (OTIMIZADO)
  // ==========================================
  const parseFreqDate = (dateStr: string) => {
    if (!dateStr) return { month: 0, year: 0, day: 0 };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1,
        day: parseInt(parts[2], 10)
      };
    }
    return { month: 0, year: 0, day: 0 };
  };

  // Filtrar frequências com base no ano e mês selecionados
  const filteredFreqs = React.useMemo(() => {
    return frequencyRecords.filter(f => {
      const dateParsed = parseFreqDate(f.cultDate);
      const matchesYear = dateParsed.year === yearFilter;
      const matchesMonth = monthFilter === -1 ? true : dateParsed.month === monthFilter;
      return matchesYear && matchesMonth;
    });
  }, [frequencyRecords, monthFilter, yearFilter]);

  // INDICADOR 1: Média Mensal de Presença (Fórmula: Soma total / n de cultos)
  const avgAttendance = React.useMemo(() => {
    if (filteredFreqs.length === 0) return 0;
    const sum = filteredFreqs.reduce((acc, f) => acc + f.totalAttendance, 0);
    return Math.round(sum / filteredFreqs.length);
  }, [filteredFreqs]);

  // CÁLCULO AUXILIAR: Média de Visitantes
  const avgVisitors = React.useMemo(() => {
    if (filteredFreqs.length === 0) return 0;
    const sum = filteredFreqs.reduce((acc, f) => acc + f.visitorsAttendance, 0);
    return Math.round(sum / filteredFreqs.length);
  }, [filteredFreqs]);

  // INDICADOR 2: Visitantes Mensais Totais (Fórmula: Soma total de visitantes do período)
  const totalVisitorsSum = React.useMemo(() => {
    return filteredFreqs.reduce((acc, f) => acc + f.visitorsAttendance, 0);
  }, [filteredFreqs]);

  // INDICADOR 3: Quantidade de cultos realizados
  const totalCults = filteredFreqs.length;

  // CÁLCULO AUXILIAR: Média de Membros Presentes (Fórmula: Total - (Visitantes + Crianças))
  const avgMembersPresent = React.useMemo(() => {
    if (filteredFreqs.length === 0) return 0;
    const sum = filteredFreqs.reduce((acc, f) => acc + (f.totalAttendance - (f.visitorsAttendance + (f.childrenAttendance || 0))), 0);
    return Math.round(sum / filteredFreqs.length);
  }, [filteredFreqs]);

  // CÁLCULO DE ENGAJAMENTO (Fórmula: Participação = Membros Frequentes / Total de Membros * 100)
  const engagementPercent = React.useMemo(() => {
    const activeTotal = activeMembers || 1; // Evita divisão por zero
    const pct = (avgMembersPresent / activeTotal) * 100;
    return Math.min(100, parseFloat(pct.toFixed(1)));
  }, [avgMembersPresent, activeMembers]);

  // Gráfico 1: Evolução de Presença (Linha Temporal) - Cores da Identidade solicitadas
  const evolutionChartData = React.useMemo(() => {
    return filteredFreqs.map(f => ({
      date: formatDateDisplay(f.cultDate),
      'Presença Total': f.totalAttendance,
      'Visitantes': f.visitorsAttendance,
      'Crianças': f.childrenAttendance || 0,
      'Membros': Math.max(0, f.totalAttendance - (f.visitorsAttendance + (f.childrenAttendance || 0)))
    }));
  }, [filteredFreqs]);

  // Gráfico 2: Crescimento Mensal (Média de Público por Mês) - Barras Verticais Agrupadas
  const monthlyBarChartData = React.useMemo(() => {
    return months.map((monthName, index) => {
      const monthFreqs = frequencyRecords.filter(f => {
        const dateParsed = parseFreqDate(f.cultDate);
        return dateParsed.year === yearFilter && dateParsed.month === index;
      });

      const totalSum = monthFreqs.reduce((acc, f) => acc + f.totalAttendance, 0);
      const avgTotal = monthFreqs.length > 0 ? Math.round(totalSum / monthFreqs.length) : 0;
      
      const visitorsSum = monthFreqs.reduce((acc, f) => acc + f.visitorsAttendance, 0);
      const avgVisitors = monthFreqs.length > 0 ? Math.round(visitorsSum / monthFreqs.length) : 0;

      const childrenSum = monthFreqs.reduce((acc, f) => acc + (f.childrenAttendance || 0), 0);
      const avgChildren = monthFreqs.length > 0 ? Math.round(childrenSum / monthFreqs.length) : 0;

      const avgMemb = Math.max(0, avgTotal - (avgVisitors + avgChildren));

      return {
        month: monthName.substring(0, 3), // "Jan", "Fev"
        'Membros': avgMemb,
        'Visitantes': avgVisitors,
        'Crianças': avgChildren,
        'Média Geral': avgTotal
      };
    });
  }, [frequencyRecords, yearFilter]);

  // Gráfico 3: Participação Real de Membros nos Cultos (Donut Chart com raio 60 e 80)
  const participationDonutData = React.useMemo(() => {
    const activeCount = activeMembers;
    const activeFrequent = Math.min(activeCount, avgMembersPresent);
    const activeNonFrequent = Math.max(0, activeCount - activeFrequent);
    
    return [
      { name: 'Membros Frequentes', value: activeFrequent },
      { name: 'Não Frequentes', value: activeNonFrequent }
    ];
  }, [activeMembers, avgMembersPresent]);

  const donutColors = ['#10b981', '#e2e8f0']; // 🟢 Verde e ⚪ Cinza

  // Gráfico 4: Visitantes (Barras por Tema de Culto)
  const visitorsByCultThemeData = React.useMemo(() => {
    return CULT_THEMES.map(theme => {
      const themeFreqs = filteredFreqs.filter(f => f.theme === theme);
      const visitorsSum = themeFreqs.reduce((acc, f) => acc + f.visitorsAttendance, 0);
      return {
        theme: theme.replace('Culto ', ''), // Encurtar legenda
        'Visitantes': visitorsSum
      };
    });
  }, [filteredFreqs]);

  // Gráfico 5: Presenças por Culto (Barras Horizontais)
  const themeRankingData = React.useMemo(() => {
    return CULT_THEMES.map(theme => {
      const themeFreqs = filteredFreqs.filter(f => f.theme === theme);
      const totalSum = themeFreqs.reduce((acc, f) => acc + f.totalAttendance, 0);
      const avg = themeFreqs.length > 0 ? Math.round(totalSum / themeFreqs.length) : 0;
      return {
        theme: theme.replace('Culto ', ''), // Encurtar legenda
        'Média de Público': avg
      };
    }).sort((a, b) => b['Média de Público'] - a['Média de Público']);
  }, [filteredFreqs]);

  // ==========================================
  // EXPORTADORES
  // ==========================================
  const handleExportMembersExcel = () => {
    const relatorioMes = [
      ['RELATÓRIO GERENCIAL - DASHBOARD', monthFilter === -1 ? `ANO DE ${yearFilter}` : `${months[monthFilter].toUpperCase()} DE ${yearFilter}`],
      [],
      ['1. VISÃO GERAL'],
      ['Métrica', 'Quantidade'],
      ...stats.map(s => [s.label, s.value]),
      [],
      ['2. MINISTÉRIOS DA IGREJA'],
      ['Departamento', 'Cadastros'],
      ...deptData.map(d => [d.name, d.value]),
      [],
      ['3. CONSAGRAÇÃO'],
      ['Cargo', 'Cadastros'],
      ...consecrationData.map(c => [c.name, c.value]),
      [],
      [monthFilter === -1 ? '4. ANIVERSARIANTES DE NASCIMENTO (Ano Selecionado)' : '4. ANIVERSARIANTES DE NASCIMENTO (Mês Selecionado)'],
      ['Nome', 'Data de Nascimento', 'Dia', 'Celular'],
      ...birthdaysInMonth.map(m => {
        const dateParsed = parseDateToMonthDayYear(m.birthDate);
        return [
          `${m.firstName} ${m.lastName || ''}`,
          m.birthDate || '',
          dateParsed ? `${dateParsed.day}/${dateParsed.month + 1}` : '?',
          m.cell || ''
        ];
      }),
      [],
      [monthFilter === -1 ? '5. ANIVERSÁRIOS DE CASAMENTO (Ano Selecionado)' : '5. ANIVERSÁRIOS DE CASAMENTO (Mês Selecionado)'],
      ['Nome do Casal', 'Data de Casamento', 'Dia/Mês', 'Anos de União'],
      ...weddingsInMonth.map(m => {
        const dateParsed = parseDateToMonthDayYear(m.marriageDate!);
        const year = dateParsed ? dateParsed.year : yearFilter;
        return [
          `${m.firstName} e ${m.spouseName}`,
          m.marriageDate || '',
          dateParsed ? `${dateParsed.day}/${dateParsed.month + 1}` : '?',
          `${yearFilter - year} anos`
        ];
      })
    ];

    const csvContent = relatorioMes.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileNameMonth = monthFilter === -1 ? 'anual' : months[monthFilter].toLowerCase();
    link.setAttribute('download', `relatorio_dashboard_${fileNameMonth}_${yearFilter}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFrequencyExcel = () => {
    const reportData = [
      ['ADFC - RELATÓRIO E INDICADORES DE FREQUÊNCIA', monthFilter === -1 ? `ANO DE ${yearFilter}` : `${months[monthFilter].toUpperCase()} DE ${yearFilter}`],
      [],
      ['1. INDICADORES DO PERÍODO'],
      ['Métrica', 'Valor'],
      ['Total de Cultos Realizados', totalCults],
      ['Presença Média Geral', avgAttendance],
      ['Presença Média de Visitantes', avgVisitors],
      ['Presença Média de Membros', avgMembersPresent],
      ['Taxa Média de Engajamento de Membros', `${engagementPercent}%`],
      [],
      ['2. HISTÓRICO ANALÍTICO DOS CULTOS'],
      ['Data do Culto', 'Tema do Culto', 'Presença Visitantes', 'Presença Crianças', 'Presença Membros', 'Presença Total'],
      ...filteredFreqs.map(f => [
        formatDateDisplay(f.cultDate),
        f.theme,
        f.visitorsAttendance,
        f.childrenAttendance || 0,
        Math.max(0, f.totalAttendance - (f.visitorsAttendance + (f.childrenAttendance || 0))),
        f.totalAttendance
      ])
    ];

    const csvContent = reportData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileMonthName = monthFilter === -1 ? 'anual' : months[monthFilter].toLowerCase();
    link.setAttribute('download', `relatorio_frequencia_${fileMonthName}_${yearFilter}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      
      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl card-shadow">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-primary" /> Dashboards
          </h1>
          <p className="text-muted text-sm">Gestão Estratégica — Assembleia Família Cristã</p>
        </div>
        
        {/* FILTROS E ACOES */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-md border border-muted/10">
            <Filter className="w-4 h-4 text-primary" />
            <select 
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer"
            >
              <option value={-1}>Todos os meses</option>
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <span className="text-muted/30">/</span>
            <select 
              value={yearFilter}
              onChange={(e) => setYearFilter(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          {(user?.role === 'ADMIN' || user?.role === 'SECRETARY') && (
            <>
              <Button 
                onClick={handleFullSync} 
                variant="outline" 
                className="shadow-sm border-muted/20 hover:bg-muted/10"
                title="Sincronizar dados"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || freqLoading) ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                onClick={activeTab === 'members' ? handleExportMembersExcel : handleExportFrequencyExcel} 
                disabled={loading || freqLoading}
                className="shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" /> 
                Exportar Relatório
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ABAS DO DASHBOARD */}
      <div className="flex border-b border-muted/10">
        <button 
          onClick={() => setActiveTab('members')}
          className={`px-6 py-3.5 font-display font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary'}`}
        >
          Cadastros & Aniversariantes
        </button>
        <button 
          onClick={() => setActiveTab('frequency')}
          className={`px-6 py-3.5 font-display font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'frequency' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary'}`}
        >
          Frequência de Cultos
        </button>
      </div>

      {loading || freqLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-lg font-display font-bold text-primary">Carregando indicadores...</p>
        </div>
      ) : activeTab === 'members' ? (
        
        // ========================================================
        // TAB 1: CADASTROS & ANIVERSARIANTES
        // ========================================================
        <div className="space-y-8 animate-fadeIn">
          {/* VISÃO GERAL */}
          <section className="space-y-4">
            <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> VISÃO GERAL
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat, i) => (
                <Card key={i} className="flex items-center gap-4 border-l-4 border-primary">
                  <div className={`p-4 rounded-lg text-white ${stat.color} shadow-md`}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-display font-bold text-primary">{stat.value}</p>
                    {stat.sub && <p className="text-[9px] text-rose-500 font-bold">{stat.sub}</p>}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* MINISTÉRIOS */}
          <section className="space-y-4">
            <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> MINISTÉRIOS DA IGREJA
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Cadastro por Departamento">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9D8" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="value" fill="#466486" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Cadastros por Consagrado a">
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={consecrationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {consecrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-display font-bold fill-primary text-xs">
                        Consagrados
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="hidden sm:block space-y-1">
                    {consecrationData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted font-medium">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ANIVERSARIANTES */}
          <section className="space-y-4">
            <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2">
              <Cake className="w-5 h-5 text-primary" /> ANIVERSARIANTES ({monthFilter === -1 ? 'Ano Todo' : months[monthFilter]})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title={monthFilter === -1 ? "Aniversários do Ano" : "Aniversários Mensais"}>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {birthdaysInMonth.length === 0 ? (
                    <p className="text-sm text-muted italic text-center py-4">Nenhum aniversariante encontrado.</p>
                  ) : (
                    birthdaysInMonth.map(m => {
                      const dateParsed = parseDateToMonthDayYear(m.birthDate);
                      const day = dateParsed ? dateParsed.day : '?';
                      const monthName = dateParsed ? months[dateParsed.month] : '';
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-muted/5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/20 rounded-full text-secondary">
                              <Cake className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-primary">{m.firstName} {m.lastName || ''}</p>
                              <p className="text-xs text-muted">{monthFilter === -1 ? `Dia ${day} de ${monthName}` : `Dia ${day} de ${months[monthFilter]}`}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              <Card title="Aniversários de Casamentos">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {weddingsInMonth.length === 0 ? (
                    <p className="text-sm text-muted italic text-center py-4">Nenhum aniversário de casamento encontrado.</p>
                  ) : (
                    weddingsInMonth.map(m => {
                      const dateParsed = parseDateToMonthDayYear(m.marriageDate!);
                      const day = dateParsed ? dateParsed.day : '?';
                      const monthName = dateParsed ? months[dateParsed.month] : '';
                      const year = dateParsed ? dateParsed.year : yearFilter;
                      const yearsOfMarriage = yearFilter - year;
                      
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-muted/5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-100 rounded-full text-rose-500">
                              <Heart className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-primary">{m.firstName} e {m.spouseName}</p>
                              <p className="text-xs text-muted">{monthFilter === -1 ? `Dia ${day} de ${monthName}` : `Dia ${day}`} - {yearsOfMarriage} {yearsOfMarriage === 1 ? 'ano' : 'anos'} de união</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </section>
        </div>
      ) : (
        
        // ========================================================
        // TAB 2: FREQUÊNCIA DE CULTOS
        // ========================================================
        <div className="space-y-8 animate-fadeIn">
          
          {/* CARDS DE INDICADORES SIMPLIFICADOS */}
          <section className="space-y-4">
            <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> INDICADORES DE PARTICIPAÇÃO
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* INDICADOR 1: Média Mensal de Presença */}
              <Card className="flex items-center gap-4 border-l-4 border-primary p-4 bg-white shadow-sm">
                <div className="p-3.5 rounded-lg text-white bg-primary shadow-sm flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Média Mensal de Presença</p>
                  <p className="text-2xl font-display font-bold text-primary">{avgAttendance}</p>
                  <p className="text-[9px] text-muted font-medium mt-0.5">Presença média por culto no período</p>
                </div>
              </Card>

              {/* INDICADOR 2: Visitantes Mensais Totais */}
              <Card className="flex items-center gap-4 border-l-4 border-amber-500 p-4 bg-white shadow-sm">
                <div className="p-3.5 rounded-lg text-white bg-amber-500 shadow-sm flex-shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Visitantes Mensais Totais</p>
                  <p className="text-2xl font-display font-bold text-amber-600">{totalVisitorsSum}</p>
                  <p className="text-[9px] text-muted font-medium mt-0.5">Soma total de novos visitantes no período</p>
                </div>
              </Card>

              {/* INDICADOR 3: Quantidade de cultos realizados */}
              <Card className="flex items-center gap-4 border-l-4 border-teal-600 p-4 bg-white shadow-sm">
                <div className="p-3.5 rounded-lg text-white bg-teal-600 shadow-sm flex-shrink-0">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Cultos Realizados</p>
                  <p className="text-2xl font-display font-bold text-teal-700">{totalCults}</p>
                  <p className="text-[9px] text-muted font-medium mt-0.5">Quantidade total de cultos realizados</p>
                </div>
              </Card>
            </div>
          </section>

          {frequencyRecords.length === 0 ? (
            <Card className="p-12 text-center text-muted italic">
              Nenhuma frequência de culto cadastrada no ano de {yearFilter}. Vá até a aba "Registrar Frequência" para alimentar o sistema.
            </Card>
          ) : (
            <>
              {/* SEÇÃO DE GRÁFICOS 1 & 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Evolução de Presença (Linha Temporal) - Cores customizadas da identidade do portal */}
                <div className="lg:col-span-2">
                  <Card title="1º Evolução de Presença">
                    <p className="text-xs text-muted font-medium mb-4 -mt-2">Objetivo: Mostrar crescimento ou queda da participação.</p>
                    <div className="h-[320px] w-full mt-4">
                      {filteredFreqs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted italic text-sm">Sem dados de frequência no período selecionado</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolutionChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9D8" />
                            <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                            {/* Verde/Petróleo para Total, Azul Escuro para Membros, Dourado/Amarelo para Visitantes */}
                            <Line type="monotone" name="Presença Total" dataKey="Presença Total" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" name="Membros Presentes" dataKey="Membros" stroke="#1E2A4A" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" name="Visitantes" dataKey="Visitantes" stroke="#ffbb24" strokeWidth={3} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>
                </div>

                {/* 3. Participação de Membros (Donut Chart - Pizza de Raio 60/80) */}
                <div className="lg:col-span-1">
                  <Card title="3º Participação de Membros nos Cultos">
                    <p className="text-xs text-muted font-medium mb-4 -mt-2">Objetivo: Mostrar participação dos membros nos cultos na igreja</p>
                    <div className="h-[250px] w-full flex flex-col items-center justify-center mt-2">
                      {filteredFreqs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted italic text-sm">Sem dados suficientes</div>
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={participationDonutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {participationDonutData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} Membros`, 'Quantidade']} />
                              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-display font-bold fill-primary text-xs">
                                {engagementPercent}% Ativos
                              </text>
                            </PieChart>
                          </ResponsiveContainer>
                          
                          {/* Legenda de Participação */}
                          <div className="flex gap-4 text-xs font-bold mt-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#10b981]" />
                              <span className="text-[#10b981]">🟢 {engagementPercent}% ativos</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#e2e8f0]" />
                              <span className="text-muted/80">⚪ {(100 - engagementPercent).toFixed(1)}% não frequentes</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* SEÇÃO DE GRÁFICOS 3 & 4 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 2. Crescimento Mensal (Barras Verticais Agrupadas - Sem stackId) */}
                <Card title="2º Crescimento Mensal">
                  <p className="text-xs text-muted font-medium mb-4 -mt-2">Objetivo: Comparar presenças (membros/Visitantes) por meses.</p>
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyBarChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9D8" />
                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                        {/* Barras dispostas lado a lado (agrupadas) com cantos arredondados */}
                        <Bar dataKey="Membros" fill="#1E2A4A" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Visitantes" fill="#ffbb24" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Média Geral" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* 4. Entrada de Visitantes (Barras Verticais) */}
                <Card title="4º Gráfico de Visitantes">
                  <p className="text-xs text-muted font-medium mb-4 -mt-2">Objetivo: Mostrar quantidade de visitantes por culto.</p>
                  <div className="h-[300px] w-full mt-4">
                    {filteredFreqs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted italic text-sm">Sem dados de visitantes no período</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visitorsByCultThemeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9D8" />
                          <XAxis dataKey="theme" fontSize={9} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="Visitantes" fill="#F47A20" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>

              {/* SEÇÃO GRÁFICO 5: HORIZONTAL (RANKING DE PRESENÇA) */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* 5. Presenças por Culto (Barras Horizontais) */}
                <Card title="5º Presenças por culto">
                  <p className="text-xs text-muted font-medium mb-4 -mt-2">Objetivo: Total de Presenças por culto</p>
                  <div className="h-[280px] w-full mt-4">
                    {filteredFreqs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted italic text-sm">Sem dados suficientes no período selecionado</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={themeRankingData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EDE9D8" />
                          <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis dataKey="theme" type="category" fontSize={9} width={100} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                          />
                          <Bar name="Média de Público" dataKey="Média de Público" fill="#1E2A4A" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
