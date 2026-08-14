import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";

const root = resolve(fileURLToPath(new URL("./dist/", import.meta.url)));
const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
const mime = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon",
  ".woff2":"font/woff2", ".pdf":"application/pdf", ".mp3":"audio/mpeg"
};
const compressible = new Set([".html",".js",".css",".json",".svg"]);

function commonHeaders(){return {
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"strict-origin-when-cross-origin",
  "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
  "X-Frame-Options":"SAMEORIGIN"
}}
function sendJson(response,status,body){const content=JSON.stringify(body);response.writeHead(status,{...commonHeaders(),"Content-Type":"application/json; charset=utf-8","Content-Length":Buffer.byteLength(content),"Cache-Control":"no-store"});response.end(content)}

const server=createServer(async(request,response)=>{
  try{
    const url=new URL(request.url||"/","http://localhost");
    if(url.pathname==="/health"){sendJson(response,200,{status:"ok"});return}
    if(!["GET","HEAD"].includes(request.method||"")){sendJson(response,405,{error:"Método não permitido"});return}
    let pathname;
    try{pathname=decodeURIComponent(url.pathname)}catch{sendJson(response,400,{error:"Caminho inválido"});return}
    const requested=resolve(root,`.${pathname}`);
    if(requested!==root&&!requested.startsWith(root+sep)){sendJson(response,403,{error:"Acesso negado"});return}
    let file=requested;
    let info=await stat(file).catch(()=>null);
    if(info?.isDirectory()){file=resolve(file,"index.html");info=await stat(file).catch(()=>null)}
    if(!info?.isFile()){file=resolve(root,"index.html");info=await stat(file).catch(()=>null)}
    if(!info?.isFile()){sendJson(response,503,{error:"Aplicação ainda não compilada"});return}
    const extension=extname(file).toLowerCase(),type=mime[extension]||"application/octet-stream";
    const useGzip=compressible.has(extension)&&String(request.headers["accept-encoding"]||"").includes("gzip");
    const immutable=url.pathname.startsWith("/assets/");
    const headers={...commonHeaders(),"Content-Type":type,"Cache-Control":immutable?"public, max-age=31536000, immutable":"no-cache"};
    if(useGzip){headers["Content-Encoding"]="gzip";headers.Vary="Accept-Encoding"}else headers["Content-Length"]=String(info.size);
    response.writeHead(200,headers);
    if(request.method==="HEAD"){response.end();return}
    if(useGzip)await pipeline(createReadStream(file),createGzip(),response);else await pipeline(createReadStream(file),response);
  }catch(error){if(!response.headersSent)sendJson(response,500,{error:"Erro interno"});else response.destroy(error)}
});

server.listen(port,host,()=>console.log(`Escala Louvor disponível em http://${host}:${port}`));
const shutdown=()=>server.close(()=>process.exit(0));
process.on("SIGTERM",shutdown);
process.on("SIGINT",shutdown);
