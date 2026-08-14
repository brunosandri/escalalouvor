# Banco de dados e arquivos no Supabase

O projeto possui um esquema relacional para centralizar equipe, repertório e escalas, além de um bucket público para PDF e MP3. Qualquer pessoa com o link pode visualizar as escalas e abrir os arquivos; somente líderes autenticados podem alterar os dados ou enviar arquivos.

## 1. Criar as tabelas

Para a instalação mais simples, abra **SQL Editor > New query**, copie todo o conteúdo de `supabase/INSTALAR-TUDO.sql` e clique em **Run**. Esse arquivo cria as tabelas e importa os dados atuais em uma única operação.

Os arquivos `schema.sql` e `seed.sql` separados ficam disponíveis somente para manutenção técnica.

Serão criadas as tabelas:

- `membros`
- `membro_funcoes`
- `musicas`
- `musica_versoes` (cifra, VS, YouTube e observações separados por tom)
- `escalas`
- `escala_equipe`
- `escala_repertorio`

O script também cria relacionamentos, exclusões em cascata, índices, atualização automática de datas e políticas RLS. Usuários anônimos possuem somente leitura; usuários de **Authentication > Users** podem consultar e alterar.

### Atualizar um banco que já está instalado

Antes de publicar esta versão do aplicativo, execute uma vez o arquivo `supabase/ATUALIZAR-VERSOES-MUSICAS.sql` no SQL Editor. Ele preserva os cadastros atuais, transforma os arquivos antigos na versão do tom padrão e liga cada item das escalas ao tom correspondente.

## 2. Importar os cadastros atuais

O arquivo `supabase/seed.sql` já contém 49 membros, 33 músicas e 9 escalas. Depois de executar o esquema, abra outra consulta no SQL Editor, copie `supabase/seed.sql` e clique em **Run**.

Se o JSON local for alterado antes da importação, gere novamente o arquivo:

```powershell
npm run db:seed
```

## 3. Configurar o bucket e as regras de arquivo

O arquivo `supabase/INSTALAR-TUDO.sql` já cria ou atualiza o bucket público e suas políticas. Em um banco que já está instalado, execute somente `supabase/ATUALIZAR-ACESSO-PUBLICO.sql` para preservar os dados atuais. Se precisar executar apenas a parte do Storage, use:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arquivos-louvor',
  'arquivos-louvor',
  true,
  52428800,
  array['application/pdf', 'audio/mpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Líderes enviam arquivos de louvor" on storage.objects;
create policy "Líderes enviam arquivos de louvor"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'arquivos-louvor');

drop policy if exists "Arquivos de louvor públicos para leitura" on storage.objects;
create policy "Arquivos de louvor públicos para leitura"
on storage.objects
for select
to anon
using (bucket_id = 'arquivos-louvor');
```

## 4. Criar quem poderá acessar

Em **Authentication > Users**, adicione somente os líderes autorizados, cada um com seu e-mail e senha. Essas contas ativam os controles de edição no aplicativo.

## 5. Configurar o aplicativo

Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável disponíveis em **Project Settings > API**. Nunca coloque a chave `service_role` no aplicativo.

Depois, reinicie `npm run dev`. Entre como líder, abra **Repertório > Nova música**, adicione um ou mais tons e escolha o PDF ou MP3 de cada versão. O upload preenche automaticamente o link público do tom correspondente.

Limites aplicados na interface: PDF até 15 MB e MP3 até 50 MB.

## 6. Conferência

Abra o link em uma janela anônima para validar a visualização pública. Depois, entre como líder e confirme que os botões de cadastrar, editar e excluir aparecem. Teste também um PDF e um MP3 já enviados.
