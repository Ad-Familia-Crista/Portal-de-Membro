-- =========================================================================
-- MIGRATION SCRIPT: ADICIONAR PRELEITOR À TABELA WORSHIP_FREQUENCY
-- Copie todo este script e execute-o no "SQL Editor" do painel Supabase.
-- =========================================================================

-- Adiciona a coluna 'speaker' (Preleitor) na tabela worship_frequency se ainda não existir
ALTER TABLE worship_frequency ADD COLUMN IF NOT EXISTS speaker TEXT;

-- Comentário explicativo na coluna
COMMENT ON COLUMN worship_frequency.speaker IS 'Nome do preleitor ou pregador que ministrou a palavra no culto';
