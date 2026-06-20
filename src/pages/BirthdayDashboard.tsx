import React from 'react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Member } from '../types';
import { 
  Cake, 
  Heart, 
  Download, 
  Filter, 
  Search, 
  Loader2, 
  Calendar,
  Phone,
  RefreshCw,
  Users,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface BirthdayDashboardProps {
  members: Member[];
  loading: boolean;
  onRefresh: () => void;
}

export const BirthdayDashboard: React.FC<BirthdayDashboardProps> = ({ members, loading, onRefresh }) => {
  const { user } = useAuth();
  const [monthFilter, setMonthFilter] = React.useState(new Date().getMonth());
  const [searchTerm, setSearchTerm] = React.useState('');
  const [onlyActive, setOnlyActive] = React.useState(true);
  const yearFilter = new Date().getFullYear();

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const parseDateToMonthDayYear = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    const str = dateStr.trim();
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const year = parseInt(parts[0], 10);
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
          return { month, day, year };
        }
      }
    }
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
          return { month, day, year };
        }
      }
    }
    return null;
  };

  // Filtrar membros: se onlyActive, exige status ACTIVE; senão, inclui todos que têm data de nascimento
  const birthdaysInMonth = React.useMemo(() => {
    return members.filter(m => {
      if (!m.birthDate) return false;
      // Filtro de status opcional
      if (onlyActive && m.status && m.status.toUpperCase() !== 'ACTIVE') return false;
      
      const dateParsed = parseDateToMonthDayYear(m.birthDate);
      if (!dateParsed) return false;
      
      const matchesMonth = monthFilter === -1 ? true : dateParsed.month === monthFilter;
      const fullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase().trim();
      const matchesSearch = searchTerm === '' || fullName.includes(searchTerm.toLowerCase());
      
      return matchesMonth && matchesSearch;
    }).sort((a, b) => {
      const dA = parseDateToMonthDayYear(a.birthDate);
      const dB = parseDateToMonthDayYear(b.birthDate);
      if (monthFilter === -1) {
        if ((dA?.month ?? 0) !== (dB?.month ?? 0)) return (dA?.month ?? 0) - (dB?.month ?? 0);
      }
      return (dA?.day ?? 0) - (dB?.day ?? 0);
    });
  }, [members, onlyActive, monthFilter, searchTerm]);

  // Filtrar aniversários de casamento
  const weddingsInMonth = React.useMemo(() => {
    return members.filter(m => {
      if (!m.marriageDate || !m.spouseName) return false;
      if (onlyActive && m.status && m.status.toUpperCase() !== 'ACTIVE') return false;

      const dateParsed = parseDateToMonthDayYear(m.marriageDate);
      if (!dateParsed) return false;
      
      const matchesMonth = monthFilter === -1 ? true : dateParsed.month === monthFilter;
      const coupleNames = `${m.firstName || ''} ${m.spouseName || ''}`.toLowerCase();
      const matchesSearch = searchTerm === '' || coupleNames.includes(searchTerm.toLowerCase());
      
      return matchesMonth && matchesSearch;
    }).sort((a, b) => {
      const dA = parseDateToMonthDayYear(a.marriageDate!);
      const dB = parseDateToMonthDayYear(b.marriageDate!);
      if (monthFilter === -1) {
        if ((dA?.month ?? 0) !== (dB?.month ?? 0)) return (dA?.month ?? 0) - (dB?.month ?? 0);
      }
      return (dA?.day ?? 0) - (dB?.day ?? 0);
    });
  }, [members, onlyActive, monthFilter, searchTerm]);

  const handleExportExcel = () => {
    const reportData: string[][] = [
      ['ADFC - RELATÓRIO DE ANIVERSARIANTES', monthFilter === -1 ? 'ANO TODO' : `${months[monthFilter].toUpperCase()} DE ${yearFilter}`],
      [`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`],
      [],
      ['1. ANIVERSARIANTES DE NASCIMENTO'],
      ['Nome Completo', 'Data de Nascimento', 'Dia/Mês', 'WhatsApp/Celular'],
      ...birthdaysInMonth.map(m => {
        const dateParsed = parseDateToMonthDayYear(m.birthDate);
        return [
          `${m.firstName || ''} ${m.lastName || ''}`.trim(),
          m.birthDate || '',
          dateParsed ? `${String(dateParsed.day).padStart(2,'0')}/${String(dateParsed.month + 1).padStart(2,'0')}` : '?',
          m.cell || ''
        ];
      }),
      [],
      ['2. ANIVERSÁRIOS DE CASAMENTO'],
      ['Casal', 'Data de Casamento', 'Dia/Mês', 'Anos de União', 'Celular de Contato'],
      ...weddingsInMonth.map(m => {
        const dateParsed = parseDateToMonthDayYear(m.marriageDate!);
        const marriageYear = dateParsed ? dateParsed.year : yearFilter;
        return [
          `${m.firstName || ''} e ${m.spouseName || ''}`,
          m.marriageDate || '',
          dateParsed ? `${String(dateParsed.day).padStart(2,'0')}/${String(dateParsed.month + 1).padStart(2,'0')}` : '?',
          `${yearFilter - marriageYear} anos`,
          m.cell || ''
        ];
      })
    ];

    const csvContent = reportData
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    
    // BOM UTF-8 para Excel no Windows reconhecer a codificação corretamente
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileMonthName = monthFilter === -1 ? 'anual' : months[monthFilter].toLowerCase();
    link.setAttribute('download', `aniversariantes_${fileMonthName}_${yearFilter}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalWithBirthday = members.filter(m => !!m.birthDate).length;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl card-shadow">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Cake className="w-7 h-7 text-secondary" /> Painel de Aniversariantes
          </h1>
          <p className="text-muted text-sm flex items-center gap-1.5 mt-1">
            <Users className="w-3.5 h-3.5" />
            {loading ? 'Carregando...' : `${members.length} membros carregados · ${totalWithBirthday} com data de nascimento`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            className="shadow-sm border-muted/20 hover:bg-muted/10"
            title="Sincronizar membros"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={birthdaysInMonth.length === 0 && weddingsInMonth.length === 0}
            className="shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> 
            Exportar Excel ({birthdaysInMonth.length + weddingsInMonth.length})
          </Button>
        </div>
      </header>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-xl card-shadow border border-muted/5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Busca por nome */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text"
              placeholder="Buscar aniversariante por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-muted/10 outline-none focus:ring-2 focus:ring-primary text-sm bg-background/50"
            />
          </div>

          {/* Filtro de mês */}
          <div className="flex items-center gap-2 bg-background/50 px-3 py-2 rounded-lg border border-muted/10">
            <Filter className="w-4 h-4 text-primary flex-shrink-0" />
            <select 
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="w-full bg-transparent text-sm font-bold text-primary outline-none cursor-pointer"
            >
              <option value={-1}>Todos os meses</option>
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle apenas ativos */}
        <div className="flex items-center justify-between pt-1 border-t border-muted/10">
          <span className="text-xs text-muted font-medium">
            Exibindo: <span className="text-primary font-bold">{onlyActive ? 'apenas membros ativos' : 'todos os membros'}</span>
          </span>
          <button
            onClick={() => setOnlyActive(!onlyActive)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              onlyActive 
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-muted/10 text-muted hover:bg-muted/20'
            }`}
          >
            {onlyActive 
              ? <ToggleRight className="w-4 h-4" /> 
              : <ToggleLeft className="w-4 h-4" />
            }
            Apenas Ativos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-sm font-bold text-primary">Carregando dados dos membros...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 bg-white rounded-xl card-shadow p-8">
          <Users className="w-12 h-12 text-muted/40" />
          <p className="text-muted font-bold text-sm text-center">
            Nenhum membro carregado.<br />
            <button onClick={onRefresh} className="text-primary underline mt-1 font-bold">
              Clique aqui para carregar os membros
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* NASCIMENTOS */}
          <section className="space-y-4">
            <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2 border-b border-muted/10 pb-2">
              <Cake className="w-5 h-5 text-secondary" /> Aniversários de Nascimento
              <span className="ml-auto text-sm font-bold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full">
                {birthdaysInMonth.length}
              </span>
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {birthdaysInMonth.length === 0 ? (
                <Card className="p-6 text-center text-muted italic text-sm">
                  <Cake className="w-8 h-8 text-muted/30 mx-auto mb-2" />
                  Nenhum aniversariante encontrado para os filtros selecionados.
                </Card>
              ) : (
                birthdaysInMonth.map(m => {
                  const dateParsed = parseDateToMonthDayYear(m.birthDate);
                  const day = dateParsed ? dateParsed.day : '?';
                  const monthName = dateParsed ? months[dateParsed.month] : '';
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-muted/5 shadow-sm hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-sm">
                          {day}
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{m.firstName} {m.lastName || ''}</p>
                          <p className="text-xs text-muted font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-muted/65" /> 
                            {monthFilter === -1 ? `${day} de ${monthName}` : `Dia ${day} de ${months[monthFilter]}`}
                          </p>
                        </div>
                      </div>
                      {m.cell && (
                        <a 
                          href={`https://wa.me/55${m.cell.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                          title="Enviar Parabéns no WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* CASAMENTOS */}
          <section className="space-y-4">
            <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2 border-b border-muted/10 pb-2">
              <Heart className="w-5 h-5 text-rose-500" /> Aniversários de Casamento
              <span className="ml-auto text-sm font-bold bg-rose-50 text-rose-500 px-2.5 py-0.5 rounded-full">
                {weddingsInMonth.length}
              </span>
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {weddingsInMonth.length === 0 ? (
                <Card className="p-6 text-center text-muted italic text-sm">
                  <Heart className="w-8 h-8 text-muted/30 mx-auto mb-2" />
                  Nenhum aniversário de casamento encontrado para os filtros selecionados.
                </Card>
              ) : (
                weddingsInMonth.map(m => {
                  const dateParsed = parseDateToMonthDayYear(m.marriageDate!);
                  const day = dateParsed ? dateParsed.day : '?';
                  const monthName = dateParsed ? months[dateParsed.month] : '';
                  const marriageYear = dateParsed ? dateParsed.year : yearFilter;
                  const yearsOfMarriage = yearFilter - marriageYear;
                  
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-muted/5 shadow-sm hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-sm">
                          {day}
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm">{m.firstName} e {m.spouseName}</p>
                          <p className="text-xs text-muted font-medium flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-muted/65" /> 
                            {monthFilter === -1 ? `${day} de ${monthName}` : `Dia ${day}`} — {yearsOfMarriage} {yearsOfMarriage === 1 ? 'ano' : 'anos'} de união
                          </p>
                        </div>
                      </div>
                      {m.cell && (
                        <a 
                          href={`https://wa.me/55${m.cell.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                          title="Enviar Parabéns ao Casal"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
