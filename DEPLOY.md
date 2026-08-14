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

- Abrir o link sem login e confirmar que a escala aparece em modo de visualização.
- Conferir que o mapa cabe inteiro na largura de um iPhone, sem rolagem lateral.
- Entrar como líder e confirmar que os controles de edição aparecem.
- Criar uma escala de teste e salvá-la.
- Enviar um PDF e um MP3 pequenos.
- Abrir a cifra no Safari e reproduzir o VS no seletor de músicas.
- Testar o envio da mensagem pelo WhatsApp em um celular.

> A visualização usa acesso anônimo somente de leitura. As gravações continuam protegidas pelas políticas RLS e exigem uma conta de líder no Supabase Authentication.
