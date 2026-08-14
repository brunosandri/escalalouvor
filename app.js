import seedData from "./outros/banco-escala-louvor.json";
import { createClient } from "@supabase/supabase-js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const STORAGE = "pib-maracaju-escala-v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "arquivos-louvor";
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL,SUPABASE_KEY) : null;
const FUNCOES = ["Dirigente","Vocal feminino","Vocal masculino","Violão","Guitarra","Baixo","Teclado","Bateria","Piano","Órgão","Mídia","Som","Mesa de corte","Câmera 1","Câmera 2"];
const MOMENTOS = ["Abertura","Louvor","Oferta","Ceia","Batismo"];
const CULTOS = ["Culto da Família (dom 19h)","Culto de Oração (qua 19h)","EBD (dom 9h)","Culto Jovem (sáb 18h)","Evento especial"];
const ICONS = {"Dirigente":"♟","Vocal feminino":"🎙","Vocal masculino":"🎙","Violão":"🎸","Guitarra":"🎸","Baixo":"🎸","Teclado":"🎹","Bateria":"🥁","Piano":"🎹","Órgão":"🎹","Mídia":"▶","Som":"🎚","Mesa de corte":"🎛","Câmera 1":"📹","Câmera 2":"📹"};
const POSITIONS = {"Bateria":[18,10],"Guitarra":[13,21],"Violão":[29,21],"Baixo":[43,21],"Teclado":[61,21],"Órgão":[91,12],"Piano":[91,22],"Dirigente":[50,31],"Câmera 2":[12,45],"Câmera 1":[88,45],"Som":[25,87],"Mesa de corte":[50,87],"Mídia":[75,87]};
const TEAM = {"Dirigente":"lideranca","Vocal feminino":"vocais","Vocal masculino":"vocais","Violão":"instrumentos","Guitarra":"instrumentos","Baixo":"instrumentos","Teclado":"instrumentos","Bateria":"instrumentos","Piano":"instrumentos","Órgão":"instrumentos","Câmera 1":"transmissao","Câmera 2":"transmissao","Mesa de corte":"transmissao","Som":"audio","Mídia":"midia"};
const VOCAL_LIMITS = {"Vocal masculino":2,"Vocal feminino":3};
const TEAM_COLOR = {instrumentos:"var(--instrumentos)",vocais:"var(--vocais)",lideranca:"var(--lideranca)",transmissao:"var(--transmissao)",audio:"var(--audio)",midia:"var(--midia)"};
const TEAM_LABEL = {instrumentos:"Instrumentos",vocais:"Vocais",lideranca:"Liderança",transmissao:"Transmissão",audio:"Áudio",midia:"Mídia"};
const DEFAULT_AVATAR = Object.freeze({pele:"#f0bd89",cabelo:"#171817"});
const roleColor = f => f==="Vocal feminino" ? "#b83f7a" : f==="Vocal masculino" ? "#405ca8" : teamColor(f);
const state = { db:null, screen:"escala", selected:null, calendar:false, calendarDate:new Date(), query:"", drawer:false, sheet:null, modal:null, editorMode:"mapa", editingScale:null, canvasRaf:null, storageSession:null, audio:null, cloudLoading:false, cloudReady:false, cloudError:"", syncing:false };

const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const uid = () => Math.random().toString(36).slice(2,10);
const parseDate = s => new Date(`${s}T12:00:00`);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmt = (s, opts={day:"2-digit",month:"long",year:"numeric"}) => parseDate(s).toLocaleDateString("pt-BR",opts);
const shortName = n => n.split(" ")[0];
const member = id => state.db.membros.find(m=>m.id===id);
const music = id => state.db.musicas.find(m=>m.id===id);
const teamColor = f => TEAM_COLOR[TEAM[f]||"instrumentos"];
const safeUrl = value => { try { const url=new URL(String(value||""),location.href); return ["http:","https:"].includes(url.protocol)?url.href:""; } catch { return ""; } };
const save = () => { try { localStorage.setItem(STORAGE, JSON.stringify(state.db)); return true; } catch { toast("Não foi possível salvar neste dispositivo"); return false; } };
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),2600); }
function activeScale(){ return state.db.escalas.find(e=>e.id===state.selected) || state.db.escalas[0]; }
function nearestScale(){ const today=iso(new Date()); return [...state.db.escalas].sort((a,b)=>a.data.localeCompare(b.data)).find(e=>e.data>=today) || [...state.db.escalas].sort((a,b)=>b.data.localeCompare(a.data))[0]; }
function occurrences(type,id){ const rows=state.db.escalas.filter(e => type==="m" ? e.equipe.some(x=>x.id===id) : e.repertorio.some(x=>x.musicaId===id)).sort((a,b)=>b.data.localeCompare(a.data)); return {count:rows.length,last:rows[0]?.data}; }

function groupBy(items,key){return items.reduce((map,item)=>{const value=item[key];(map[value]||=[]).push(item);return map},{})}
async function loadCloudData(){
  if(!supabase||!state.storageSession)return false;
  state.cloudLoading=true;state.cloudError="";
  try{
    const results=await Promise.all([
      supabase.from("membros").select("id,nome,whatsapp,avatar,ativo").eq("ativo",true),
      supabase.from("membro_funcoes").select("membro_id,funcao,ordem").order("ordem"),
      supabase.from("musicas").select("id,tipo,hinario,numero,titulo,tom_padrao,youtube_url,cifra_url,vs_url,ativo").eq("ativo",true),
      supabase.from("escalas").select("id,data,culto,saudacao,ensaio,observacoes").order("data"),
      supabase.from("escala_equipe").select("escala_id,membro_id,funcao,ordem").order("ordem"),
      supabase.from("escala_repertorio").select("id,escala_id,musica_id,tom,momento,ordem").order("ordem")
    ]);
    const failed=results.find(result=>result.error);if(failed)throw failed.error;
    const [membersResult,rolesResult,songsResult,scalesResult,teamResult,repertoireResult]=results;
    const roles=groupBy(rolesResult.data,"membro_id"),team=groupBy(teamResult.data,"escala_id"),repertoire=groupBy(repertoireResult.data,"escala_id");
    state.db={
      membros:membersResult.data.map(m=>({id:m.id,nome:m.nome,whatsapp:m.whatsapp||"",avatar:m.avatar||{},funcoes:(roles[m.id]||[]).sort((a,b)=>a.ordem-b.ordem).map(r=>r.funcao)})),
      musicas:songsResult.data.map(m=>({id:m.id,tipo:m.tipo,hinario:m.hinario||"",numero:m.numero||"",titulo:m.titulo,tom:m.tom_padrao||"",youtube:m.youtube_url||"",cifra:m.cifra_url||"",vs:m.vs_url||""})),
      escalas:scalesResult.data.map(s=>({id:s.id,data:s.data,culto:s.culto,saudacao:s.saudacao||"Olá!",ensaio:s.ensaio||"",obs:s.observacoes||"",equipe:(team[s.id]||[]).sort((a,b)=>a.ordem-b.ordem).map(x=>({id:x.membro_id,funcao:x.funcao})),repertorio:(repertoire[s.id]||[]).sort((a,b)=>a.ordem-b.ordem).map(x=>({chave:x.id,musicaId:x.musica_id,tom:x.tom||"",momento:x.momento||"Louvor"}))}))
    };
    state.cloudReady=true;save();return true;
  }catch(error){state.cloudReady=false;state.cloudError=error?.message||"Não foi possível carregar o banco de dados.";return false}
  finally{state.cloudLoading=false}
}

async function init(){
  try { state.db=JSON.parse(localStorage.getItem(STORAGE)) || structuredClone(seedData); }
  catch { state.db=structuredClone(seedData); }
  state.db={membros:Array.isArray(state.db?.membros)?state.db.membros:[],musicas:Array.isArray(state.db?.musicas)?state.db.musicas:[],escalas:Array.isArray(state.db?.escalas)?state.db.escalas:[]};
  const mergeSeed=(current,seed)=>{const existing=new Map(current.map(x=>[x.id,x]));return [...current,...seed.filter(x=>!existing.has(x.id)).map(x=>structuredClone(x))]};
  state.db.membros=mergeSeed(state.db.membros,seedData.membros);state.db.musicas=mergeSeed(state.db.musicas,seedData.musicas);
  const seedSongs=new Map(seedData.musicas.map(m=>[m.id,m]));state.db.musicas.forEach(m=>{const source=seedSongs.get(m.id);if(source?.youtube&&!m.youtube)m.youtube=source.youtube});
  state.db.membros.forEach(m=>{ m.funcoes=[...new Set(m.funcoes.map(f=>f==="Transmissão"?"Mesa de corte":f).filter(f=>f!=="Percussão"))]; m.avatar=avatarSettings(m); });
  state.db.escalas.forEach(e=>{const migrated=e.equipe.filter(x=>x.funcao!=="Percussão").map(x=>({...x,funcao:x.funcao==="Transmissão"?"Mesa de corte":x.funcao}));e.equipe=[...new Map(migrated.map(x=>[`${x.id}:${x.funcao}`,x])).values()];if(!e.saudacao||/^bom+m*\s*dia+a*$/i.test(e.saudacao.trim()))e.saudacao="Olá!"}); state.db.escalas.sort((a,b)=>a.data.localeCompare(b.data));
  save();
  if(supabase){try{const {data}=await supabase.auth.getSession();state.storageSession=data.session;if(data.session)await loadCloudData()}catch{state.storageSession=null}}
  state.selected=nearestScale()?.id; const a=activeScale(); if(a) state.calendarDate=parseDate(a.data);
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(state.modal){state.modal=null;render()}else if(state.sheet){state.sheet=null;render()}else if(state.drawer){state.drawer=false;render()}});
  render();
}

function shell(content){
  return `<div class="app-shell">
    <header class="topbar"><button class="icon-btn" data-action="drawer" aria-label="Abrir menu">☰</button><div class="brand-title"><strong>ESCALA LOUVOR</strong><span>Primeira Igreja Batista de Maracaju</span></div><span class="avatar-button" aria-label="PIB Maracaju">PIB</span></header>
    <main class="main">${content}</main>${audioDock()}${bottomNav()}${drawer()}${sheet()}${modal()}</div>`;
}
function authScreen(){return `<div class="auth-screen"><section class="auth-card"><div class="auth-brand"><span>♫</span><div><strong>ESCALA LOUVOR</strong><small>Primeira Igreja Batista de Maracaju</small></div></div><div class="auth-copy"><span class="eyebrow">Área da equipe</span><h1>Entre para acessar as escalas</h1><p>Use o e-mail e a senha cadastrados em Authentication → Users no Supabase.</p></div><form data-app-login><div class="field"><label>E-mail</label><input name="email" type="email" autocomplete="email" required autofocus placeholder="seuemail@exemplo.com"></div><div class="field"><label>Senha</label><input name="password" type="password" autocomplete="current-password" required placeholder="Sua senha"></div><small class="auth-error" data-app-auth-status></small><button class="btn btn-primary btn-wide">Entrar</button></form><small class="auth-security">🔒 Cadastros protegidos e sincronizados pelo Supabase</small></section></div>`}
function cloudErrorScreen(){return `<div class="auth-screen"><section class="auth-card"><div class="auth-brand"><span>!</span><div><strong>Não foi possível carregar</strong><small>Conexão com o banco de dados</small></div></div><p class="cloud-error-text">${esc(state.cloudError)}</p><button class="btn btn-primary btn-wide" data-action="retry-cloud">Tentar novamente</button><button class="btn btn-light btn-wide" data-action="logout">Sair da conta</button></section></div>`}
function audioDock(){if(!state.audio)return "";const url=safeUrl(state.audio.url);if(!url)return "";return `<aside class="audio-dock" aria-label="Reprodutor de VS"><div class="audio-meta"><span>♪</span><div><small>VS em reprodução</small><strong>${esc(state.audio.title)}</strong></div></div><audio src="${esc(url)}" controls autoplay></audio><a class="audio-download" href="${esc(url)}" target="_blank" rel="noopener noreferrer" download="${esc(fileName(state.audio.title,'mp3'))}" aria-label="Baixar VS">↓</a><button class="audio-close" data-action="close-audio" aria-label="Fechar reprodutor">×</button></aside>`}
function bottomNav(){ return `<nav class="bottom-nav" aria-label="Navegação principal">${[["escala","⌂","Escala"],["agenda","▣","Agenda"],["repertorio","♫","Repertório"],["equipe","♙","Equipe"]].map(([id,i,l])=>`<button class="tab ${state.screen===id?'active':''}" data-nav="${id}"><span class="tab-icon">${i}</span>${l}</button>`).join("")}</nav>`; }
function drawer(){ const groups=[
  ["Ir para",[["escala","⌂","Escala"],["agenda","▣","Agenda"],["repertorio","♫","Repertório"],["equipe","♙","Equipe"]]],
  ["Este culto",[["escala","♙","Ver equipe"],["message","↗","Enviar mensagem"],["csv","⇩","Baixar planilha da escala"],["editor-music","♫","Adicionar músicas"],["links","⌁","Arquivos (cifras e VS)"]]],
  ["Organizar",[["new-scale","＋","Cadastrar nova escala"],["editor","✎","Alterar escala"],["agenda","◷","Editar escalas anteriores"],["new-member","＋","Adicionar novo membro"]]]
]; return `<div class="drawer-overlay ${state.drawer?'open':''}" data-action="close-drawer"><aside class="drawer" onclick="event.stopPropagation()"><div class="drawer-head"><button class="icon-btn close" data-action="close-drawer">×</button><div class="drawer-logo">PIB</div><strong>Escala Louvor</strong><span>Servir com alegria, organizar com cuidado.</span></div>${groups.map(([t,items])=>`<div class="menu-group"><div class="menu-group-title">${t}</div>${items.map(([a,i,l])=>`<button class="menu-item" data-menu="${a}"><span class="mi">${i}</span>${l}</button>`).join("")}</div>`).join("")}<div class="menu-footer">${supabase?`<div class="cloud-account"><i></i><span><b>Banco sincronizado</b><small>${esc(state.storageSession?.user?.email||"")}</small></span></div><button class="btn btn-light btn-wide" data-action="reload-cloud">↻ Atualizar do banco</button><button class="btn btn-danger btn-wide" data-action="logout">Sair da conta</button>`:`<button class="btn btn-light btn-wide" data-action="reset">↻ Atualizar dados</button>`}</div></aside></div>`; }

async function appLogin(event){
  event.preventDefault();if(!supabase)return;
  const form=event.currentTarget,status=$('[data-app-auth-status]',form),button=$('button',form),email=form.elements.email.value.trim(),password=form.elements.password.value;
  button.disabled=true;button.textContent="Entrando…";status.textContent="";
  try{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;state.storageSession=data.session;if(!await loadCloudData())throw new Error(state.cloudError);state.selected=nearestScale()?.id;const scale=activeScale();if(scale)state.calendarDate=parseDate(scale.data);render();toast("Dados sincronizados")}
  catch(error){if(state.storageSession){state.cloudError=error?.message||"Não foi possível carregar o banco de dados.";render()}else{status.textContent=error?.message||"Não foi possível entrar.";button.disabled=false;button.textContent="Entrar"}}
}
async function appLogout(){if(!supabase)return;try{await supabase.auth.signOut()}finally{state.storageSession=null;state.cloudReady=false;state.cloudError="";state.modal=null;state.drawer=false;render()}}
function bindAuth(){
  $('[data-app-login]')?.addEventListener('submit',appLogin);
  $('[data-action="retry-cloud"]')?.addEventListener('click',async()=>{if(await loadCloudData()){state.selected=nearestScale()?.id;render()}else render()});
  $('[data-action="logout"]')?.addEventListener('click',appLogout);
}

function render(){ if(state.canvasRaf) cancelAnimationFrame(state.canvasRaf);if(supabase&&!state.storageSession){$("#app").innerHTML=authScreen();bindAuth();return}if(supabase&&state.cloudError&&!state.cloudReady){$("#app").innerHTML=cloudErrorScreen();bindAuth();return}let content=state.screen==="escala"?scaleScreen():state.screen==="agenda"?agendaScreen():state.screen==="repertorio"?repertoireScreen():state.screen==="equipe"?teamScreen():editorScreen(); $("#app").innerHTML=shell(content); bind(); const canvas=$("[data-map-canvas]"); if(canvas) startRpgCanvas(canvas,state.editingScale||activeScale()); }
function navigate(screen){ if(state.screen==="editor"&&state.editingScale&&screen!=="editor"&&!confirm("Sair sem salvar as alterações da escala?"))return; if(screen!=="editor")state.editingScale=null;state.screen=screen; state.drawer=false; state.query=""; render(); window.scrollTo({top:0,behavior:"smooth"}); }

function scaleScreen(){ const s=activeScale(); if(!s) return empty("Nenhuma escala cadastrada"); return `<section class="screen">
  <div class="date-controls"><select class="date-select" data-action="select-scale" aria-label="Selecionar escala">${state.db.escalas.map(e=>`<option value="${e.id}" ${e.id===s.id?'selected':''}>${fmt(e.data,{weekday:"short",day:"2-digit",month:"short"})} · ${esc(e.culto.replace(/ \(.+/,""))}</option>`).join("")}</select><button class="btn btn-outline" data-action="calendar">▣ <span class="desktop-label">Calendário</span></button></div>
  ${state.calendar?calendar():""}<article class="culto-ribbon"><div><span>${fmt(s.data,{weekday:"long",day:"2-digit",month:"long"})}</span><h1>${esc(s.culto.replace(/ \(.+/,""))}</h1></div><div class="live-chip"><i></i>${s.equipe.length} na equipe</div></article>
  ${mapView(s)}<div class="action-strip map-actions"><button class="btn btn-primary" data-action="message">↗ Enviar mensagem</button><button class="btn btn-gold" data-action="copy">▣ Copiar</button><button class="btn btn-light" data-action="csv">⇩ Baixar planilha</button><butt…11481 tokens truncated….opacity="0";document.body.append(t);t.select();document.execCommand("copy");t.remove();} toast("Copiado para a área de transferência"); }
function buildLinks(s){ return s.repertorio.flatMap(r=>{const m=music(r.musicaId); if(!m)return[]; const links=[["Cifra",m.cifra],["VS",m.vs]].filter(x=>x[1]).map(([l,u])=>`${l}: ${u}`); return links.length?[`${m.titulo} (${r.tom||'sem tom'})`,...links,""]:[];}).join("\n").trim()||"Nenhum link de cifra ou VS cadastrado."; }
function downloadResource(value,name){const url=safeUrl(value);if(!url){toast("Link inválido ou inseguro");return}try{const a=document.createElement("a");a.href=url;a.download=name;a.target="_blank";a.rel="noopener noreferrer";document.body.append(a);a.click();a.remove();toast(`Abrindo ${name.endsWith('.mp3')?'VS MP3':'cifra/letra PDF'}…`)}catch{window.open(url,"_blank","noopener,noreferrer");toast("O arquivo foi aberto em outra aba")}}
function downloadCsv(s){ const rows=[["Equipe"],["Função","Nome","WhatsApp"],...s.equipe.map(e=>[e.funcao,member(e.id)?.nome||"",member(e.id)?.whatsapp||""]),[],["Repertório"],["Momento","Música","Tom","Referência","Cifra","VS"],...s.repertorio.map(r=>{const m=music(r.musicaId)||{};return[r.momento,m.titulo||"",r.tom||"",m.youtube||"",m.cifra||"",m.vs||""]})]; const csv="\ufeff"+rows.map(row=>row.map(x=>`"${String(x).replaceAll('"','""')}"`).join(";")).join("\r\n"); try{const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`escala-${s.data}.csv`;a.click();URL.revokeObjectURL(url);toast("Planilha baixada");}catch{copy(csv);toast("Download bloqueado — CSV copiado");} }

function newScale(date=iso(new Date())){ const wed=parseDate(date).getDay()===3; state.editingScale={id:uid(),data:date,culto:wed?CULTOS[1]:CULTOS[0],saudacao:"Olá!",ensaio:wed?"":"Ensaio no domingo após a EBD.",obs:"",equipe:[],repertorio:[],__new:true}; state.screen="editor"; state.drawer=false; render(); }
function duplicate(id){ const src=state.db.escalas.find(e=>e.id===id); if(!src)return; const d=new Date(parseDate(src.data)); d.setDate(d.getDate()+7); state.editingScale=structuredClone(src); state.editingScale.id=uid();state.editingScale.data=iso(d);state.editingScale.__new=true;state.screen="editor";render(); }
async function toggleCandidate(id){ const editing=Boolean(state.editingScale),s=state.editingScale||activeScale(),before=structuredClone(s.equipe),f=state.sheet; const idx=s.equipe.findIndex(e=>e.id===id&&e.funcao===f); if(idx>=0)s.equipe.splice(idx,1);else { const limit=VOCAL_LIMITS[f]; if(limit&&s.equipe.filter(e=>e.funcao===f).length>=limit){toast(`Limite de ${limit} vagas para ${f.toLowerCase()}`);return;} s.equipe.push({id,funcao:f}); } if(!editing&&supabase&&!await persist(()=>syncScale(s),"Equipe atualizada"))s.equipe=before;else if(!editing)save();render(); }

function preserveSongDraft(form){
  if(!form||state.modal?.type!=="song")return;
  state.modal.item={...state.modal.item,...Object.fromEntries(new FormData(form))};
}
async function storageLogin(button){
  if(!supabase)return;
  const panel=button.closest(".storage-panel"), form=button.closest("form");
  const email=$('[data-storage-email]',panel)?.value.trim(), password=$('[data-storage-password]',panel)?.value;
  const status=$('[data-storage-auth-status]',panel);
  if(!email||!password){status.textContent="Informe e-mail e senha.";return}
  button.disabled=true;status.textContent="Entrando…";
  try{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;preserveSongDraft(form);state.storageSession=data.session;render();toast("Supabase conectado")}catch(error){button.disabled=false;status.textContent=`Não foi possível entrar: ${error?.message||"verifique sua conexão"}`}
}
async function storageLogout(button){
  if(!supabase)return;
  preserveSongDraft(button.closest("form"));
  try{await supabase.auth.signOut()}finally{state.storageSession=null;render();toast("Conta desconectada")}
}
function safeFilePart(value){return String(value||"arquivo").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60)||"arquivo"}
async function uploadStorageFile(input){
  const kind=input.dataset.storageFile, file=input.files?.[0], form=input.closest("form");
  if(!file||!supabase||!state.storageSession)return;
  const isPdf=kind==="pdf", ext=isPdf?"pdf":"mp3", max=isPdf?15:50;
  const valid=isPdf?(file.type==="application/pdf"||/\.pdf$/i.test(file.name)):(["audio/mpeg","audio/mp3"].includes(file.type)||/\.mp3$/i.test(file.name));
  const status=$(`[data-upload-status="${kind}"]`,form), box=input.closest(".upload-box");
  if(!valid){status.textContent=`Escolha um arquivo ${ext.toUpperCase()}.`;input.value="";return}
  if(file.size>max*1024*1024){status.textContent=`O limite é ${max} MB.`;input.value="";return}
  const title=form.elements.titulo.value||file.name.replace(/\.[^.]+$/,"");
  const path=`${isPdf?"cifras":"vs"}/${safeFilePart(title)}-${Date.now()}-${uid()}.${ext}`;
  box.classList.remove("success");box.classList.add("uploading");status.textContent=`Enviando ${file.name}…`;
  try{const {data,error}=await supabase.storage.from(SUPABASE_BUCKET).upload(path,file,{cacheControl:"3600",contentType:isPdf?"application/pdf":"audio/mpeg",upsert:false});if(error)throw error;const {data:publicFile}=supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(data.path);form.elements[isPdf?"cifra":"vs"].value=publicFile.publicUrl;box.classList.add("success");status.textContent=`${file.name} enviado ✓`;toast(`${ext.toUpperCase()} enviado e link preenchido`)}catch(error){status.textContent=`Falha no envio: ${error?.message||"verifique sua conexão"}`;toast("Não foi possível enviar o arquivo")}finally{box.classList.remove("uploading")}
}

function assertCloud(result){if(result?.error)throw result.error;return result}
async function syncMember(item){
  if(!supabase||!state.storageSession)return;
  assertCloud(await supabase.from("membros").upsert({id:item.id,nome:item.nome,whatsapp:item.whatsapp||"",avatar:item.avatar||{},ativo:true},{onConflict:"id"}));
  assertCloud(await supabase.from("membro_funcoes").delete().eq("membro_id",item.id));
  if(item.funcoes.length)assertCloud(await supabase.from("membro_funcoes").insert(item.funcoes.map((funcao,ordem)=>({membro_id:item.id,funcao,ordem}))));
}
async function syncSong(item){
  if(!supabase||!state.storageSession)return;
  assertCloud(await supabase.from("musicas").upsert({id:item.id,tipo:item.tipo||"Música",hinario:item.hinario||"",numero:item.numero||"",titulo:item.titulo,tom_padrao:item.tom||"",youtube_url:item.youtube||"",cifra_url:item.cifra||"",vs_url:item.vs||"",ativo:true},{onConflict:"id"}));
}
async function syncScale(scale){
  if(!supabase||!state.storageSession)return;
  assertCloud(await supabase.from("escalas").upsert({id:scale.id,data:scale.data,culto:scale.culto,saudacao:scale.saudacao||"Olá!",ensaio:scale.ensaio||"",observacoes:scale.obs||""},{onConflict:"id"}));
  assertCloud(await supabase.from("escala_equipe").delete().eq("escala_id",scale.id));
  if(scale.equipe.length)assertCloud(await supabase.from("escala_equipe").insert(scale.equipe.map((item,ordem)=>({escala_id:scale.id,membro_id:item.id,funcao:item.funcao,ordem}))));
  assertCloud(await supabase.from("escala_repertorio").delete().eq("escala_id",scale.id));
  if(scale.repertorio.length)assertCloud(await supabase.from("escala_repertorio").insert(scale.repertorio.map((item,ordem)=>({id:item.chave,escala_id:scale.id,musica_id:item.musicaId,tom:item.tom||"",momento:item.momento||"Louvor",ordem}))));
}
async function deleteCloudScale(id){if(supabase&&state.storageSession)assertCloud(await supabase.from("escalas").delete().eq("id",id))}
async function persist(action,successMessage){
  state.syncing=true;
  try{await action();save();if(successMessage)toast(successMessage);return true}
  catch(error){toast(`Erro ao sincronizar: ${error?.message||"verifique a conexão"}`);return false}
  finally{state.syncing=false}
}

function bind(){
  $$('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));
  $$('[data-action="drawer"]').forEach(b=>b.onclick=()=>{state.drawer=true;render()});
  $$('[data-action="close-drawer"]').forEach(b=>b.onclick=()=>{state.drawer=false;render()});
  $$('[data-menu]').forEach(b=>b.onclick=()=>menuAction(b.dataset.menu));
  $('[data-action="select-scale"]')?.addEventListener('change',e=>{state.selected=e.target.value;state.calendarDate=parseDate(activeScale().data);render()});
  $('[data-action="calendar"]')?.addEventListener('click',()=>{state.calendar=!state.calendar;render()});
  $$('[data-cal]').forEach(b=>b.onclick=()=>{state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()+(b.dataset.cal==='next'?1:-1),1);render()});
  $$('[data-day]').forEach(b=>b.onclick=()=>{const found=state.db.escalas.find(e=>e.data===b.dataset.day);if(found){state.selected=found.id;render()}else newScale(b.dataset.day)});
  $$('[data-position]').forEach(b=>b.onclick=()=>{state.sheet=b.dataset.position;render()});
  $$('[data-action="close-sheet"]').forEach(b=>b.onclick=()=>{state.sheet=null;render()});
  $$('[data-candidate]').forEach(b=>b.onclick=()=>toggleCandidate(b.dataset.candidate));
  $$('[data-action="message"]').forEach(b=>b.onclick=()=>window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage(activeScale()))}`,"_blank","noopener,noreferrer"));
  $$('[data-action="copy"]').forEach(b=>b.onclick=()=>copy(buildMessage(activeScale())));
  $$('[data-action="links"]').forEach(b=>b.onclick=()=>copy(buildLinks(activeScale())));
  $$('[data-action="csv"]').forEach(b=>b.onclick=()=>downloadCsv(activeScale()));
  $$('[data-copy-id]').forEach(b=>b.onclick=()=>copy(buildMessage(state.db.escalas.find(e=>e.id===b.dataset.copyId))));
  $$('[data-open-id]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.openId;navigate('escala')});
  $$('[data-duplicate]').forEach(b=>b.onclick=()=>duplicate(b.dataset.duplicate));
  $$('[data-delete-scale]').forEach(b=>b.onclick=async()=>{if(!confirm("Excluir esta escala?"))return;const id=b.dataset.deleteScale;if(supabase&&!await persist(()=>deleteCloudScale(id)))return;state.db.escalas=state.db.escalas.filter(e=>e.id!==id);state.selected=nearestScale()?.id;save();render();toast("Escala excluída")});
  $$('[data-action="new-scale"]').forEach(b=>b.onclick=()=>newScale());
  $('[data-search]')?.addEventListener('input',e=>{const p=e.target.selectionStart;state.query=e.target.value;render();const n=$('[data-search]');n.focus();n.setSelectionRange(p,p)});
  $$('[data-action="new-member"]').forEach(b=>b.onclick=()=>{state.modal={type:'member',item:{funcoes:[]}};render()});
  $$('[data-edit-member]').forEach(b=>b.onclick=()=>{state.modal={type:'member',item:structuredClone(member(b.dataset.editMember))};render()});
  $$('[data-action="new-song"]').forEach(b=>b.onclick=()=>{state.modal={type:'song',item:{tipo:'Música'}};render()});
  $$('[data-download-url]').forEach(b=>b.onclick=e=>{e.stopPropagation();downloadResource(b.dataset.downloadUrl,b.dataset.downloadName)});
  $$('[data-play-url]').forEach(b=>b.onclick=e=>{e.stopPropagation();state.audio={url:b.dataset.playUrl,title:b.dataset.playTitle};render()});
  $('[data-action="close-audio"]')?.addEventListener('click',()=>{state.audio=null;render()});
  $$('[data-edit-song]').forEach(b=>b.onclick=()=>{state.modal={type:'song',item:structuredClone(music(b.dataset.editSong))};render()});
  $$('[data-action="close-modal"]').forEach(b=>b.onclick=()=>{state.modal=null;render()});
  $$('[data-form-function]').forEach(b=>b.onclick=()=>b.classList.toggle('selected'));
  $$('[data-form]').forEach(f=>f.onsubmit=e=>saveForm(e,f));
  $('[data-storage-login]')?.addEventListener('click',e=>storageLogin(e.currentTarget));
  $('[data-storage-logout]')?.addEventListener('click',e=>storageLogout(e.currentTarget));
  $$('[data-storage-file]').forEach(input=>input.onchange=()=>uploadStorageFile(input));
  $$('[name^="avatar"]').forEach(i=>{i.oninput=refreshAvatarPreview;i.onchange=refreshAvatarPreview});
  refreshAvatarPreview();
  $$('[data-editor-mode]').forEach(b=>b.onclick=()=>{state.editorMode=b.dataset.editorMode;render()});
  $$('[data-scale-field]').forEach(i=>{i.oninput=()=>{(state.editingScale||activeScale())[i.dataset.scaleField]=i.value};i.onchange=()=>{(state.editingScale||activeScale())[i.dataset.scaleField]=i.value;if(i.type==='date'||i.tagName==='SELECT')render()}});
  $$('[data-song-key]').forEach(i=>i.oninput=()=>{const r=(state.editingScale||activeScale()).repertorio.find(r=>r.chave===i.dataset.songKey);if(r)r.tom=i.value});
  $$('[data-song-moment]').forEach(i=>i.onchange=()=>{const r=(state.editingScale||activeScale()).repertorio.find(r=>r.chave===i.dataset.songMoment);r.momento=i.value;render()});
  $$('[data-move-song]').forEach(b=>b.onclick=()=>moveSong(b.dataset.moveSong,+b.dataset.dir));
  $$('[data-remove-song]').forEach(b=>b.onclick=()=>{const s=state.editingScale||activeScale();s.repertorio=s.repertorio.filter(r=>r.chave!==b.dataset.removeSong);render()});
  $('[data-action="add-editor-song"]')?.addEventListener('click',()=>{state.modal={type:'song-picker'};render()});
  $$('[data-pick-song]').forEach(b=>b.onclick=()=>{const s=state.editingScale||activeScale(),m=music(b.dataset.pickSong);if(!m||s.repertorio.some(r=>r.musicaId===m.id)){toast("Esta música já está na escala");return}s.repertorio.push({chave:uid(),musicaId:m.id,tom:m.tom||'',momento:'Louvor'});state.modal=null;render();toast("Música adicionada")});
  $('[data-picker-search]')?.addEventListener('input',e=>{const q=e.target.value.toLocaleLowerCase('pt-BR');$$('[data-song-candidate]').forEach(row=>{const m=music(row.dataset.songCandidate);row.hidden=!`${m?.titulo||''} ${m?.hinario||''} ${m?.numero||''}`.toLocaleLowerCase('pt-BR').includes(q)})});
  $('[data-action="save-scale"]')?.addEventListener('click',saveScale);
  $$('[data-action="cancel-scale"]').forEach(b=>b.onclick=()=>{if(confirm("Descartar as alterações desta escala?")){state.editingScale=null;state.screen='escala';render()}});
  $('[data-action="copy-editor"]')?.addEventListener('click',()=>copy(buildMessage(state.editingScale||activeScale())));
  $('[data-action="reset"]')?.addEventListener('click',()=>{if(confirm("Restaurar os dados originais? Alterações locais serão perdidas.")){localStorage.removeItem(STORAGE);location.reload()}});
  $('[data-action="reload-cloud"]')?.addEventListener('click',async()=>{state.drawer=false;toast("Atualizando dados…");if(await loadCloudData()){state.selected=state.db.escalas.some(s=>s.id===state.selected)?state.selected:nearestScale()?.id;render();toast("Dados atualizados")}else render()});
  $('[data-action="logout"]')?.addEventListener('click',appLogout);
}
function menuAction(a){ state.drawer=false; if(["escala","agenda","repertorio","equipe"].includes(a))navigate(a); else if(a==='new-scale')newScale();else if(a==='new-member'){state.screen='equipe';state.modal={type:'member',item:{funcoes:[]}};render()}else if(a==='editor'||a==='editor-music'){state.editingScale=structuredClone(activeScale());state.screen='editor';render()}else if(a==='message')window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage(activeScale()))}`,"_blank","noopener,noreferrer");else if(a==='csv')downloadCsv(activeScale());else if(a==='links')copy(buildLinks(activeScale())); }
async function saveForm(e,f){e.preventDefault();const submit=$('button[type="submit"],button:not([type])',f),fd=new FormData(f),type=f.dataset.form;submit.disabled=true;submit.textContent="Salvando…";if(type==='member'){const item={id:fd.get('id')||uid(),nome:String(fd.get('nome')||'').trim(),whatsapp:String(fd.get('whatsapp')||'').trim(),avatar:{tipo:fd.get('avatarTipo'),estilo:fd.get('avatarEstilo'),pele:fd.get('avatarPele'),cabelo:fd.get('avatarCabelo')},funcoes:$$('[data-form-function].selected',f).map(b=>b.dataset.formFunction)};if(!item.nome){toast("Informe o nome do membro");submit.disabled=false;submit.textContent="Salvar";return}if(supabase&&!await persist(()=>syncMember(item))){submit.disabled=false;submit.textContent="Salvar";return}const i=state.db.membros.findIndex(x=>x.id===item.id);i>=0?state.db.membros[i]=item:state.db.membros.push(item);}else{const item=Object.fromEntries(fd);Object.keys(item).forEach(k=>{if(typeof item[k]==='string')item[k]=item[k].trim()});if(!item.titulo){toast("Informe o título da música");submit.disabled=false;submit.textContent="Salvar";return}item.id||=uid();if(supabase&&!await persist(()=>syncSong(item))){submit.disabled=false;submit.textContent="Salvar";return}const i=state.db.musicas.findIndex(x=>x.id===item.id);i>=0?state.db.musicas[i]=item:state.db.musicas.push(item);}save();state.modal=null;render();toast("Cadastro sincronizado");}
function moveSong(key,dir){const s=state.editingScale||activeScale(),i=s.repertorio.findIndex(r=>r.chave===key),j=i+dir;if(j<0||j>=s.repertorio.length)return;[s.repertorio[i],s.repertorio[j]]=[s.repertorio[j],s.repertorio[i]];render();}
async function saveScale(){const s=state.editingScale;if(!s)return;if(!s.data||!s.culto){toast("Informe a data e o culto");return}if(supabase&&!await persist(()=>syncScale(s)))return;delete s.__new;const i=state.db.escalas.findIndex(e=>e.id===s.id);i>=0?state.db.escalas[i]=s:state.db.escalas.push(s);state.db.escalas.sort((a,b)=>a.data.localeCompare(b.data));state.selected=s.id;if(!save())return;state.editingScale=null;state.screen='escala';render();toast("Escala sincronizada");}

init();
