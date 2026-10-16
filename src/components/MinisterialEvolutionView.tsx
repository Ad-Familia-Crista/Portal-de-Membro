import React from 'react';
import { ShieldAlert, Award, Users, Church, History } from 'lucide-react';

export interface MinisterialEvolutionViewProps {
  departments?: string[];
  departmentRoles?: Record<string, string>;
  leaderDepartment?: string;
  consecratedTo?: string;
  consecrationDate?: string;
  children?: Array<{ name?: string; departments?: string[] }>;
  ministerialHistory?: Array<{ id: string; date: string; description: string }>;
  showNotice?: boolean;
  className?: string;
}

export const MinisterialEvolutionView: React.FC<MinisterialEvolutionViewProps> = ({
  departments = [],
  departmentRoles = {},
  leaderDepartment = '',
  consecratedTo = '',
  consecrationDate = '',
  children = [],
  ministerialHistory = [],
  showNotice = true,
  className = '',
}) => {
  // 1. Filtrar departamentos válidos (ignora "Nenhum Departamento" ou valores vazios)
  const activeDepartments = (departments || []).filter(
    (d) => d && d.trim() !== '' && d !== 'Nenhum Departamento'
  );

  // 2. Extrair itens de liderança
  // Mostra qualquer papel que não seja "Integrante" ou "Membro" (legado)
  const NON_LEADERSHIP = new Set(['Integrante', 'Membro', '', undefined, null]);
  const leadershipItems: { role: string; department: string }[] = [];
  const coveredDepts = new Set<string>();

  // Normaliza departmentRoles caso venha serializado em string JSON
  let rolesMap: Record<string, string> = {};
  if (typeof departmentRoles === 'string') {
    try {
      rolesMap = JSON.parse(departmentRoles);
    } catch {
      rolesMap = {};
    }
  } else if (departmentRoles && typeof departmentRoles === 'object') {
    rolesMap = departmentRoles as Record<string, string>;
  }

  // A) Através de departmentRoles (fonte principal):
  Object.entries(rolesMap).forEach(([dept, role]) => {
    if (dept && role && !NON_LEADERSHIP.has(role)) {
      leadershipItems.push({ role, department: dept });
      coveredDepts.add(dept);
    }
  });

  // B) Fallback de compatibilidade retroativa com leaderDepartment legado
  if (leaderDepartment && typeof leaderDepartment === 'string' && leaderDepartment.trim()) {
    const rawSegments = leaderDepartment.split(',').map((s) => s.trim()).filter(Boolean);
    rawSegments.forEach((segment) => {
      if (segment.includes('—') || segment.includes('-')) {
        const parts = segment.split(/[—\-]/);
        const role = parts[0]?.trim() || 'Líder';
        const dept = parts.slice(1).join(' - ').trim();
        if (dept && !coveredDepts.has(dept)) {
          leadershipItems.push({ role, department: dept });
          coveredDepts.add(dept);
        }
      } else {
        if (!coveredDepts.has(segment)) {
          leadershipItems.push({ role: 'Líder', department: segment });
          coveredDepts.add(segment);
        }
      }
    });
  }

  // Garante que os departamentos onde o membro é líder também estejam na lista de departamentos
  leadershipItems.forEach(item => {
    if (item.department && !activeDepartments.includes(item.department)) {
      activeDepartments.push(item.department);
    }
  });

  const hasLeadership = leadershipItems.length > 0;

  // 3. Condição para Consagração / Ordenação
  const cleanConsecratedTo = (consecratedTo || '').trim();
  const hasConsecration = Boolean(
    cleanConsecratedTo &&
      cleanConsecratedTo.toLowerCase() !== 'não informado' &&
      cleanConsecratedTo.toLowerCase() !== 'nenhum' &&
      cleanConsecratedTo !== ''
  );

  // Formatação de data amigável DD/MM/AAAA
  const formatFriendlyDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    if (clean.includes('/')) return clean;
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
    return clean;
  };

  const formattedConsecrationDate = formatFriendlyDate(consecrationDate);

  // 4. Filhos com departamentos
  const childrenWithDepts = (children || []).filter(
    (c) => c.departments && c.departments.length > 0 && c.departments[0] !== 'Nenhum Departamento'
  );

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Aviso exclusivo da secretaria para o membro */}
      {showNotice && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start sm:items-center gap-3 text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
          <p className="text-xs leading-relaxed font-medium">
            Esta seção é de preenchimento exclusivo da Secretaria ou Administrador. Seus dados atuais estão visíveis abaixo apenas para conferência.
          </p>
        </div>
      )}

      {/* BLOCO 1: DEPARTAMENTOS E ATUAÇÃO */}
      <div className="bg-white rounded-2xl border border-black/10 p-5 shadow-xs transition-all hover:border-black/20">
        <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-black/5">
          <Users className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold text-black uppercase tracking-wider">
            Departamentos e Atuação
          </h4>
        </div>

        {activeDepartments.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {activeDepartments.map((dept) => (
              <span
                key={dept}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs"
              >
                {dept}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">Nenhum departamento vinculado no momento.</p>
        )}
      </div>

      {/* BLOCO 2: LIDERANÇA E RESPONSABILIDADES (Exibição Condicional) */}
      {hasLeadership && (
        <div className="bg-white rounded-2xl border border-black/10 p-5 shadow-xs transition-all hover:border-black/20">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-black/5">
            <Award className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Liderança e Responsabilidades
            </h4>
          </div>

          <ul className="space-y-2.5">
            {leadershipItems.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-black bg-primary/[0.03] px-3.5 py-2 rounded-lg border border-primary/10"
              >
                <span className="text-primary font-black text-base leading-none">•</span>
                <span className="font-bold text-primary">{item.role}</span>
                <span className="text-black/30 font-light">—</span>
                <span className="font-semibold text-black">{item.department}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BLOCO 3: CONSAGRAÇÃO / ORDENAÇÃO (Exibição Condicional) */}
      {hasConsecration && (
        <div className="bg-white rounded-2xl border border-black/10 p-5 shadow-xs transition-all hover:border-black/20">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-black/5">
            <Church className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Consagração / Ordenação
            </h4>
          </div>

          <div className="text-sm font-medium text-black">
            <span className="font-semibold text-muted">Cargo / Ordem: </span>
            <span className="font-bold text-black">{cleanConsecratedTo}</span>
            {formattedConsecrationDate && (
              <span className="text-muted ml-1.5 font-normal">
                (Consagrado em: <strong className="font-semibold text-black">{formattedConsecrationDate}</strong>)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Departamentos de Dependentes / Filhos */}
      {childrenWithDepts.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/10 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black/5">
            <span className="text-sm">👶</span>
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Departamento do Filho / Criança / Adolescente
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {childrenWithDepts.map((c, cIdx) => (
              <div
                key={cIdx}
                className="p-3 bg-black/[0.02] rounded-xl border border-black/10 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-black">{c.name || `Dependente #${cIdx + 1}`}</p>
                  <p className="text-[10px] text-muted">Vínculo infantil / adolescente</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/15 text-secondary">
                  {c.departments![0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico Ministerial */}
      {ministerialHistory && ministerialHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/10 p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-black/5">
            <History className="w-4 h-4 text-muted" /> Histórico Ministerial
          </h4>

          <div className="relative pl-4 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-black/10">
            {ministerialHistory.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full bg-secondary border-2 border-white shadow-xs" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black">
                      📅 {new Date(event.date).getFullYear() || event.date}
                    </span>
                    <span className="text-[10px] text-muted font-mono">{event.date}</span>
                  </div>
                  <p className="text-sm text-black font-medium">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
