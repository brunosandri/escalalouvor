# Banco de dados e arquivos no Supabase

O projeto possui um esquema relacional para centralizar equipe, repertório e escalas, além de um bucket público para PDF e MP3. As tabelas exigem autenticação; os arquivos podem ser abertos por quem possuir o link.

## 1. Criar as tabelas

Para a instalação mais simples, abra **SQL Editor > New query**, copie todo o conteúdo de `supabase/INSTALAR-TUDO.sql` e clique em **Run**. Esse arquivo cria as tabelas e importa os dados atuais em uma única operação.

Os arquivos `schema.sql` e `seed.sql` separados ficam disponíveis somente para manutenção técnica.

Serão criadas as tabelas:

- `membros`
- `membro_funcoes`
- `musicas`
- `escalas`
- `escala_equipe`
- `escala_repertorio`

O script também cria relacionamentos, exclusões em cascata, índices, atualização automática de datas e políticas RLS. Usuários anônimos não têm acesso aos cadastros; usuários de **Authentication > Users** podem consultar e alterar.

## 2. Importar os cadastros atuais

O arquivo `supabase/seed.sql` já contém 49 membros, 33 músicas e 9 escalas. Depois de executar o esquema, abra outra consulta no SQL Editor, copie `supabase/seed.sql` e clique em **Run**.

Se o JSON local for alterado antes da importação, gere novamente o arquivo:

```powershell
npm run db:seed
```

## 3. Criar o bucket e a regra de envio

No Supabase, abra **SQL Editor**, execute o SQL abaixo uma única vez e confirme que não existe uma política com o mesmo nome:

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

create policy "Equipe autenticada envia arquivos de louvor"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'arquivos-louvor');
```

## 4. Criar quem poderá acessar

Em **Authentication > Users**, adicione um usuário com e-mail e senha. Essa conta será usada na janela de cadastro do repertório.

## 5. Configurar o aplicativo

Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável disponíveis em **Project Settings > API**. Nunca coloque a chave `service_role` no aplicativo.

Depois, reinicie `npm run dev`. Em **Repertório > Nova música**, faça login, escolha o PDF ou MP3 e salve o cadastro. O upload preenche automaticamente o link correspondente.

Limites aplicados na interface: PDF até 15 MB e MP3 até 50 MB.

## 6. Próxima etapa

As tabelas e a carga inicial ficam prontas após os dois scripts SQL. O aplicativo ainda precisa trocar a persistência em `localStorage` por leitura e gravação nessas tabelas e apresentar login antes de carregar dados pessoais.
