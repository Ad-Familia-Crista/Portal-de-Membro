import { supabase } from './supabase';
import { DEPARTMENTS } from '../types';

const STORAGE_KEY = 'adfc_custom_departments';

// Notificador de listeners para sincronizar formulários e gráficos em tempo real
type Listener = (departments: string[]) => void;
const listeners = new Set<Listener>();

export const subscribeDepartments = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (allDepts: string[]) => {
  listeners.forEach(fn => {
    try {
      fn(allDepts);
    } catch (e) {
      console.warn('Erro ao notificar listener de departamentos:', e);
    }
  });
};

/**
 * Normaliza o nome do departamento: remove espaços múltiplos e padroniza trim
 */
export const normalizeDeptName = (name: string): string => {
  return (name || '').trim().replace(/\s+/g, ' ');
};

/**
 * Obtém os departamentos adicionais salvos localmente
 */
export const getCachedCustomDepartments = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Salva departamentos adicionais no cache local
 */
export const setCachedCustomDepartments = (depts: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(depts));
  } catch {}
};

/**
 * Carrega todos os departamentos disponíveis (predefinidos + banco + cache local)
 */
export const loadAllDepartments = async (): Promise<string[]> => {
  const customDeptsSet = new Set<string>(getCachedCustomDepartments());

  try {
    // Tenta carregar do banco de dados (tabela departments)
    const { data, error } = await supabase
      .from('departments')
      .select('name, is_active')
      .eq('is_active', true);

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        const normalized = normalizeDeptName(row.name);
        if (normalized) customDeptsSet.add(normalized);
      });
      // Atualiza cache local com os departamentos confirmados do banco
      setCachedCustomDepartments(Array.from(customDeptsSet));
    }
  } catch (err) {
    console.warn('Aviso: banco de dados de departamentos indisponível, usando cache:', err);
  }

  // Combina lista base com departamentos customizados, sem duplicatas case-insensitive
  const combined = [...DEPARTMENTS];
  customDeptsSet.forEach(custom => {
    const exists = combined.some(d => d.toLowerCase() === custom.toLowerCase());
    if (!exists) {
      combined.push(custom);
    }
  });

  notifyListeners(combined);
  return combined;
};

/**
 * Adiciona um novo departamento
 */
export const addDepartment = async (name: string): Promise<{ success: boolean; error?: string; departments: string[] }> => {
  const cleanName = normalizeDeptName(name);

  if (!cleanName) {
    return { success: false, error: 'O nome do departamento não pode ser vazio.', departments: DEPARTMENTS };
  }

  const currentCustom = getCachedCustomDepartments();
  const allCurrent = [...DEPARTMENTS, ...currentCustom];

  // Verificação de duplicidade (case-insensitive e espaços ignorados)
  const isDuplicate = allCurrent.some(d => d.toLowerCase() === cleanName.toLowerCase());
  if (isDuplicate) {
    return { success: false, error: 'Este departamento já existe.', departments: allCurrent };
  }

  // Atualiza cache local imediatamente
  const updatedCustom = [...currentCustom, cleanName];
  setCachedCustomDepartments(updatedCustom);

  // Tenta persistir no Supabase (se a tabela departments existir)
  try {
    const { error } = await supabase
      .from('departments')
      .insert([{ name: cleanName, is_active: true }]);

    if (error) {
      console.warn('Aviso ao persistir departamento no banco:', error.message || error);
    }
  } catch (err) {
    console.warn('Aviso ao conectar com tabela departments:', err);
  }

  const updatedAll = [...DEPARTMENTS, ...updatedCustom];
  notifyListeners(updatedAll);

  return { success: true, departments: updatedAll };
};
