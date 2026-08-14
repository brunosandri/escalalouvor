-- Organiza cifras, VS e referências por música e tom.
-- Execute uma vez no SQL Editor do Supabase antes de publicar a interface nova.

begin;

create table if not exists public.musica_versoes (
  id text primary key,
  musica_id text not null references public.musicas(id) on update cascade on delete cascade,
  tom text not null default '',
  youtube_url text not null default '',
  cifra_url text not null default '',
  vs_url text not null default '',
  observacoes text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (musica_id, tom)
);

alter table public.escala_repertorio
  add column if not exists versao_id text references public.musica_versoes(id) on update cascade on delete restrict,
  add column if not exists observacoes text not null default '';

create index if not exists musica_versoes_musica_tom_idx
  on public.musica_versoes(musica_id, tom);

-- Converte o conjunto antigo de arquivos da música em sua versão padrão.
insert into public.musica_versoes
  (id, musica_id, tom, youtube_url, cifra_url, vs_url, observacoes)
select
  'v-' || m.id,
  m.id,
  m.tom_padrao,
  m.youtube_url,
  m.cifra_url,
  m.vs_url,
  ''
from public.musicas m
on conflict (musica_id, tom) do update set
  youtube_url = case when public.musica_versoes.youtube_url = '' then excluded.youtube_url else public.musica_versoes.youtube_url end,
  cifra_url = case when public.musica_versoes.cifra_url = '' then excluded.cifra_url else public.musica_versoes.cifra_url end,
  vs_url = case when public.musica_versoes.vs_url = '' then excluded.vs_url else public.musica_versoes.vs_url end;

-- Cria versões adicionais para tons que já foram usados em escalas.
insert into public.musica_versoes (id, musica_id, tom, youtube_url)
select
  'v-' || substr(md5(r.musica_id || ':' || r.tom), 1, 20),
  r.musica_id,
  r.tom,
  m.youtube_url
from (select distinct musica_id, tom from public.escala_repertorio) r
join public.musicas m on m.id = r.musica_id
on conflict (musica_id, tom) do nothing;

update public.escala_repertorio r
set versao_id = v.id
from public.musica_versoes v
where v.musica_id = r.musica_id
  and v.tom = r.tom
  and r.versao_id is null;

drop trigger if exists musica_versoes_atualizado_em on public.musica_versoes;
create trigger musica_versoes_atualizado_em before update on public.musica_versoes
for each row execute function public.definir_atualizado_em();

alter table public.musica_versoes enable row level security;

grant select on table public.musica_versoes to anon;
grant select, insert, update, delete on table public.musica_versoes to authenticated;

drop policy if exists "Visualização pública de versões das músicas" on public.musica_versoes;
create policy "Visualização pública de versões das músicas"
on public.musica_versoes for select to anon using (true);

drop policy if exists "Usuários autenticados gerenciam versões das músicas" on public.musica_versoes;
create policy "Usuários autenticados gerenciam versões das músicas"
on public.musica_versoes for all to authenticated using (true) with check (true);

commit;
