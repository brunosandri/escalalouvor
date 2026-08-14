import { readFile, writeFile, mkdir } from "node:fs/promises";

const source = new URL("../outros/banco-escala-louvor.json", import.meta.url);
const destination = new URL("../supabase/seed.sql", import.meta.url);
const schemaSource = new URL("../supabase/schema.sql", import.meta.url);
const installerDestination = new URL("../supabase/INSTALAR-TUDO.sql", import.meta.url);
const db = JSON.parse(await readFile(source, "utf8"));

const quote = value => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${quote(JSON.stringify(value ?? {}))}::jsonb`;
const DEFAULT_AVATAR = {pele:"#f0bd89",cabelo:"#171817"};
const cleanRole = role => role === "Transmissão" ? "Mesa de corte" : role;
const rows = (items, columns, values, conflict) => {
  if (!items.length) return "";
  const tuples = items.map(item => `  (${values(item).join(", ")})`).join(",\n");
  return `insert into ${columns}\nvalues\n${tuples}\n${conflict};\n`;
};

const members = db.membros.map(member => ({...member,avatar:{...DEFAULT_AVATAR,...(member.avatar||{})},funcoes:[...new Set((member.funcoes||[]).map(cleanRole).filter(role=>role!=="Percussão"))]}));
const scales = db.escalas.map(scale => ({...scale,equipe:(scale.equipe||[]).map(item=>({...item,funcao:cleanRole(item.funcao)})).filter(item=>item.funcao!=="Percussão")}));
const songById = new Map(db.musicas.map(song=>[song.id,song]));
const versionKey = (musicId,tone) => `${musicId}:${String(tone||"").trim().toLocaleLowerCase("pt-BR")}`;
const versionId = (musicId,tone,baseTone) => String(tone||"")===String(baseTone||"")?`v-${musicId}`:`vt-${musicId}-${String(tone||"sem-tom").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}`;
const versionMap = new Map();
for(const song of db.musicas){
  const versions=Array.isArray(song.versoes)&&song.versoes.length?song.versoes:[{id:`v-${song.id}`,tom:song.tom||"",youtube:song.youtube||"",cifra:song.cifra||"",vs:song.vs||"",obs:""}];
  for(const version of versions)versionMap.set(versionKey(song.id,version.tom),{id:version.id||versionId(song.id,version.tom,song.tom),musicaId:song.id,tom:version.tom||"",youtube:version.youtube||"",cifra:version.cifra||"",vs:version.vs||"",obs:version.obs||""});
}
for(const scale of scales)for(const item of scale.repertorio||[]){const song=songById.get(item.musicaId),key=versionKey(item.musicaId,item.tom);if(song&&!versionMap.has(key))versionMap.set(key,{id:versionId(song.id,item.tom,song.tom),musicaId:song.id,tom:item.tom||"",youtube:song.youtube||"",cifra:"",vs:"",obs:""})}
const songVersionItems=[...versionMap.values()];

const memberRows = rows(members,"public.membros (id, nome, whatsapp, avatar)",m=>[quote(m.id),quote(m.nome),quote(m.whatsapp||""),json(m.avatar)],"on conflict (id) do update set nome=excluded.nome, whatsapp=excluded.whatsapp, avatar=excluded.avatar");
const roleItems = members.flatMap(m => m.funcoes.map((funcao,ordem)=>({membroId:m.id,funcao,ordem})));
const roleRows = rows(roleItems,"public.membro_funcoes (membro_id, funcao, ordem)",r=>[quote(r.membroId),quote(r.funcao),r.ordem],"on conflict (membro_id, funcao) do update set ordem=excluded.ordem");
const songRows = rows(db.musicas,"public.musicas (id, tipo, hinario, numero, titulo, tom_padrao, youtube_url, cifra_url, vs_url)",m=>[quote(m.id),quote(m.tipo||"Música"),quote(m.hinario||""),quote(m.numero||""),quote(m.titulo),quote(m.tom||""),quote(m.youtube||""),quote(m.cifra||""),quote(m.vs||"")],"on conflict (id) do update set tipo=excluded.tipo, hinario=excluded.hinario, numero=excluded.numero, titulo=excluded.titulo, tom_padrao=excluded.tom_padrao, youtube_url=excluded.youtube_url, cifra_url=excluded.cifra_url, vs_url=excluded.vs_url");
const songVersionRows = rows(songVersionItems,"public.musica_versoes (id, musica_id, tom, youtube_url, cifra_url, vs_url, observacoes)",v=>[quote(v.id),quote(v.musicaId),quote(v.tom),quote(v.youtube),quote(v.cifra),quote(v.vs),quote(v.obs)],"on conflict (musica_id, tom) do update set youtube_url=excluded.youtube_url, cifra_url=excluded.cifra_url, vs_url=excluded.vs_url, observacoes=excluded.observacoes, ativo=true");
const scaleRows = rows(scales,"public.escalas (id, data, culto, saudacao, ensaio, observacoes)",s=>[quote(s.id),quote(s.data),quote(s.culto),quote(s.saudacao||"Olá!"),quote(s.ensaio||""),quote(s.obs||"")],"on conflict (id) do update set data=excluded.data, culto=excluded.culto, saudacao=excluded.saudacao, ensaio=excluded.ensaio, observacoes=excluded.observacoes");
const teamItems = scales.flatMap(s=>s.equipe.map((item,ordem)=>({escalaId:s.id,membroId:item.id,funcao:item.funcao,ordem})));
const teamRows = rows(teamItems,"public.escala_equipe (escala_id, membro_id, funcao, ordem)",r=>[quote(r.escalaId),quote(r.membroId),quote(r.funcao),r.ordem],"on conflict (escala_id, membro_id, funcao) do update set ordem=excluded.ordem");
const repertoireItems = scales.flatMap(s=>(s.repertorio||[]).map((item,ordem)=>({id:item.chave,escalaId:s.id,musicaId:item.musicaId,versaoId:item.versaoId||versionMap.get(versionKey(item.musicaId,item.tom))?.id||null,tom:item.tom||"",momento:item.momento||"Louvor",obs:item.obs||"",ordem})));
const repertoireRows = rows(repertoireItems,"public.escala_repertorio (id, escala_id, musica_id, versao_id, tom, momento, observacoes, ordem)",r=>[quote(r.id),quote(r.escalaId),quote(r.musicaId),quote(r.versaoId),quote(r.tom),quote(r.momento),quote(r.obs),r.ordem],"on conflict (id) do update set escala_id=excluded.escala_id, musica_id=excluded.musica_id, versao_id=excluded.versao_id, tom=excluded.tom, momento=excluded.momento, observacoes=excluded.observacoes, ordem=excluded.ordem");

const sql = `-- Gerado automaticamente a partir de outros/banco-escala-louvor.json\n-- Execute depois de supabase/schema.sql.\n\nbegin;\n\n${memberRows}\n${roleRows}\n${songRows}\n${songVersionRows}\n${scaleRows}\n${teamRows}\n${repertoireRows}\ncommit;\n`;
await mkdir(new URL("../supabase/", import.meta.url), { recursive: true });
await writeFile(destination, sql, "utf8");
const schema = await readFile(schemaSource, "utf8");
const installer = `-- INSTALAÇÃO COMPLETA DO ESCALA LOUVOR\n-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.\n\n${schema.trim()}\n\n${sql.trim()}\n`;
await writeFile(installerDestination, installer, "utf8");
console.log(`Instalação gerada: ${members.length} membros, ${db.musicas.length} músicas e ${scales.length} escalas.`);
