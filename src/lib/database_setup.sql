-- TABELA DE PERFIS DE MEMBROS (ADFC)
-- Este script deve ser rodado no "SQL Editor" do seu painel Supabase para criar o Schema completo.

-- 1. Criar a tabela de perfis
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text default 'MEMBER' check (role in ('MEMBER', 'SECRETARY', 'ADMIN')),
  status text default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  
  -- Info Básica
  first_name text,
  last_name text,
  cpf text,
  rg text,
  birth_date text,
  naturalness text,
  nationality text,
  marital_status text,
  
  -- Família
  marriage_date text,
  spouse_name text,
  has_children boolean default false,
  children jsonb default '[]'::jsonb, -- Armazena array de objetos Child
  
  -- Endereço
  cep text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  
  -- Contato
  phones text[] default '{}',
  cell text, -- WhatsApp
  
  -- Profissional
  education text,
  profession text,
  
  -- Espiritual
  is_baptized boolean default false,
  baptism_church text,
  baptism_date text,
  is_holy_spirit_baptized boolean default false,
  entry_date text, -- Ano
  previous_church text,
  participates_in_convention boolean default false,
  convention_name text,
  received_as text default 'MEMBRO' check (received_as in ('MEMBRO', 'CONGREGADO')),
  
  -- Ministerial
  current_position text default 'Membro',
  position_start_date text,
  departments text[] default '{}',
  leader_department text,
  
  -- Consagração
  consecrated_to text,
  consecration_date text,
  
  -- Histórico
  ministerial_history jsonb default '[]'::jsonb, -- Armazena array de objetos MinisterialEvent
  
  -- Metadata e LGPD
  photo_url text,
  valid_until text,
  last_updated timestamp with time zone default timezone('utc'::text, now()),
  consent_given boolean default false,
  aceitou_politica boolean default false,
  data_aceite text,
  ip_aceite text,
  data_recusa text
);

-- 2. Habilitar RLS (Row Level Security)
alter table profiles enable row level security;

-- 3. POLÍTICAS DE SEGURANÇA (RLS)

-- Os usuários podem ver seu próprio perfil
create policy "Usuários podem ver o próprio perfil"
on profiles for select
using ( auth.uid() = id );

-- Os usuários podem atualizar seu próprio perfil
create policy "Usuários podem atualizar o próprio perfil"
on profiles for update
using ( auth.uid() = id );

-- Permitir que novos perfis sejam criados durante o cadastro
create policy "Permitir inserção de novo perfil"
on profiles for insert
with check ( true );

-- 4. AUTOMAÇÃO (Triggers e Functions)
-- Esta função cria uma entrada na tabela profiles assim que um usuário se cadastra no Auth.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, role, status)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    'MEMBER', 
    'ACTIVE'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para chamar a função automaticamente
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
