begin;

create table if not exists public.membros (
  id text primary key,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  whatsapp text not null default '',
  avatar jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.membro_funcoes (
  membro_id text not null references public.membros(id) on update cascade on delete cascade,
  funcao text not null check (char_length(trim(funcao)) > 0),
  ordem smallint not null default 0 check (ordem >= 0),
  primary key (membro_id, funcao)
);

create table if not exists public.musicas (
  id text primary key,
  tipo text not null default 'Música' check (tipo in ('Música', 'Hino')),
  hinario text not null default '',
  numero text not null default '',
  titulo text not null check (char_length(trim(titulo)) between 1 and 180),
  tom_padrao text not null default '',
  youtube_url text not null default '',
  cifra_url text not null default '',
  vs_url text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.escalas (
  id text primary key,
  data date not null,
  culto text not null check (char_length(trim(culto)) > 0),
  saudacao text not null default 'Olá!',
  ensaio text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.escala_equipe (
  escala_id text not null references public.escalas(id) on update cascade on delete cascade,
  membro_id text not null references public.membros(id) on update cascade on delete restrict,
  funcao text not null check (char_length(trim(funcao)) > 0),
  ordem smallint not null default 0 check (ordem >= 0),
  primary key (escala_id, membro_id, funcao)
);

create table if not exists public.escala_repertorio (
  id text primary key,
  escala_id text not null references public.escalas(id) on update cascade on delete cascade,
  musica_id text not null references public.musicas(id) on update cascade on delete restrict,
  tom text not null default '',
  momento text not null default 'Louvor',
  ordem smallint not null default 0 check (ordem >= 0),
  unique (escala_id, ordem)
);

create index if not exists membro_funcoes_funcao_idx on public.membro_funcoes(funcao);
create index if not exists musicas_titulo_idx on public.musicas(lower(titulo));
create index if not exists escalas_data_idx on public.escalas(data);
create index if not exists escala_equipe_escala_ordem_idx on public.escala_equipe(escala_id, ordem);
create index if not exists escala_equipe_membro_idx on public.escala_equipe(membro_id);
create index if not exists escala_repertorio_escala_ordem_idx on public.escala_repertorio(escala_id, ordem);
create index if not exists escala_repertorio_musica_idx on public.escala_repertorio(musica_id);

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists membros_atualizado_em on public.membros;
create trigger membros_atualizado_em before update on public.membros
for each row execute function public.definir_atualizado_em();

drop trigger if exists musicas_atualizado_em on public.musicas;
create trigger musicas_atualizado_em before update on public.musicas
for each row execute function public.definir_atualizado_em();

drop trigger if exists escalas_atualizado_em on public.escalas;
create trigger escalas_atualizado_em before update on public.escalas
for each row execute function public.definir_atualizado_em();

alter table public.membros enable row level security;
alter table public.membro_funcoes enable row level security;
alter table public.musicas enable row level security;
alter table public.escalas enable row level security;
alter table public.escala_equipe enable row level security;
alter table public.escala_repertorio enable row level security;

revoke all on table public.membros from anon;
revoke all on table public.membro_funcoes from anon;
revoke all on table public.musicas from anon;
revoke all on table public.escalas from anon;
revoke all on table public.escala_equipe from anon;
revoke all on table public.escala_repertorio from anon;

grant select, insert, update, delete on table public.membros to authenticated;
grant select, insert, update, delete on table public.membro_funcoes to authenticated;
grant select, insert, update, delete on table public.musicas to authenticated;
grant select, insert, update, delete on table public.escalas to authenticated;
grant select, insert, update, delete on table public.escala_equipe to authenticated;
grant select, insert, update, delete on table public.escala_repertorio to authenticated;

drop policy if exists "Usuários autenticados gerenciam membros" on public.membros;
create policy "Usuários autenticados gerenciam membros" on public.membros
for all to authenticated using (true) with check (true);

drop policy if exists "Usuários autenticados gerenciam funções" on public.membro_funcoes;
create policy "Usuários autenticados gerenciam funções" on public.membro_funcoes
for all to authenticated using (true) with check (true);

drop policy if exists "Usuários autenticados gerenciam músicas" on public.musicas;
create policy "Usuários autenticados gerenciam músicas" on public.musicas
for all to authenticated using (true) with check (true);

drop policy if exists "Usuários autenticados gerenciam escalas" on public.escalas;
create policy "Usuários autenticados gerenciam escalas" on public.escalas
for all to authenticated using (true) with check (true);

drop policy if exists "Usuários autenticados gerenciam equipe da escala" on public.escala_equipe;
create policy "Usuários autenticados gerenciam equipe da escala" on public.escala_equipe
for all to authenticated using (true) with check (true);

drop policy if exists "Usuários autenticados gerenciam repertório da escala" on public.escala_repertorio;
create policy "Usuários autenticados gerenciam repertório da escala" on public.escala_repertorio
for all to authenticated using (true) with check (true);

commit;
