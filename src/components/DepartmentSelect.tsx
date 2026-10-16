import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Users, Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { ALL_DEPT_ROLES, DeptRole } from '../types';
import {
  loadAllDepartments,
  addDepartment,
  subscribeDepartments,
  normalizeDeptName,
} from '../lib/departmentsService';

export interface DepartmentSelectProps {
  selectedDepartments: string[];
  departmentRoles?: Record<string, string>;
  onChange: (departments: string[], roles: Record<string, string>) => void;
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
      const nextRoles = { ...departmentRoles, [clean]: departmentRoles[clean] || 'Integrante' };
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
    const nextRoles = { ...departmentRoles };
    delete nextRoles[deptName];
    onChange(nextDepts, nextRoles);
  };

  // Alterar papel do membro no departamento
  const handleRoleChange = (deptName: string, newRole: DeptRole) => {
    if (disabled) return;
    const nextRoles = { ...departmentRoles, [deptName]: newRole };
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
        // Vincula automaticamente ao membro atual com o papel padrão "Membro"
        const nextDepts = [...selectedDepartments, cleanSearch];
        const nextRoles = { ...departmentRoles, [cleanSearch]: 'Integrante' };
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
          <div className="space-y-2">
            {selectedDepartments.map((dept) => {
              const currentRole = (departmentRoles[dept] as DeptRole) || 'Integrante';
              const isLeadership = currentRole !== 'Integrante';

              return (
                <div
                  key={dept}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all ${
                    isLeadership
                      ? 'bg-primary/[0.04] border-primary/30 shadow-xs'
                      : 'bg-white border-black/10'
                  }`}
                >
                  {/* Nome do departamento */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isLeadership ? 'bg-primary' : 'bg-muted/40'
                      }`}
                    />
                    <span className="text-sm font-bold text-black truncate">{dept}</span>
                    {isLeadership && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                        {currentRole}
                      </span>
                    )}
                  </div>

                  {/* Seletor de Papel / Função */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted uppercase">Função:</span>
                      <select
                        value={currentRole}
                        disabled={disabled}
                        onChange={(e) => handleRoleChange(dept, e.target.value as DeptRole)}
                        className={`h-8 px-2.5 py-1 text-xs font-semibold rounded-lg border bg-white cursor-pointer outline-none transition-all ${
                          isLeadership
                            ? 'border-primary text-primary focus:ring-2 focus:ring-primary/20 font-bold'
                            : 'border-black/20 text-black/80 hover:border-black/40'
                        }`}
                      >
                        {ALL_DEPT_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                        {/* Compatibilidade retroativa: exibir 'Membro' como 'Integrante' para registros antigos */}
                        {Object.values(departmentRoles).includes('Membro') && (
                          <option value="Membro" style={{ display: 'none' }}>Membro (legado)</option>
                        )}
                      </select>
                    </div>

                    {/* Botão de Remover */}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDept(dept)}
                        className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Desvincular departamento"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
