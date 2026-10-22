import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Users, Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { ALL_DEPT_ROLES, DeptRole, normalizeDeptRoleList } from '../types';
import {
  loadAllDepartments,
  addDepartment,
  subscribeDepartments,
  normalizeDeptName,
} from '../lib/departmentsService';

export interface DepartmentSelectProps {
  selectedDepartments: string[];
  departmentRoles?: Record<string, string | string[]>;
  onChange: (departments: string[], roles: Record<string, string[]>) => void;
  disabled?: boolean;
  error?: string;
}

export const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  selectedDepartments = [],
  departmentRoles = {},
  onChange,
  disabled = false,
  error,
}) => {
  const [allDepts, setAllDepts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega lista global de departamentos e assina mudanças em tempo real
  useEffect(() => {
    let mounted = true;
    loadAllDepartments().then((list) => {
      if (mounted) setAllDepts(list);
    });

    const unsubscribe = subscribeDepartments((list) => {
      if (mounted) setAllDepts(list);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalização do termo de busca
  const cleanSearch = normalizeDeptName(searchQuery);

  // Normaliza o objeto departmentRoles recebido para garantir Record<string, string[]>
  const normalizedRoles: Record<string, string[]> = React.useMemo(() => {
    const res: Record<string, string[]> = {};
    if (!departmentRoles) return res;
    Object.entries(departmentRoles).forEach(([dept, val]) => {
      res[dept] = normalizeDeptRoleList(val);
    });
    return res;
  }, [departmentRoles]);

  // Departamentos disponíveis que ainda não foram selecionados
  const availableDepts = allDepts.filter(
    (d) =>
      d &&
      d !== 'Nenhum Departamento' &&
      !selectedDepartments.includes(d) &&
      (cleanSearch === '' || d.toLowerCase().includes(cleanSearch.toLowerCase()))
  );

  // Checa se o texto digitado já existe exatamente em allDepts
  const exactMatchExists = allDepts.some(
    (d) => d.toLowerCase() === cleanSearch.toLowerCase()
  );

  const canCreateNew = cleanSearch.length >= 3 && !exactMatchExists;

  // Selecionar um departamento existente
  const handleSelectDept = (deptName: string) => {
    if (disabled) return;
    const clean = normalizeDeptName(deptName);
    if (!selectedDepartments.includes(clean)) {
      const nextDepts = [...selectedDepartments, clean];
      const nextRoles: Record<string, string[]> = {
        ...normalizedRoles,
        [clean]: normalizedRoles[clean] && normalizedRoles[clean].length > 0 ? normalizedRoles[clean] : ['Integrante']
      };
      onChange(nextDepts, nextRoles);
    }
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Remover departamento selecionado
  const handleRemoveDept = (deptName: string) => {
    if (disabled) return;
    const nextDepts = selectedDepartments.filter((d) => d !== deptName);
    const nextRoles: Record<string, string[]> = { ...normalizedRoles };
    delete nextRoles[deptName];
    onChange(nextDepts, nextRoles);
  };

  // Alternar papel/função do membro no departamento (permite 1 ou mais)
  const handleToggleRole = (deptName: string, roleToToggle: DeptRole) => {
    if (disabled) return;
    const current = normalizedRoles[deptName] || ['Integrante'];
    let next: string[];

    if (roleToToggle === 'Integrante') {
      // Clicar em Integrante redefine para apenas 'Integrante'
      next = ['Integrante'];
    } else {
      // Remove 'Integrante' e 'Membro' caso existam ao selecionar funções de liderança
      const withoutBase = current.filter(r => r !== 'Integrante' && r !== 'Membro');
      if (withoutBase.includes(roleToToggle)) {
        // Desmarcando função específica
        next = withoutBase.filter(r => r !== roleToToggle);
        if (next.length === 0) {
          next = ['Integrante'];
        }
      } else {
        // Marcando nova função específica
        next = [...withoutBase, roleToToggle];
      }
    }

    const nextRoles: Record<string, string[]> = {
      ...normalizedRoles,
      [deptName]: next,
    };
    onChange(selectedDepartments, nextRoles);
  };

  // Criar novo departamento globalmente no banco e associar ao membro
  const handleCreateAndSelect = async () => {
    if (disabled || !canCreateNew || isCreating) return;

    setIsCreating(true);
    setCreateFeedback(null);

    try {
      const result = await addDepartment(cleanSearch);
      if (result.success) {
        // Vincula automaticamente ao membro atual com o papel padrão "Integrante"
        const nextDepts = [...selectedDepartments, cleanSearch];
        const nextRoles: Record<string, string[]> = { ...normalizedRoles, [cleanSearch]: ['Integrante'] };
        onChange(nextDepts, nextRoles);

        setSearchQuery('');
        setIsOpen(false);
        setCreateFeedback(`"${cleanSearch}" criado globalmente no banco com sucesso!`);
        setTimeout(() => setCreateFeedback(null), 4000);
      } else {
        setCreateFeedback(result.error || 'Erro ao criar departamento.');
      }
    } catch (err: any) {
      setCreateFeedback(err?.message || 'Falha ao salvar no banco de dados.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Campo de Busca e Dropdown Multi-Select */}
      <div className="relative">
        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
          Departamentos Vinculados (Múltipla Seleção com Busca)
        </label>

        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className={`flex items-center min-h-[44px] w-full px-3 py-1.5 bg-white rounded-xl border transition-all cursor-text ${
            isOpen ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-black/15 hover:border-black/30'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-black/5' : ''} ${
            error ? 'border-red-500 ring-2 ring-red-500/20' : ''
          }`}
        >
          <Search className="w-4 h-4 text-muted mr-2 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            disabled={disabled}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (canCreateNew) {
                  handleCreateAndSelect();
                } else if (availableDepts.length > 0) {
                  handleSelectDept(availableDepts[0]);
                }
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={
              selectedDepartments.length === 0
                ? 'Buscar ou digitar novo departamento...'
                : 'Buscar mais departamentos...'
            }
            className="flex-1 bg-transparent border-none outline-none text-sm text-black placeholder:text-muted/70 min-w-[180px]"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="p-1 hover:bg-black/5 rounded-full text-muted transition-colors mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}

        {createFeedback && (
          <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>{createFeedback}</span>
          </div>
        )}

        {/* Dropdown Menu com Resultados e Opção de Criar Novo */}
        {isOpen && !disabled && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-black/15 shadow-xl max-h-64 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-1">
            {/* Opção especial: Criar novo departamento global */}
            {canCreateNew && (
              <button
                type="button"
                onClick={handleCreateAndSelect}
                disabled={isCreating}
                className="w-full flex items-center justify-between p-2.5 mb-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  )}
                  <span>
                    + Adicionar "<strong>{cleanSearch}</strong>"
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary">
                  Novo Global
                </span>
              </button>
            )}

            {/* Lista de departamentos existentes */}
            {availableDepts.length > 0 ? (
              availableDepts.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => handleSelectDept(dept)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 rounded-lg text-xs text-black font-medium transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted" />
                    <span>{dept}</span>
                  </div>
                  <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100">+ Vincular</span>
                </button>
              ))
            ) : !canCreateNew ? (
              <div className="p-3 text-center text-xs text-muted">
                {searchQuery
                  ? 'Nenhum departamento encontrado com esse nome.'
                  : 'Todos os departamentos disponíveis já estão selecionados.'}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Lista de Departamentos Selecionados com Atribuição de Papel/Liderança */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-black uppercase tracking-wider">
            Papel / Responsabilidade por Departamento ({selectedDepartments.length})
          </label>
          {selectedDepartments.length > 0 && (
            <span className="text-[10px] text-muted font-medium">
              Defina a liderança em cada área de atuação
            </span>
          )}
        </div>

        {selectedDepartments.length === 0 ? (
          <div className="p-4 bg-black/[0.02] border border-dashed border-black/15 rounded-xl text-center">
            <Users className="w-6 h-6 text-muted/60 mx-auto mb-1.5" />
            <p className="text-xs text-muted font-medium">Nenhum departamento vinculado a este perfil.</p>
            <p className="text-[10px] text-muted/80 mt-0.5">
              Utilize o campo de busca acima para vincular departamentos ou criar novos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDepartments.map((dept) => {
              const currentRoles = normalizedRoles[dept] || ['Integrante'];
              const leadershipRoles = currentRoles.filter(
                (r) => r !== 'Integrante' && r !== 'Membro'
              );
              const isLeadership = leadershipRoles.length > 0;

              return (
                <div
                  key={dept}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isLeadership
                      ? 'bg-primary/[0.04] border-primary/30 shadow-xs'
                      : 'bg-white border-black/10'
                  }`}
                >
                  {/* Cabeçalho do Card: Nome do departamento e botão de remover */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isLeadership ? 'bg-primary' : 'bg-muted/40'
                        }`}
                      />
                      <span className="text-sm font-bold text-black truncate">{dept}</span>
                      {isLeadership && (
                        <div className="flex flex-wrap gap-1">
                          {leadershipRoles.map((role) => (
                            <span
                              key={role}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDept(dept)}
                        className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="Desvincular departamento"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Seleção de Funções (Uma ou mais opções) */}
                  <div className="pt-2 border-t border-black/5">
                    <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                      Funções neste departamento:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DEPT_ROLES.map((role) => {
                        const isSelected = currentRoles.includes(role);
                        const isPrimary = isSelected && role !== 'Integrante';

                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleToggleRole(dept, role)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? isPrimary
                                  ? 'bg-primary text-white border border-primary shadow-xs font-bold'
                                  : 'bg-neutral-800 text-white border border-neutral-800 shadow-xs'
                                : 'bg-black/[0.03] text-neutral-700 hover:bg-black/[0.08] border border-black/10'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={`Alternar função "${role}" em ${dept}`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            <span>{role}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
