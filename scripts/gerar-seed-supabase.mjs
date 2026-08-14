import { readFile, writeFile, mkdir } from "node:fs/promises";

const source = new URL("../outros/banco-escala-louvor.json", import.meta.url);
const destination = new URL("../supabase/seed.sql", import.meta.url);
const schemaSource = new URL("../supabase/schema.sql", import.meta.url);
const installerDestination = new URL("../supabase/INSTALAR-TUDO.sql", import.meta.url);
const db = JSON.parse(await readFile(source, "utf8"));

const quote = value => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${quote(JSON.stringify(value ?? {}))}::jsonb`;
const cleanRole = role => role === "Transmissão" ? "Mesa de corte" : role;
const rows = (items, columns, values, conflict) => {
  if (!items.length) return "";
  const tuples = items.map(item => `  (${values(item).join(", ")})`).join(",\n");
  return `insert into ${columns}\nvalues\n${tuples}\n${conflict};\n`;
};

const members = db.membros.map(member => ({...member, funcoes:[...new Set((member.funcoes||[]).map(cleanRole).filter(role=>role!=="Percussão"))]}));
const scales = db.escalas.map(scale => ({...scale,equipe:(scale.equipe||[]).map(item=>({...item,funcao:cleanRole(item.funcao)})).filter(item=>item.funcao!=="Percussão")}));

const memberRows = rows(members,"public.membros (id, nome, whatsapp, avatar)",m=>[quote(m.id),quote(m.nome),quote(m.whatsapp||""),json(m.avatar)],"on conflict (id) do update set nome=excluded.nome, whatsapp=excluded.whatsapp, avatar=excluded.avatar");
const roleItems = members.flatMap(m => m.funcoes.map((funcao,ordem)=>({membroId:m.id,funcao,ordem})));
const roleRows = rows(roleItems,"public.membro_funcoes (membro_id, funcao, ordem)",r=>[quote(r.membroId),quote(r.funcao),r.ordem],"on conflict (membro_id, funcao) do update set ordem=excluded.ordem");
const songRows = rows(db.musicas,"public.musicas (id, tipo, hinario, numero, titulo, tom_padrao, youtube_url, cifra_url, vs_url)",m=>[quote(m.id),quote(m.tipo||"Música"),quote(m.hinario||""),quote(m.numero||""),quote(m.titulo),quote(m.tom||""),quote(m.youtube||""),quote(m.cifra||""),quote(m.vs||"")],"on conflict (id) do update set tipo=excluded.tipo, hinario=excluded.hinario, numero=excluded.numero, titulo=excluded.titulo, tom_padrao=excluded.tom_padrao, youtube_url=excluded.youtube_url, cifra_url=excluded.cifra_url, vs_url=excluded.vs_url");
const scaleRows = rows(scales,"public.escalas (id, data, culto, saudacao, ensaio, observacoes)",s=>[quote(s.id),quote(s.data),quote(s.culto),quote(s.saudacao||"Olá!"),quote(s.ensaio||""),quote(s.obs||"")],"on conflict (id) do update set data=excluded.data, culto=excluded.culto, saudacao=excluded.saudacao, ensaio=excluded.ensaio, observacoes=excluded.observacoes");
const teamItems = scales.flatMap(s=>s.equipe.map((item,ordem)=>({escalaId:s.id,membroId:item.id,funcao:item.funcao,ordem})));
const teamRows = rows(teamItems,"public.escala_equipe (escala_id, membro_id, funcao, ordem)",r=>[quote(r.escalaId),quote(r.membroId),quote(r.funcao),r.ordem],"on conflict (escala_id, membro_id, funcao) do update set ordem=excluded.ordem");
const repertoireItems = scales.flatMap(s=>(s.repertorio||[]).map((item,ordem)=>({id:item.chave,escalaId:s.id,musicaId:item.musicaId,tom:item.tom||"",momento:item.momento||"Louvor",ordem})));
const repertoireRows = rows(repertoireItems,"public.escala_repertorio (id, escala_id, musica_id, tom, momento, ordem)",r=>[quote(r.id),quote(r.escalaId),quote(r.musicaId),quote(r.tom),quote(r.momento),r.ordem],"on conflict (id) do update set escala_id=excluded.escala_id, musica_id=excluded.musica_id, tom=excluded.tom, momento=excluded.momento, ordem=excluded.ordem");

const sql = `-- Gerado automaticamente a partir de outros/banco-escala-louvor.json\n-- Execute depois de supabase/schema.sql.\n\nbegin;\n\n${memberRows}\n${roleRows}\n${songRows}\n${scaleRows}\n${teamRows}\n${repertoireRows}\ncommit;\n`;
await mkdir(new URL("../supabase/", import.meta.url), { recursive: true });
await writeFile(destination, sql, "utf8");
const schema = await readFile(schemaSource, "utf8");
const installer = `-- INSTALAÇÃO COMPLETA DO ESCALA LOUVOR\n-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.\n\n${schema.trim()}\n\n${sql.trim()}\n`;
await writeFile(installerDestination, installer, "utf8");
console.log(`Instalação gerada: ${members.length} membros, ${db.musicas.length} músicas e ${scales.length} escalas.`);
