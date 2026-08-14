-- Atualização segura para instalações existentes.
-- Libera somente leitura pública e mantém alterações restritas a usuários autenticados.

begin;

grant select on table public.membros to anon;
grant select on table public.membro_funcoes to anon;
grant select on table public.musicas to anon;
grant select on table public.escalas to anon;
grant select on table public.escala_equipe to anon;
grant select on table public.escala_repertorio to anon;

drop policy if exists "Visualização pública de membros" on public.membros;
create policy "Visualização pública de membros" on public.membros for select to anon using (true);

drop policy if exists "Visualização pública de funções" on public.membro_funcoes;
create policy "Visualização pública de funções" on public.membro_funcoes for select to anon using (true);

drop policy if exists "Visualização pública de músicas" on public.musicas;
create policy "Visualização pública de músicas" on public.musicas for select to anon using (true);

drop policy if exists "Visualização pública de escalas" on public.escalas;
create policy "Visualização pública de escalas" on public.escalas for select to anon using (true);

drop policy if exists "Visualização pública da equipe escalada" on public.escala_equipe;
create policy "Visualização pública da equipe escalada" on public.escala_equipe for select to anon using (true);

drop policy if exists "Visualização pública do repertório escalado" on public.escala_repertorio;
create policy "Visualização pública do repertório escalado" on public.escala_repertorio for select to anon using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos-louvor', 'arquivos-louvor', true, 52428800, array['application/pdf', 'audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Líderes enviam arquivos de louvor" on storage.objects;
create policy "Líderes enviam arquivos de louvor" on storage.objects
for insert to authenticated with check (bucket_id = 'arquivos-louvor');

drop policy if exists "Arquivos de louvor públicos para leitura" on storage.objects;
create policy "Arquivos de louvor públicos para leitura" on storage.objects
for select to anon using (bucket_id = 'arquivos-louvor');

commit;
