/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico de Chaves
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas no .env');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'sb_placeholder',
  {
    auth: {
      // Desabilita o uso de navigator.locks que causava o erro de "lock not released"
      // e impedia a autenticação de concluir corretamente
      lock: (name, acquireTimeout, fn) => fn(),
    },
  }
);
