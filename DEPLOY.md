# Preparação para publicação

## Antes do deploy

1. Use Node.js 22, execute `npm ci` e `npm run check`.
2. Cadastre no provedor as variáveis de `.env.example`.
3. Não envie `.env.local` nem a pasta `biblioteca`; ambos estão no `.gitignore`.
4. Confirme no Supabase o bucket público e a política de upload descritos em `SUPABASE.md`.

## Netlify

O arquivo `netlify.toml` já configura o comando de build, a pasta `dist`, cache dos arquivos versionados e cabeçalhos básicos de segurança.

No painel do site, abra **Site configuration > Environment variables** e cadastre:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_BUCKET`

Depois publique. A pasta local `biblioteca` tem mais de 1 GB e deve ser enviada ao Supabase Storage em lotes, não junto com o site.

## Railway

O projeto inclui `railway.toml`, `.railwayignore` e um servidor de produção em `server.mjs`. O servidor usa automaticamente a variável `PORT`, oferece o healthcheck `/health`, compactação gzip, cache dos assets e fallback da SPA.

No Railway, conecte o repositório do GitHub e cadastre em **Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_BUCKET`

Não é necessário cadastrar `PORT`: o Railway fornece essa variável automaticamente. Em **Settings > Networking**, gere um domínio público depois que o deployment estiver saudável.

## Verificação após publicar

- Abrir uma escala e alternar entre mapa e lista.
- Criar uma escala de teste e salvá-la.
- Entrar no Supabase pelo cadastro do repertório.
- Enviar um PDF e um MP3 pequenos.
- Abrir a cifra e reproduzir o VS no seletor de músicas.
- Testar o envio da mensagem pelo WhatsApp em um celular.

> Atenção: o esquema central está preparado em `supabase/schema.sql`, mas o aplicativo ainda persiste os cadastros no armazenamento local. A próxima etapa é conectar as operações da interface às novas tabelas e exigir autenticação geral.
