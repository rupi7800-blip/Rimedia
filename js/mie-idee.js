/* =========================================================
   Rimedia — Le mie idee e Appunti
   L'utente può scrivere o importare le proprie schede in ogni sezione
   (ricette, autoproduzione, riciclo, bricolage, orto, risparmio, tisane,
   "cosa ne faccio") e appunti liberi nel quaderno, scegliendo l'icona.
   Le schede sono salvate in S.mine (localStorage "rimedia" + backup + sincronizzazione)
   e compaiono nelle sezioni, nella ricerca, nella ricerca inversa e in Rimedia AI.
   Le funzioni usano a tempo di esecuzione le variabili dello script principale (S, V, CATS…).
   ========================================================= */

const MK={
 ricetta:{n:"Ricetta",v:"ricette",e:"🍳",f:["tag","time","diff","cost","ing","st","tip","varianti","keep","allerg","warn","note"]},
 casa:{n:"Autoproduzione",v:"casa",e:"🧴",f:["cat","time","diff","cost","ing","tools","st","tip","res","warn","note"]},
 riciclo:{n:"Riciclo e recupero",v:"riciclo",e:"♻️",f:["mat","kw","ideas","disp","warn","note"]},
 brico:{n:"Bricolage",v:"bricolage",e:"🔧",f:["cat","time","diff","cost","tools","ing","st","tip","res","warn","note"]},
 orto:{n:"Orto e giardino",v:"orto",e:"🌱",f:["cat","time","diff","cost","tools","ing","st","tip","res","warn","note"]},
 risp:{n:"Risparmio",v:"risparmio",e:"💶",f:["cat","cost","res","ing","st","tip","warn","note"]},
 tisana:{n:"Tisana",v:"tisane",e:"🌿",f:["goal","min","ing","st","tip","warn","note"]},
 ho:{n:"Cosa ne faccio",v:"ho",e:"♻️",f:["kw","ideas","st","warn","note"]},
 nota:{n:"Appunto",v:"quaderno",e:"📝",f:["body","labels"]}
};
const MK_TAGS=["pane","avanzi","scarti","frutta","legumi","conserve","fermentati","essiccati","salse","brodi","autoprodotti","economiche","dolce","freddo","caldo","vegano","vegetariano","colazione","snack","antipasto","forno","base"];
const MF={
 tag:{l:"Etichette",t:"tags"},
 cat:{l:"Categoria",t:"select",o:k=>CATS[k]},
 mat:{l:"Materiale",t:"select",o:()=>CATS.riciclo},
 goal:{l:"Obiettivo",t:"select",o:()=>GOALS},
 min:{l:"Minuti di infusione",t:"number"},
 time:{l:"Tempo",t:"text",ph:"Es. 30 min"},
 diff:{l:"Difficoltà",t:"select",o:()=>({Facile:"Facile",Media:"Media",Impegnativa:"Impegnativa"}),empty:true},
 cost:{l:"Costo indicativo",t:"text",ph:"Es. circa 2 €"},
 kw:{l:k=>k==="ho"?"Cosa ho o cosa voglio recuperare":"Oggetto e parole chiave",t:"text",ph:"Es. vecchi barattoli, bancali, pane raffermo"},
 ing:{l:k=>({ricetta:"Ingredienti",tisana:"Ingredienti",risp:"Occorrente"}[k]||"Materiali"),t:"pairs",ph:"Uno per riga: nome | quantità\nEs. pane raffermo | 300 g"},
 tools:{l:"Attrezzatura",t:"lines",ph:"Un attrezzo per riga"},
 st:{l:k=>k==="ho"?"Come fare (facoltativo)":"Procedimento",t:"lines",ph:"Un passo per riga"},
 ideas:{l:k=>k==="ho"?"Cosa posso farne":"Idee di riuso",t:"lines",ph:"Un'idea per riga"},
 tip:{l:"Consiglio",t:"textarea"},
 varianti:{l:"Varianti e sostituzioni",t:"lines",ph:"Una per riga"},
 keep:{l:"Conservazione",t:"text"},
 allerg:{l:"Allergeni",t:"text"},
 res:{l:k=>k==="risp"?"Risparmio o risultato atteso":"Risultato atteso",t:"text"},
 disp:{l:"Come smaltirlo",t:"text"},
 warn:{l:"Precauzioni",t:"textarea"},
 note:{l:"Note personali",t:"textarea"},
 body:{l:"Testo dell'appunto",t:"textarea",big:true},
 labels:{l:"Etichette (separate da virgola)",t:"text",ph:"Es. da provare, regali, garage"}
};
const EMOJI={
 "Cucina":"🍳 🥗 🍲 🍝 🍕 🥖 🍞 🥐 🧀 🥚 🥛 🍯 🫙 🥫 🍅 🥕 🥦 🧅 🧄 🥔 🍆 🌶️ 🫑 🥬 🍋 🍊 🍎 🍐 🍌 🍓 🫐 🍇 🍑 🍒 🥝 🥥 🫘 🌰 🍪 🍰 🧁 🍮 🍨 🥧 ☕ 🍵 🫖 🧃",
 "Casa e autoproduzione":"🧴 🧼 🧽 🧹 🧺 🪣 🫧 🕯️ 🧻 🪥 💧 🌸 🌼 💜 🛁 🚿 🧷 🧵 🧶 🪡 👕 👖 🧦 🧣 👜 🛍️",
 "Riciclo e oggetti":"♻️ 🗑️ 📦 📰 🍾 🥤 🪵 🪨 🧱 🔩 ⚙️ 🪝 🔋 💡 🔌 💻 📱 🪑 🚪 🪟 🛏️ 🛋️ ☂️ 👟 🎒 🧸",
 "Attrezzi":"🔧 🔨 🪛 🪚 🛠️ ⛏️ 🪜 🧰 📏 📐 🧲 🔗 🧯 🚲 🔦 🪤",
 "Orto e natura":"🌱 🌿 🌾 🌻 🌷 🌹 🌳 🍀 🪴 🍂 🍁 🪱 🐝 🐞 🐌 🦋 🐛 💦 🌧️ ☀️ 🌙 🫛 🍄 🌽 🐓 🐟",
 "Simboli":"✨ ⭐ ❤️ 💚 💡 📝 📒 📌 ✅ ⚠️ 💶 ⏱️ 🔥 ❄️ 🎯 🏡 👍 🎁 🧪 🧠 📷"
};
const EXTRA_SECS=()=>[{v:"ho",kind:"ho",n:"Le mie soluzioni (Cosa ne faccio)",e:"♻️",d:"",list:()=>mine("ho")},{v:"appunti",kind:"nota",n:"Appunti",e:"📝",d:"",list:()=>mine("nota")}];

function mine(kind){return (S.mine||[]).filter(x=>x.mk===kind).sort((a,b)=>(b.upd||0)-(a.upd||0));}
function mineActs(it){
  if(it.mine)return `<button class="btn sm sec" data-a="medit" data-id="${it.id}">✏️ Modifica</button><button class="btn sm sec" data-a="mdel" data-id="${it.id}">🗑️ Elimina</button>`;
  return `<button class="btn sm sec" data-a="mcopy" data-id="${it.id}">✍️ Copia e modifica</button>`;
}
function mineAddBtn(v){const k=Object.keys(MK).find(k=>MK[k].v===v);return k?`<button class="btn sm sec" data-a="mnew" data-k="${k}">✍️ Aggiungi la mia idea</button>`:"";}
function mineDate(it){return it.upd?new Date(it.upd).toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"}):"";}
function hoCard(it){
  REG[it.id]={it,kind:"ho"};
  return `<div class="card" id="cd-${it.id}"><div class="hd" data-a="toggle"><div class="em c-sage">${esc(it.e||"♻️")}</div><div class="tt"><h3>${esc(it.t)}</h3><div class="sub">${it.kw?"Ho: "+esc(it.kw):esc(it.s||"")}</div><div class="meta"><span class="tag mine">✍️ Mia soluzione</span></div></div><span class="chev" aria-hidden="true">▾</span></div>
  <div class="bd">${it.s&&it.kw?`<div class="sub" style="margin-top:10px">${esc(it.s)}</div>`:""}${(it.ideas||[]).length?`<h4>Cosa posso farne</h4><ol class="steps">${it.ideas.map(i=>`<li>${esc(i)}</li>`).join("")}</ol>`:""}
  ${(it.st||[]).length?`<h4>Come fare</h4><ol class="steps">${it.st.map(i=>`<li>${esc(i)}</li>`).join("")}</ol>`:""}
  ${it.warn?`<div class="note warn">⚠️ <b>Precauzioni:</b> ${esc(it.warn)}</div>`:""}${it.note?`<div class="note info">📝 <b>Note personali:</b> ${esc(it.note)}</div>`:""}
  <div class="acts">${aiBtn(it.id)}${mineActs(it)}</div></div></div>`;
}
function notaCard(it){
  REG[it.id]={it,kind:"nota"};
  const labels=String(it.labels||"").split(",").map(s=>s.trim()).filter(Boolean);
  return `<div class="card" id="cd-${it.id}"><div class="hd" data-a="toggle"><div class="em c-earth">${esc(it.e||"📝")}</div><div class="tt"><h3>${esc(it.t)}</h3><div class="sub">${esc(String(it.body||"").slice(0,90))}${String(it.body||"").length>90?"…":""}</div><div class="meta"><span class="tag mine">📝 Appunto</span>${labels.map(l=>`<span class="tag">${esc(l)}</span>`).join("")}${mineDate(it)?`<span class="tag">${mineDate(it)}</span>`:""}</div></div><span class="chev" aria-hidden="true">▾</span></div>
  <div class="bd"><div style="margin-top:12px;font-size:14.5px">${md(it.body||"")}</div><div class="acts">${aiBtn(it.id)}${mineActs(it)}</div></div></div>`;
}

/* ===== editor ===== */
let ED=null;
function edNew(kind,base){if(!MK[kind])kind="ricetta";ED={kind,id:null,choose:!base,it:Object.assign({e:MK[kind].e},base||{}),imp:""};goEditor();}
function edEdit(id){const it=(S.mine||[]).find(x=>x.id===id);if(!it){toast("Scheda non trovata");return;}ED={kind:it.mk,id,choose:false,it:JSON.parse(JSON.stringify(it)),imp:""};goEditor();}
function goEditor(){if(location.hash!=="#nuova")location.hash="nuova";else{render();window.scrollTo(0,0);}}
const fLabel=(k,kind)=>typeof MF[k].l==="function"?MF[k].l(kind):MF[k].l;
function fieldHtml(k,kind,it){
  const F=MF[k],id="mf-"+k,lab=`<label for="${id}">${esc(fLabel(k,kind))}</label>`;let v=it[k];
  if(F.t==="tags"){const cur=Array.isArray(v)?v:[];return `<div class="field"><label>${esc(F.l)}</label><div class="chips" style="margin-top:2px">${MK_TAGS.map(t=>`<button type="button" class="chip ${cur.includes(t)?"on":""}" data-a="mtag" data-v="${t}">${t}</button>`).join("")}</div></div>`;}
  if(F.t==="select"){const o=F.o(kind)||{};const first=Object.keys(o)[0];if(v==null||v==="")v=F.empty?"":first;return `<div class="field">${lab}<select class="inp" id="${id}" data-mf="${k}">${F.empty?`<option value="">— non indicata —</option>`:""}${Object.entries(o).map(([a,b])=>`<option value="${esc(a)}" ${v===a?"selected":""}>${esc(b)}</option>`).join("")}</select></div>`;}
  if(F.t==="number")return `<div class="field">${lab}<input class="inp" type="number" min="1" max="60" id="${id}" data-mf="${k}" value="${esc(v||"")}"></div>`;
  if(F.t==="pairs")return `<div class="field">${lab}<textarea class="inp" id="${id}" data-mf="${k}" placeholder="${esc(F.ph||"")}">${esc((v||[]).map(([n,q])=>q?n+" | "+q:n).join("\n"))}</textarea></div>`;
  if(F.t==="lines")return `<div class="field">${lab}<textarea class="inp" id="${id}" data-mf="${k}" placeholder="${esc(F.ph||"")}">${esc((v||[]).join("\n"))}</textarea></div>`;
  if(F.t==="textarea")return `<div class="field">${lab}<textarea class="inp" id="${id}" data-mf="${k}" ${F.big?'style="min-height:220px"':""}>${esc(v||"")}</textarea></div>`;
  return `<div class="field">${lab}<input class="inp" id="${id}" data-mf="${k}" placeholder="${esc(F.ph||"")}" value="${esc(v||"")}"></div>`;
}
function viewEditor(){
  if(!ED)ED={kind:"ricetta",id:null,choose:true,it:{e:"🍳"},imp:""};
  const k=ED.kind,it=ED.it,m=MK[k];
  return `<div class="sec-head"><div><h2>${ED.id?"✏️ Modifica":"✍️ Nuova"} ${k==="nota"?"appunto":"idea"}</h2><p>${k==="nota"?"Scrivi un appunto libero nel quaderno.":"Scrivi la tua scheda o importala da un testo: comparirà nella sezione "+esc(m.n)+", nella ricerca e in Rimedia AI."}</p></div></div>
  ${ED.choose&&!ED.id?`<div class="panel"><h3>Dove va?</h3><div class="chips">${Object.entries(MK).map(([kk,x])=>`<button type="button" class="chip ${kk===k?"on":""}" data-a="mkind" data-v="${kk}">${x.e} ${esc(x.n)}</button>`).join("")}</div></div>`:""}
  <details class="panel" ${ED.imp||(!ED.id&&!it.t)?"open":""}><summary><b>📥 Importa da testo o da file</b></summary>
   <div class="aihint">Incolla una ricetta copiata da un sito, un messaggio, un tuo appunto… oppure scegli un file .txt, .md o .json (anche un file “Le mie idee” esportato da Rimedia).</div>
   <textarea class="inp" id="mImp" style="margin-top:8px" placeholder="Incolla qui il testo da importare">${esc(ED.imp||"")}</textarea>
   <div class="acts"><label class="btn sm sec" style="cursor:pointer">📄 Scegli un file<input type="file" id="mImpFile" accept=".txt,.md,.json,text/plain,application/json" hidden></label><button type="button" class="btn sm sec" data-a="mparse">Compila i campi</button><button type="button" class="btn sm ai" data-a="maiparse">✨ Compila con Rimedia AI</button></div><div id="mImpOut"></div></details>
  <div class="panel"><h3>Icona</h3>
   <div class="row"><div class="em c-sage" id="mIconPrev" style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center;font-size:30px">${esc(it.e||m.e)}</div>
    <input class="inp" id="mIconIn" maxlength="12" style="max-width:190px" placeholder="o incolla un'emoji" aria-label="Icona personalizzata"></div>
   ${Object.entries(EMOJI).map(([g,s])=>`<h4 class="mini">${g}</h4><div class="chips emo">${s.split(" ").map(x=>`<button type="button" class="chip ${x===it.e?"on":""}" data-a="micon" data-v="${x}" aria-label="Icona ${x}">${x}</button>`).join("")}</div>`).join("")}</div>
  <div class="panel"><h3>Contenuto</h3>
   <div class="field"><label for="mf-t">Titolo *</label><input class="inp" id="mf-t" data-mf="t" value="${esc(it.t||"")}" placeholder="${k==="nota"?"Es. Idee per il garage":"Es. Torta di pane della nonna"}"></div>
   ${k!=="nota"?`<div class="field"><label for="mf-s">Descrizione breve</label><input class="inp" id="mf-s" data-mf="s" value="${esc(it.s||"")}"></div>`:""}
   ${m.f.map(f=>fieldHtml(f,k,it)).join("")}
   <div class="acts"><button type="button" class="btn" data-a="msave">💾 Salva</button><button type="button" class="btn sec" data-a="mcancel">Annulla</button>${ED.id?`<button type="button" class="btn sec" data-a="mdel" data-id="${ED.id}">🗑️ Elimina</button>`:""}</div></div>`;
}
function splitLines(v){return String(v||"").split("\n").map(s=>s.replace(/^\s*(?:[-•*·–]|\d+[.)]|\[\s?\])\s*/,"").trim()).filter(Boolean);}
const UNITS="kg|g|gr|mg|l|ml|cl|dl|cucchiai[on]?|cucchiaini?|tazz[ae]|tazzin[ae]|bicchier[ei]|pz|pezzi|spicchi|fette|manciat[ae]|m|cm|mm";
function parsePair(l){
  let m=l.match(/^(.+?)\s*[|:–]\s*(.+)$/);if(m)return [m[1].trim(),m[2].trim()];
  m=l.match(new RegExp("^(\\d[\\d.,/½¼¾]*\\s*(?:"+UNITS+")?\\.?)\\s+(?:di\\s+)?(.+)$","i"));if(m)return [m[2].trim(),m[1].trim()];
  m=l.match(new RegExp("^(.+?)\\s+(q\\.?b\\.?|\\d[\\d.,/½¼¾]*\\s*(?:"+UNITS+")?\\.?)$","i"));if(m)return [m[1].trim(),m[2].trim()];
  return [l.trim(),""];
}
function collectEd(){
  if(!ED)return;const it=ED.it;
  document.querySelectorAll("[data-mf]").forEach(el=>{const k=el.dataset.mf,F=MF[k],v=el.value;
    if(!F){it[k]=v.trim();return;}
    if(F.t==="pairs")it[k]=splitLines(v).map(parsePair);
    else if(F.t==="lines")it[k]=splitLines(v);
    else if(F.t==="number")it[k]=parseInt(v)||"";
    else it[k]=F.t==="textarea"&&k==="body"?v.replace(/\s+$/,""):v.trim();});
  const imp=$("#mImp");if(imp)ED.imp=imp.value;
}
// Lettura di un testo libero senza AI: titolo, sezioni riconosciute dalle intestazioni, elenchi
const HEADS=[[/^(ingredienti|ingredients|materiali|occorrente|cosa serve|serve|servono)\b/i,"ing"],[/^(procedimento|preparazione|istruzioni|passi|passaggi|come fare|metodo|procedura)\b/i,"st"],[/^(attrezzi|attrezzatura|strumenti|utensili)\b/i,"tools"],[/^(idee|utilizzi|usi|cosa farne)\b/i,"ideas"],[/^(consigli?|suggeriment[io]|trucchi?)\b/i,"tip"],[/^(precauzioni|avvertenze|attenzione|sicurezza|controindicazioni)\b/i,"warn"],[/^(varianti|variante|sostituzioni)\b/i,"varianti"],[/^(conservazione|si conserva)\b/i,"keep"],[/^(note|appunti)\b/i,"note"],[/^(tempo|tempi|durata)\b/i,"time"],[/^(costo|costi|spesa)\b/i,"cost"],[/^(difficolt[aà])\b/i,"diff"]];
function parseText(txt,kind){
  const out={},lines=String(txt).replace(/\r/g,"").split("\n");let cur=null;const free=[];
  if(kind==="nota"){const ls=lines.map(l=>l.trim());const i=ls.findIndex(Boolean);out.t=(ls[i]||"").replace(/^#+\s*/,"").slice(0,90);out.body=lines.slice(i+1).join("\n").trim()||txt.trim();return out;}
  for(const raw of lines){const l=raw.trim();if(!l)continue;
    if(!out.t&&!cur){out.t=l.replace(/^#+\s*/,"").replace(/[:.]$/,"").slice(0,90);continue;}
    const h=HEADS.find(([re])=>re.test(l.replace(/^#+\s*/,"")));
    if(h&&l.length<60){cur=h[1];const rest=l.replace(/^#+\s*/,"").replace(h[0],"").replace(/^[\s:–-]+/,"").trim();if(rest)push(cur,rest);continue;}
    if(cur)push(cur,l);else free.push(l);}
  function push(k,l){const F=MF[k]||{t:"text"};const kk=fieldOk(k,kind)?k:"note";const FF=MF[kk];
    if(FF.t==="pairs")(out[kk]=out[kk]||[]).push(parsePair(splitLines(l)[0]||l));
    else if(FF.t==="lines")(out[kk]=out[kk]||[]).push(...splitLines(l));
    else out[kk]=(out[kk]?out[kk]+" ":"")+l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/,"");}
  // senza intestazioni: elenchi numerati → passi, puntati → ingredienti/idee, il resto → descrizione o note
  for(const l of free){
    if(/^\d+[.)]\s/.test(l))push(fieldOk("st",kind)?"st":"ideas",l);
    else if(/^[-•*·]\s/.test(l))push(fieldOk("ing",kind)?"ing":fieldOk("ideas",kind)?"ideas":"st",l);
    else if(!out.s&&l.length<=140)out.s=l;
    else push("note",l);}
  return out;
}
const fieldOk=(k,kind)=>MK[kind].f.includes(k);
function applyParsed(p,kind){
  const it=ED.it;let n=0;
  Object.entries(p).forEach(([k,v])=>{if(v==null||v===""||(Array.isArray(v)&&!v.length))return;
    if(k!=="t"&&k!=="s"&&k!=="e"&&!fieldOk(k,kind))return;
    if(k==="e"){if(String(v).length<=12)it.e=v;return;}
    it[k]=v;n++;});
  return n;
}
function normAI(j,kind){
  const o={};const arr=v=>Array.isArray(v)?v.map(x=>typeof x==="string"?x:(x&&(x.testo||x.text||x.passo))||String(x)).filter(Boolean):(v?splitLines(String(v)):[]);
  ["e","t","s","time","diff","cost","kw","tip","keep","allerg","res","disp","warn","note","body","labels"].forEach(k=>{if(j[k]!=null&&j[k]!=="")o[k]=String(j[k]);});
  if(j.ing)o.ing=(Array.isArray(j.ing)?j.ing:[]).map(v=>Array.isArray(v)?[String(v[0]||""),String(v[1]||"")]:typeof v==="object"&&v?[String(v.nome||v.name||""),String(v.quantita||v.qty||"")]:parsePair(String(v))).filter(v=>v[0]);
  ["st","tools","ideas","varianti"].forEach(k=>{if(j[k])o[k]=arr(j[k]);});
  if(j.tag)o.tag=arr(j.tag).map(norm).filter(t=>MK_TAGS.includes(t));
  if(j.cat&&CATS[kind]&&CATS[kind][j.cat])o.cat=j.cat;
  if(j.mat&&CATS.riciclo[j.mat])o.mat=j.mat;
  if(j.goal&&GOALS[j.goal])o.goal=j.goal;
  if(j.min)o.min=parseInt(j.min)||"";
  if(o.diff&&!["Facile","Media","Impegnativa"].includes(o.diff))delete o.diff;
  return o;
}
async function edAI(){
  collectEd();const txt=(ED.imp||"").trim(),kind=ED.kind,out=$("#mImpOut");
  if(!txt){toast("Incolla prima il testo da importare");return;}
  out.innerHTML='<div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Rimedia AI sta ordinando il testo…</div>';
  const desc={e:"una emoji adatta",t:"titolo breve",s:"descrizione di una riga"};
  MK[kind].f.forEach(k=>{const F=MF[k];let d=fLabel(k,kind);
    if(F.t==="pairs")d+=": array di [nome, quantità]";else if(F.t==="lines"||F.t==="tags")d+=": array di stringhe";
    if(k==="tag")d+=" (valori ammessi: "+MK_TAGS.join(", ")+")";
    if(F.t==="select")d+=" (uno tra: "+Object.keys(F.o(kind)||{}).join(", ")+")";
    if(k==="min")d+=": numero intero";desc[k]=d;});
  const prompt=`Trasforma il testo seguente in una scheda "${MK[kind].n}" dell'app Rimedia.
Restituisci SOLO un oggetto JSON con queste chiavi (ometti quelle per cui il testo non dà informazioni):
${Object.entries(desc).map(([k,d])=>`- "${k}": ${d}`).join("\n")}
Regole: usa solo le informazioni del testo; puoi riordinarle e riformularle in modo chiaro e in italiano, ma non inventare dosi, tempi o passaggi. Se il testo descrive un'attività con rischi evidenti (prodotti chimici, conserve, elettricità, attrezzi taglienti, calore) e non li cita, aggiungi in "warn" una breve precauzione di sicurezza.
TESTO:
"""${txt.slice(0,7000)}"""`;
  try{
    const r=await RAI.run({system:"Sei l'assistente di Rimedia: trasformi testi liberi in schede ordinate. Rispondi solo con JSON valido.",content:prompt,json:true,maxTokens:3000});
    const n=applyParsed(normAI(r.json||{},kind),kind);
    ED.imp=txt;render();const o=$("#mImpOut");if(o)o.innerHTML=`<div class="note tip">✅ ${n} campi compilati con ${esc(RAI.providerLabel(r.provider))}: controllali e premi Salva.</div>`;
  }catch(e){out.innerHTML=`<div class="note warn">${esc(e.message||"Errore")}${e.code==="nokey"?' <a href="#ai-setup">Impostazioni AI</a>':""}</div>`;}
}
function cleanItem(it,kind){
  const o={};Object.entries(it).forEach(([k,v])=>{if(v==null||v===""||(Array.isArray(v)&&!v.length))return;o[k]=v;});
  if(kind==="ricetta"){o.tag=o.tag||[];o.ing=o.ing||[];}
  if(kind==="riciclo"){o.kw=o.kw||"";o.ideas=o.ideas||[];o.mat=o.mat||"casa";}
  if(kind==="ho"){o.ideas=o.ideas||[];}
  if(["casa","brico","orto","risp"].includes(kind)&&!o.cat)o.cat=Object.keys(CATS[kind])[0];
  if(kind==="tisana"&&!o.goal)o.goal=Object.keys(GOALS)[0];
  return o;
}
function edSave(){
  collectEd();const kind=ED.kind;
  if(!String(ED.it.t||"").trim()){toast("Scrivi almeno il titolo");const t=$("#mf-t");t&&t.focus();return;}
  const it=cleanItem(ED.it,kind);delete it.ai;delete it.gen;delete it.src;delete it.url;delete it.img;
  it.mk=kind;it.mine=true;it.upd=Date.now();it.id=ED.id||("u-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5));
  S.mine=S.mine||[];const i=S.mine.findIndex(x=>x.id===it.id);if(i>=0)S.mine[i]=it;else S.mine.unshift(it);
  S.favs.forEach(f=>{if(f.it.id===it.id)f.it=it;});
  save();IDX=null;toast(ED.id?"Modifiche salvate":"Salvata nelle tue idee");
  const v=MK[kind].v;ED=null;
  if(kind==="nota")filt.qd="nota";else if(kind==="ho")filt.ho="";
  else{const map={ricetta:["ric","tutte"],casa:["casa","tutti"],brico:["brico","tutti"],orto:["orto","tutti"],risp:["risp","tutti"],tisana:["tis","tutte"],riciclo:["rmat","tutti"]}[kind];if(map)filt[map[0]]=map[1];if(kind==="riciclo")filt.rici="";if(kind==="ricetta")filt.rmode="";}
  if(location.hash!=="#"+v)location.hash=v;else render();
  setTimeout(()=>{const c=$("#cd-"+it.id);if(c){c.classList.add("open");c.scrollIntoView({block:"center"});}},80);
}
function mineDelete(id){
  const it=(S.mine||[]).find(x=>x.id===id);if(!it)return;
  if(!confirm("Eliminare «"+it.t+"»? L'operazione non si può annullare."))return;
  S.mine=S.mine.filter(x=>x.id!==id);S.favs=S.favs.filter(f=>f.it.id!==id);save();IDX=null;toast("Eliminata");
  if(cur()==="nuova"){ED=null;location.hash=MK[it.mk].v;}else render();
}
function mineExport(){
  const items=(S.mine||[]);if(!items.length){toast("Non hai ancora idee da esportare");return;}
  const blob=new Blob([JSON.stringify({app:"rimedia",type:"mie-idee",version:1,date:new Date().toISOString(),items},null,1)],{type:"application/json"});
  const u=URL.createObjectURL(blob),l=document.createElement("a");l.href=u;l.download="rimedia-mie-idee-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function mineImportItems(items){
  let n=0;S.mine=S.mine||[];
  items.filter(x=>x&&typeof x==="object"&&x.t&&MK[x.mk]).forEach(x=>{const it=cleanItem(Object.assign({},x),x.mk);it.mine=true;it.upd=it.upd||Date.now();
    if(!it.id||S.mine.some(y=>y.id===it.id&&y.upd!==it.upd))it.id="u-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const i=S.mine.findIndex(y=>y.id===it.id);if(i>=0)S.mine[i]=it;else S.mine.push(it);n++;});
  save();IDX=null;return n;
}
async function readImportFile(f){
  const txt=await f.text();
  if(/\.json$/i.test(f.name)||/^\s*[\[{]/.test(txt)){
    let j=null;try{j=JSON.parse(txt);}catch(e){}
    if(j){const items=Array.isArray(j)?j:Array.isArray(j.items)?j.items:null;
      if(items)return {items};
      if(j.data&&Array.isArray(j.data.favs))return {msg:"Questo è un backup completo: importalo dal Profilo."};
      return {single:j};}
  }
  return {text:txt};
}

/* ===== quaderno con Le mie idee e Appunti ===== */
function viewQuaderno2(){
  const types=[["tutti","Tutto"],["mie","✍️ Le mie idee"],["nota","📝 Appunti"],["ricetta","Ricette"],["casa","Autoproduzione"],["riciclo","Riciclo"],["brico","Bricolage"],["orto","Orto"],["risp","Risparmio"],["tisana","Tisane"],["airisp","Risposte AI"]];
  const mie=(S.mine||[]).filter(x=>x.mk!=="nota").sort((a,b)=>(b.upd||0)-(a.upd||0)),note=mine("nota");
  const cnt=k=>k==="tutti"?S.favs.length+(S.mine||[]).length:k==="mie"?mie.length:k==="nota"?note.length:S.favs.filter(f=>f.kind===k).length;
  const cur=filt.qd||"tutti";
  const mCard=it=>anyCard(it,it.mk,{sec:true});
  const favs=S.favs.filter(f=>!f.it.mine&&(cur==="tutti"||f.kind===cur));
  let body="";
  if(cur==="mie")body=mie.length?`<div class="list">${mie.map(mCard).join("")}</div>`:'<div class="empty">Nessuna idea tua. Premi “✍️ Nuova idea” o “Aggiungi la mia idea” in qualsiasi sezione.</div>';
  else if(cur==="nota")body=note.length?`<div class="list">${note.map(notaCard).join("")}</div>`:'<div class="empty">Nessun appunto. Premi “📝 Nuovo appunto”.</div>';
  else if(cur==="tutti")body=(note.length?`<h3 class="rgrp">📝 Appunti <span>${note.length}</span></h3><div class="list">${note.map(notaCard).join("")}</div>`:"")+(mie.length?`<h3 class="rgrp">✍️ Le mie idee <span>${mie.length}</span></h3><div class="list">${mie.map(mCard).join("")}</div>`:"")+(favs.length?`<h3 class="rgrp">☆ Salvati <span>${favs.length}</span></h3><div class="list">${favs.map(f=>anyCard(f.it,f.kind,{sec:true})).join("")}</div>`:"")||'<div class="empty">Ancora niente. Salva le schede con ☆, scrivi le tue idee o un appunto.</div>';
  else body=favs.length?`<div class="list">${favs.map(f=>anyCard(f.it,f.kind,{sec:true})).join("")}</div>`:'<div class="empty">Niente in questa categoria.</div>';
  return `<div class="sec-head"><div><h2>📒 Il mio quaderno</h2><p>Le tue idee, i tuoi appunti, le schede salvate e le risposte di Rimedia AI.</p></div><div class="row"><button class="btn sm" data-a="mnew" data-k="nota">📝 Nuovo appunto</button><button class="btn sm sec" data-a="mnew" data-k="">✍️ Nuova idea</button></div></div>
  <div class="filters">${types.filter(([k])=>k==="tutti"||k==="mie"||k==="nota"||cnt(k)).map(([k,l])=>`<button class="chip ${cur===k?"on":""}" data-a="fset" data-k="qd" data-v="${k}">${l} (${cnt(k)})</button>`).join("")}</div>
  ${body}
  ${cur==="mie"||cur==="nota"?`<div class="panel"><h3>Condividi o sposta le tue idee</h3><div class="aihint">Esporta in un file le tue idee e i tuoi appunti, oppure importa un file “Le mie idee” (da un altro dispositivo o da un amico). Le idee importate si aggiungono alle tue.</div><div class="acts"><button class="btn sm sec" data-a="mexport">⬇️ Esporta le mie idee</button><label class="btn sm sec" style="cursor:pointer">⬆️ Importa idee<input type="file" id="mieImpFile" accept=".json,application/json" hidden></label></div></div>`:""}`;
}
function mineHoList(){
  const l=mine("ho");
  return `<h3 class="rgrp">✍️ Le mie soluzioni <span>${l.length}</span></h3>${l.length?`<div class="list">${l.map(hoCard).join("")}</div>`:`<div class="empty">Qui compaiono le soluzioni che scrivi tu per recuperare ciò che hai.</div>`}`;
}

/* ===== azioni e collegamenti ===== */
function mieClick(a,el,id){
  if(a==="mnew"){const k=el.dataset.k;if(k)edNew(k);else{ED={kind:"ricetta",id:null,choose:true,it:{e:"🍳"},imp:""};goEditor();}return true;}
  if(a==="mkind"){collectEd();const nk=el.dataset.v;if(ED.it.e===MK[ED.kind].e)ED.it.e=MK[nk].e;ED.kind=nk;render();return true;}
  if(a==="micon"){ED.it.e=el.dataset.v;$("#mIconPrev").textContent=el.dataset.v;document.querySelectorAll('[data-a="micon"]').forEach(b=>b.classList.toggle("on",b===el));return true;}
  if(a==="mtag"){const t=el.dataset.v,c=ED.it.tag=Array.isArray(ED.it.tag)?ED.it.tag:[];const i=c.indexOf(t);if(i>=0)c.splice(i,1);else c.push(t);el.classList.toggle("on",i<0);return true;}
  if(a==="mparse"){collectEd();if(!ED.imp.trim()){toast("Incolla prima il testo da importare");return true;}const n=applyParsed(parseText(ED.imp,ED.kind),ED.kind);render();const o=$("#mImpOut");if(o)o.innerHTML=`<div class="note tip">${n?"✅ "+n+" campi compilati: controllali e premi Salva. Per un risultato più ordinato prova “Compila con Rimedia AI”.":"Non ho riconosciuto campi: prova “Compila con Rimedia AI”."}</div>`;return true;}
  if(a==="maiparse"){edAI();return true;}
  if(a==="msave"){edSave();return true;}
  if(a==="mcancel"){const v=ED&&ED.id?MK[ED.kind].v:(ED?MK[ED.kind].v:"quaderno");ED=null;location.hash=v;return true;}
  if(a==="medit"){edEdit(id);return true;}
  if(a==="mdel"){mineDelete(id);return true;}
  if(a==="mcopy"){const r=REG[id];if(!r||!MK[r.kind])return true;const base=JSON.parse(JSON.stringify(r.it));["id","ai","gen","stars","why","src","url","yt","img","link","bri"].forEach(k=>delete base[k]);edNew(r.kind,base);toast("Copia pronta: modificala e salvala");return true;}
  if(a==="mexport"){mineExport();return true;}
  if(a==="shmine"){const i=+el.dataset.i,m=SH.msgs[i];if(!m)return true;const map={ricetta:"ricetta",casa:"casa",riciclo:"riciclo",brico:"brico",orto:"orto",risp:"risp",tisana:"tisana",ho:"ho"};
    let k=map[SH.ctx.kind];if(!k&&SH.ctx.kind==="sezione"){const s=SECTIONS.find(x=>x.n===SH.ctx.title);k=s?s.kind:"nota";}k=k||"nota";
    closeAI();ED={kind:k,id:null,choose:true,it:{e:MK[k].e},imp:m.content};
    if(k==="nota")applyParsed({t:"Da Rimedia AI: "+SH.ctx.title.slice(0,60),body:m.content},k);
    goEditor();toast("Testo pronto: premi “Compila con Rimedia AI” o “Compila i campi”");return true;}
  return false;
}
function mieBind(){
  const ic=$("#mIconIn");if(ic)ic.oninput=e=>{const v=e.target.value.trim();if(v){ED.it.e=[...v].slice(0,4).join("");$("#mIconPrev").textContent=ED.it.e;document.querySelectorAll('[data-a="micon"]').forEach(b=>b.classList.remove("on"));}};
  const mf=$("#mImpFile");if(mf)mf.onchange=async e=>{const f=e.target.files[0];if(!f)return;collectEd();const r=await readImportFile(f);const o=$("#mImpOut");
    if(r.msg){o.innerHTML=`<div class="note warn">${esc(r.msg)}</div>`;return;}
    if(r.items){if(!confirm(`Il file contiene ${r.items.length} idee di Rimedia. Aggiungerle tutte alle tue idee?`))return;const n=mineImportItems(r.items);ED=null;filt.qd="mie";location.hash="quaderno";toast(n+" idee importate");return;}
    if(r.single){const k=MK[r.single.mk]?r.single.mk:ED.kind;ED.kind=k;applyParsed(normAI(r.single,k),k);render();toast("Campi importati dal file");return;}
    ED.imp=r.text;const n=applyParsed(parseText(r.text,ED.kind),ED.kind);render();const o2=$("#mImpOut");if(o2)o2.innerHTML=`<div class="note tip">File letto: ${n} campi compilati. Controllali o usa “Compila con Rimedia AI”.</div>`;};
  const qf=$("#mieImpFile");if(qf)qf.onchange=async e=>{const f=e.target.files[0];if(!f)return;const r=await readImportFile(f);if(!r.items){toast(r.msg||"Il file non contiene idee di Rimedia");return;}const n=mineImportItems(r.items);render();toast(n+" idee importate");};
}
function mieInit(){
  Object.assign(SEC_BY_KIND,{ho:{v:"ho",kind:"ho",n:"Cosa ne faccio",e:"♻️",d:"",list:()=>mine("ho")},nota:{v:"quaderno",kind:"nota",n:"Appunti",e:"📝",d:"",list:()=>mine("nota")}});
  QUICK_AI.nota=["Riassumi e ordina questo appunto","Trasformalo in una guida passo passo","Cosa mi manca per realizzarlo?","Ci sono rischi o precauzioni?"];
  V.nuova=viewEditor;V.quaderno=viewQuaderno2;
}
