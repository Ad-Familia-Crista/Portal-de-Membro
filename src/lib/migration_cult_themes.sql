-- MIGRATION SCRIPT: ATUALIZAR TEMAS DE CULTO NA TABELA WORSHIP_FREQUENCY
-- Execute este script no SQL Editor do seu painel Supabase para permitir os novos cultos cadastrados:
-- 'Culto The Search' e 'Culto Circulo de Oração'

DO $$
BEGIN
  -- 1. Remove a constraint CHECK de tema anterior se existir
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'worship_frequency'::regclass 
    AND conname = 'worship_frequency_theme_check'
  ) THEN
    ALTER TABLE worship_frequency DROP CONSTRAINT worship_frequency_theme_check;
  END IF;

  -- 2. Adiciona a nova constraint atualizada com todos os temas
  ALTER TABLE worship_frequency ADD CONSTRAINT worship_frequency_theme_check CHECK (theme IN (
    'Culto de Primícias', 
    'Culto de Missões', 
    'Culto de Santa Ceia', 
    'Culto da Família', 
    'Culto Minha Família no Altar do Senhor',
    'Culto da Vitória',
    'Culto The Search',
    'Culto Circulo de Oração'
  ));
END $$;
