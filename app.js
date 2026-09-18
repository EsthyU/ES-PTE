"use strict";
/* =====================================================================
   ES-PTE — PTE Core trainer. Everything is stored on this device.
   ===================================================================== */
const KEY = "espte_v1";
const uid = () => Math.random().toString(36).slice(2,10);
const pad = n => String(n).padStart(2,"0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseISO = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sum = a => a.reduce((x,y)=>x+(+y||0),0);
const clamp01 = v => Math.max(0, Math.min(1, v));
const words = s => String(s).trim().split(/\s+/).filter(Boolean);
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9' ]/g," ").replace(/\s+/g," ").trim();
const mmss = s => `${Math.floor(Math.max(s,0)/60)}:${pad(Math.floor(Math.max(s,0)%60))}`;

/* ---------- task catalogue ---------- */
const TASKS = [
 {id:"ra",    sec:"sw", name:"Read Aloud",            short:"RA",  kind:"speak", prep:35, resp:40, bank:"ra",    tip:"Read every word. Pace matters more than speed."},
 {id:"rs",    sec:"sw", name:"Repeat Sentence",       short:"RS",  kind:"speak", prep:0,  resp:15, bank:"rs",    tip:"Repeat what you can, in one flow. Partial credit is real."},
 {id:"di",    sec:"sw", name:"Describe Image",        short:"DI",  kind:"speak", prep:25, resp:40, bank:"di",    tip:"Overview, two details, one comparison, one closing line."},
 {id:"rts",   sec:"sw", name:"Respond to a Situation",short:"RTS", kind:"speak", prep:20, resp:40, bank:"rts",   tip:"Address every bullet in the prompt. Polite and direct."},
 {id:"asq",   sec:"sw", name:"Answer Short Question", short:"ASQ", kind:"short", prep:0,  resp:10, bank:"asq",   tip:"One or two words. Don't explain."},
 {id:"swt",   sec:"sw", name:"Summarize Written Text",short:"SWT", kind:"write", limit:600, min:25, max:50, bank:"swt", tip:"One sentence, 25–50 words, no full stop until the end."},
 {id:"we",    sec:"sw", name:"Write Email",           short:"WE",  kind:"write", limit:540, min:80, max:120, bank:"we", tip:"Greeting, purpose, detail, request, sign-off. Cover every bullet."},
 {id:"rwfib", sec:"rd", name:"R&W Fill in the Blanks",short:"RWFIB",kind:"drop", bank:"rwfib", tip:"Read the whole sentence before choosing. Watch collocations."},
 {id:"rmcqm", sec:"rd", name:"Reading MCQ, multiple", short:"MCQ-M",kind:"mcqm", bank:"rmcqm", tip:"Wrong picks cost a point. Only choose what the text states."},
 {id:"rop",   sec:"rd", name:"Re-order Paragraphs",   short:"ROP", kind:"order",limit:120, bank:"rop", tip:"Find the standalone opener first, then follow the linking words."},
 {id:"rfib",  sec:"rd", name:"Reading Fill in the Blanks",short:"RFIB",kind:"bankfill",bank:"rfib", tip:"Fill the blanks you're sure of first, then use elimination."},
 {id:"rmcqs", sec:"rd", name:"Reading MCQ, single",   short:"MCQ-S",kind:"mcqs", bank:"rmcqs", tip:"The answer paraphrases the text. Beware options that are true but not asked."},
 {id:"sst",   sec:"ls", name:"Summarize Spoken Text", short:"SST", kind:"writeaudio", limit:480, min:20, max:30, bank:"sst", tip:"Note the topic and three points while listening. Then one tight sentence."},
 {id:"lmcqm", sec:"ls", name:"Listening MCQ, multiple",short:"L-MCQ-M",kind:"mcqmaudio", bank:"lmcqm", tip:"Read the options while the audio loads. Wrong picks cost a point."},
 {id:"lfib",  sec:"ls", name:"Listening Fill in the Blanks",short:"L-FIB",kind:"typefill",bank:"lfib", tip:"Type as you listen. Spelling counts."},
 {id:"hcs",   sec:"ls", name:"Highlight Correct Summary",short:"HCS",kind:"mcqsaudio", bank:"hcs", tip:"Reject any option with a detail the audio didn't state."},
 {id:"lmcqs", sec:"ls", name:"Listening MCQ, single", short:"L-MCQ-S",kind:"mcqsaudio2",bank:"lmcqs", tip:"Listen for the speaker's conclusion, not the examples."},
 {id:"smw",   sec:"ls", name:"Select Missing Word",   short:"SMW", kind:"missing", bank:"smw", tip:"The ending must fit the logic of the last sentence, not just the grammar."},
 {id:"hiw",   sec:"ls", name:"Highlight Incorrect Words",short:"HIW",kind:"hiw", bank:"hiw", tip:"Follow the text with your eyes at the speaker's pace. Tap the moment it differs."},
 {id:"wfd",   sec:"ls", name:"Write from Dictation",  short:"WFD", kind:"dictation", bank:"wfd", tip:"Every correct word scores. Write the ones you caught, in order."}
];
const TASK = id => TASKS.find(t => t.id === id);
const SECTIONS = {sw:{name:"Speaking & Writing", icon:"mic"}, rd:{name:"Reading", icon:"book"}, ls:{name:"Listening", icon:"ear"}};
const itemsOf = t => (window.BANK[t.bank] || []);

/* ---------- 8 mocks, distinct slices of the bank ---------- */
const MOCK_PLAN = [["ra",3],["rs",5],["di",2],["rts",2],["asq",5],["swt",1],["we",1],
  ["rwfib",3],["rmcqm",1],["rop",2],["rfib",2],["rmcqs",2],
  ["sst",1],["lmcqm",1],["lfib",2],["hcs",1],["lmcqs",1],["smw",2],["hiw",2],["wfd",3]];
function buildMocks(){
  const mocks = [];
  for(let m = 0; m < 8; m++){
    const items = [];
    MOCK_PLAN.forEach(([id, n]) => {
      const pool = itemsOf(TASK(id)).length;
      for(let k = 0; k < n; k++) items.push({type:id, idx:(m*n + k) % pool});
    });
    mocks.push({id:"m"+(m+1), name:"Mock "+(m+1), items});
  }
  return mocks;
}
const MOCKS = buildMocks();

/* ---------- state ---------- */
function blank(){
  return { app:"es-pte", version:1,
    settings:{ name:"Esther", examDate:"2026-09-30", theme:"auto", rate:0.95, voice:"", mic:true, replay:true },
    attempts:[],   // {id, date, type, pct, n}
    mocks:[],      // {id, mockId, date, sec:{sw,rd,ls}, pct, detail:{type:pct}}
    notes:{}, done:{} };
}
function normalize(d){
  const b = blank(); if(!d || typeof d !== "object") return b;
  const s = Object.assign({}, b, d);
  s.settings = Object.assign({}, b.settings, d.settings||{});
  s.attempts = Array.isArray(d.attempts) ? d.attempts.slice(-2000) : [];
  s.mocks = Array.isArray(d.mocks) ? d.mocks : [];
  s.notes = d.notes && typeof d.notes === "object" ? d.notes : {};
  s.done = d.done && typeof d.done === "object" ? d.done : {};
  s.app = "es-pte"; return s;
}
let memFallback = null;
function load(){ try { const r = localStorage.getItem(KEY); if(r) return normalize(JSON.parse(r)); } catch(e){} return memFallback ? normalize(memFallback) : blank(); }
let saveT; function save(){ clearTimeout(saveT); saveT = setTimeout(()=>{ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){ memFallback = JSON.parse(JSON.stringify(S)); } }, 120); }
let S = load();
const UI = { tab:"home", sec:"sw", run:null, view:null };

/* ---------- progress maths ---------- */
function typeStats(id){
  const a = S.attempts.filter(x => x.type === id);
  if(!a.length) return {n:0, avg:null, last:null, recent:null};
  const recent = a.slice(-5);
  return {n:a.length, avg:sum(a.map(x=>x.pct))/a.length, last:a[a.length-1].pct, recent:sum(recent.map(x=>x.pct))/recent.length};
}
function weakest(n = 3){
  const scored = TASKS.map(t => { const s = typeStats(t.id); return {t, s, key: s.n ? s.recent : -1}; });
  const tried = scored.filter(x => x.s.n).sort((a,b)=>a.key-b.key);
  const untried = scored.filter(x => !x.s.n);
  return tried.concat(untried).slice(0, n).map(x => x.t);
}
const daysToExam = () => Math.round((parseISO(S.settings.examDate) - parseISO(todayISO()))/86400000);
function overallReadiness(){
  const vals = TASKS.map(t => typeStats(t.id)).filter(s => s.n).map(s => s.recent);
  return vals.length ? sum(vals)/vals.length : null;
}

/* ---------- speech ---------- */
let voices = [];
function loadVoices(){ try { voices = speechSynthesis.getVoices() || []; } catch(e){ voices = []; } }
if(window.speechSynthesis){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice(){
  if(!voices.length) loadVoices();
  const want = S.settings.voice;
  return voices.find(v => v.name === want) || voices.find(v => /en-GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || voices[0];
}
let speaking = false;
function speak(text, onend){
  if(!window.speechSynthesis){ if(onend) onend(); return; }
  try { speechSynthesis.cancel(); } catch(e){}
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(); if(v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
  u.rate = +S.settings.rate || 1; u.pitch = 1;
  speaking = true;
  u.onend = () => { speaking = false; if(onend) onend(); };
  u.onerror = () => { speaking = false; if(onend) onend(); };
  speechSynthesis.speak(u);
}
function stopSpeak(){ try{ speechSynthesis.cancel(); }catch(e){} speaking = false; }

/* ---------- recorder ---------- */
const REC = { stream:null, rec:null, chunks:[], url:null, on:false };
async function recStart(){
  if(!S.settings.mic || !navigator.mediaDevices) return false;
  try {
    if(!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({audio:true});
    REC.chunks = [];
    REC.rec = new MediaRecorder(REC.stream);
    REC.rec.ondataavailable = e => { if(e.data.size) REC.chunks.push(e.data); };
    REC.rec.start(); REC.on = true; return true;
  } catch(e){ REC.on = false; return false; }
}
function recStop(){
  return new Promise(res => {
    if(!REC.rec || REC.rec.state === "inactive"){ REC.on = false; return res(null); }
    REC.rec.onstop = () => {
      REC.on = false;
      const blob = new Blob(REC.chunks, {type:"audio/webm"});
      if(REC.url) URL.revokeObjectURL(REC.url);
      REC.url = URL.createObjectURL(blob); res(REC.url);
    };
    try { REC.rec.stop(); } catch(e){ REC.on = false; res(null); }
  });
}

/* ---------- timers ---------- */
let TIMER = null;
function startTimer(seconds, onTick, onDone){
  stopTimer();
  const end = Date.now() + seconds*1000;
  const step = () => {
    const left = Math.max(0, (end - Date.now())/1000);
    if(onTick) onTick(left, seconds);
    if(left <= 0.05){ stopTimer(); if(onDone) onDone(); }
  };
  step(); TIMER = setInterval(step, 100);
}
function stopTimer(){ if(TIMER){ clearInterval(TIMER); TIMER = null; } }

/* ---------- charts for Describe Image ---------- */
const CH = ["var(--sage)","var(--brass)","var(--slate)","var(--clay)","var(--plum)"];
function chartSVG(it){
  const W = 320, H = 210, P = 34;
  if(it.kind === "bar"){
    const groups = it.labels.length, series = it.series, max = Math.max(...series.flatMap(s=>s.v)) * 1.15;
    const gw = (W - P*2)/groups, bw = Math.min(gw/(series.length+1), 26);
    let g = "";
    it.labels.forEach((lb,i) => {
      series.forEach((s,j) => {
        const h = (s.v[i]/max)*(H-P*2), x = P + i*gw + gw/2 - (series.length*bw)/2 + j*(bw+2), y = H-P-h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${CH[j]}"/>
              <text x="${x+bw/2}" y="${y-4}" font-size="9" text-anchor="middle" fill="var(--ink-2)">${s.v[i]}</text>`;
      });
      g += `<text x="${P + i*gw + gw/2}" y="${H-P+14}" font-size="10" text-anchor="middle" fill="var(--ink-2)">${lb}</text>`;
    });
    return svgWrap(g + axes(W,H,P) + legend(it.series, W, P), W, H);
  }
  if(it.kind === "line"){
    const max = Math.max(...it.series.flatMap(s=>s.v))*1.15, n = it.labels.length;
    const x = i => P + i*(W-P*2)/(n-1), y = v => H-P-(v/max)*(H-P*2);
    let g = "";
    it.series.forEach((s,j) => {
      g += `<polyline fill="none" stroke="${CH[j]}" stroke-width="2.5" stroke-linejoin="round" points="${s.v.map((v,i)=>`${x(i)},${y(v)}`).join(" ")}"/>`;
      s.v.forEach((v,i)=> g += `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${CH[j]}"/>`);
    });
    it.labels.forEach((lb,i)=> { if(n<=8 || i%2===0) g += `<text x="${x(i)}" y="${H-P+14}" font-size="9" text-anchor="middle" fill="var(--ink-2)">${lb}</text>`; });
    [0, max/2, max].forEach(v => g += `<text x="${P-6}" y="${y(v)+3}" font-size="9" text-anchor="end" fill="var(--ink-3)">${Math.round(v)}</text>`);
    return svgWrap(g + axes(W,H,P) + legend(it.series, W, P), W, H);
  }
  if(it.kind === "pie"){
    const vals = it.series[0].v, tot = sum(vals), cx = 110, cy = 105, r = 74;
    let a0 = -Math.PI/2, g = "";
    vals.forEach((v,i) => {
      const a1 = a0 + (v/tot)*Math.PI*2, big = (a1-a0) > Math.PI ? 1 : 0;
      const p = (a) => `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`;
      g += `<path d="M${cx},${cy} L${p(a0)} A${r},${r} 0 ${big},1 ${p(a1)} Z" fill="${CH[i%5]}" stroke="var(--card)" stroke-width="2"/>`;
      const am = (a0+a1)/2;
      g += `<text x="${cx + (r*0.65)*Math.cos(am)}" y="${cy + (r*0.65)*Math.sin(am)+3}" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">${v}</text>`;
      a0 = a1;
    });
    g += it.labels.map((lb,i)=>`<rect x="205" y="${26+i*20}" width="10" height="10" rx="3" fill="${CH[i%5]}"/><text x="221" y="${35+i*20}" font-size="10" fill="var(--ink-2)">${esc(lb)}</text>`).join("");
    return svgWrap(g, W, H);
  }
  if(it.kind === "process"){
    const n = it.steps.length, bh = 26, gap = 8, H2 = n*(bh+gap)+16;
    let g = "";
    it.steps.forEach((s,i) => {
      const y = 8 + i*(bh+gap);
      g += `<rect x="10" y="${y}" width="300" height="${bh}" rx="8" fill="${i%2?"var(--card-2)":"var(--bg-2)"}" stroke="var(--line)"/>
            <circle cx="28" cy="${y+bh/2}" r="9" fill="${CH[i%5]}"/><text x="28" y="${y+bh/2+3.5}" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">${i+1}</text>
            <text x="44" y="${y+bh/2+4}" font-size="11" fill="var(--ink)">${esc(s)}</text>`;
      if(i < n-1) g += `<path d="M160 ${y+bh} L160 ${y+bh+gap}" stroke="var(--line-2)" stroke-width="2"/>`;
    });
    return svgWrap(g, W, H2);
  }
  if(it.kind === "map"){
    let g = `<rect x="8" y="8" width="304" height="194" rx="12" fill="var(--bg-2)" stroke="var(--line)"/>
      <path d="M8 120 H312" stroke="var(--line-2)" stroke-width="10" opacity=".4"/><path d="M150 8 V202" stroke="var(--line-2)" stroke-width="8" opacity=".4"/>`;
    it.places.forEach((p,i) => {
      const x = 16 + p.x*2.9, y = 16 + p.y*1.8;
      g += `<circle cx="${x}" cy="${y}" r="7" fill="${CH[i%5]}"/><text x="${x+11}" y="${y+4}" font-size="10" font-weight="600" fill="var(--ink)">${esc(p.n)}</text>`;
    });
    return svgWrap(g, W, H);
  }
  return "";
}
const svgWrap = (g,W,H) => `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="chart" style="max-width:420px">${g}</svg>`;
const axes = (W,H,P) => `<path d="M${P} ${H-P} H${W-P}" stroke="var(--line-2)" stroke-width="1"/><path d="M${P} ${P-10} V${H-P}" stroke="var(--line-2)" stroke-width="1"/>`;
const legend = (series,W,P) => series.length>1 ? series.map((s,j)=>`<rect x="${P+j*92}" y="6" width="9" height="9" rx="3" fill="${CH[j]}"/><text x="${P+12+j*92}" y="14" font-size="10" fill="var(--ink-2)">${esc(s.name)}</text>`).join("") : "";

/* =====================================================================
   Runner
   ===================================================================== */
function startRun(list, opts){
  UI.run = Object.assign({list, i:0, results:[], phase:"intro", answer:null, mock:null, startedAt:Date.now()}, opts||{});
  UI.view = "run"; render();
}
function endRun(){
  const r = UI.run; if(!r) return;
  stopTimer(); stopSpeak();
  if(r.mock){
    const detail = {};
    r.results.forEach(x => { (detail[x.type] = detail[x.type] || []).push(x.pct); });
    Object.keys(detail).forEach(k => detail[k] = sum(detail[k])/detail[k].length);
    const secPct = {};
    ["sw","rd","ls"].forEach(s => {
      const v = r.results.filter(x => TASK(x.type).sec === s).map(x => x.pct);
      secPct[s] = v.length ? sum(v)/v.length : 0;
    });
    const pct = sum(r.results.map(x=>x.pct))/Math.max(r.results.length,1);
    S.mocks.push({id:uid(), mockId:r.mock, date:todayISO(), sec:secPct, pct, detail});
  }
  r.results.forEach(x => S.attempts.push({id:uid(), date:todayISO(), type:x.type, pct:x.pct}));
  save();
  UI.run = Object.assign({}, r, {phase:"summary"});
  render();
}
function recordResult(pct, extra){
  const r = UI.run, cur = r.list[r.i];
  r.results.push(Object.assign({type:cur.type, idx:cur.idx, pct:clamp01(pct)*100}, extra||{}));
}
function nextItem(){
  const r = UI.run;
  stopTimer(); stopSpeak();
  if(r.i + 1 >= r.list.length){ endRun(); return; }
  r.i++; r.phase = "intro"; r.answer = null; r.audioUrl = null; r.scored = null;
  render();
}

/* ---------- per-type runners ---------- */
const RUN = {};

/* speaking family */
function speakingRunner(id){
  return {
    body(it, t, st){
      const prompt = id === "ra" ? `<p class="prompt serif">${esc(it)}</p>`
        : id === "rts" ? `<p class="prompt">${esc(it)}</p>`
        : id === "di" ? `<div class="chart-wrap"><div class="chart-title">${esc(it.title)}</div>${chartSVG(it)}</div>`
        : `<div class="audio-note">${st.phase === "prep" ? "Listen carefully" : "Now repeat what you heard"}</div>`;
      return prompt;
    },
    async begin(it, t, st){
      const r = UI.run;
      if(id === "rs"){
        r.phase = "prep"; render();
        speak(it, async () => { r.phase = "record"; await recStart(); render();
          startTimer(t.resp, l => setClock(l, t.resp), doneSpeak); });
        return;
      }
      r.phase = "prep"; render();
      startTimer(t.prep, l => setClock(l, t.prep), async () => {
        r.phase = "record"; await recStart(); render();
        startTimer(t.resp, l => setClock(l, t.resp), doneSpeak);
      });
    }
  };
}
async function doneSpeak(){
  const r = UI.run; stopTimer();
  const url = await recStop();
  r.audioUrl = url; r.phase = "self"; render();
}
["ra","rs","di","rts"].forEach(id => RUN[id] = speakingRunner(id));

/* short answer (typed) */
RUN.asq = {
  body(it){ return `<div class="audio-note">Answer in one or two words.</div>
    <input class="field big" id="ansField" autocomplete="off" placeholder="Your answer" ${UI.run.phase==="answer"?"":"disabled"}>`; },
  begin(it, t){
    const r = UI.run; r.phase = "listen"; render();
    speak(it.q, () => { r.phase = "answer"; render(); setTimeout(()=>{ const f = document.getElementById("ansField"); if(f) f.focus(); },50);
      startTimer(t.resp, l => setClock(l, t.resp), () => submitCurrent()); });
  },
  score(it){
    const v = norm((document.getElementById("ansField")||{}).value || "");
    const ok = it.a.some(a => norm(a) === v || (v && norm(a).includes(v) && v.length > 2));
    return {pct: ok ? 1 : 0, feedback: ok ? "Correct." : `Answer: ${it.a[0]}`};
  }
};

/* writing family */
function writeRunner(id, audio){
  return {
    body(it, t, st){
      const head = audio ? `<div class="audio-note">${st.phase==="listen"?"Listening — take notes":"Audio finished"}</div>
          <textarea class="field notes" id="notesField" rows="2" placeholder="Notes"></textarea>`
        : id === "swt" ? `<div class="passage">${esc(it.text)}</div>`
        : `<p class="prompt">${esc(it.text)}</p><div class="muted small">Write to ${esc(it.to)}.</div>`;
      const dis = st.phase === "write" ? "" : "disabled";
      return `${head}<textarea class="field answer" id="ansField" rows="7" placeholder="Your answer" ${dis}></textarea>
        <div class="wc" id="wcLine"></div>`;
    },
    begin(it, t){
      const r = UI.run;
      const go = () => { r.phase = "write"; render();
        const f = document.getElementById("ansField"); if(f){ f.oninput = updateWC; f.focus(); updateWC(); }
        startTimer(t.limit, l => setClock(l, t.limit), () => submitCurrent()); };
      if(audio){ r.phase = "listen"; render(); speak(it.text, go); } else go();
    },
    score(it, t){
      const txt = (document.getElementById("ansField")||{}).value || "";
      const n = words(txt).length;
      const inRange = n >= t.min && n <= t.max;
      UI.run.written = txt; UI.run.wcount = n; UI.run.inRange = inRange;
      return null; // self-rated in the review step
    }
  };
}
RUN.swt = writeRunner("swt", false);
RUN.we  = writeRunner("we", false);
RUN.sst = writeRunner("sst", true);

/* dropdown blanks */
RUN.rwfib = {
  body(it){
    let html = it.text.replace(/\{(\d+)\}/g, (m, i) => {
      const b = it.blanks[+i];
      return `<select class="inline-sel" data-b="${i}"><option value="-1">choose</option>${b.opts.map((o,j)=>`<option value="${j}">${esc(o)}</option>`).join("")}</select>`;
    });
    return `<div class="passage cloze">${html}</div>`;
  },
  begin(){ UI.run.phase = "answer"; render(); },
  score(it){
    let ok = 0; const marks = [];
    it.blanks.forEach((b,i) => {
      const sel = document.querySelector(`[data-b="${i}"]`);
      const picked = sel ? b.opts[+sel.value] : null;
      const good = picked === b.a; if(good) ok++;
      marks.push(`${good?"✓":"✗"} ${b.a}`);
    });
    return {pct: ok/it.blanks.length, feedback:`${ok} of ${it.blanks.length} correct · ${marks.join(" · ")}`};
  }
};
/* word-bank blanks (tap a blank, then a word) */
RUN.rfib = {
  body(it){
    const st = UI.run.fill || (UI.run.fill = {});
    const html = it.text.replace(/\{(\d+)\}/g, (m,i) => `<button class="blank ${st[i]?"filled":""} ${UI.run.activeBlank===+i?"active":""}" data-a="pickBlank" data-i="${i}">${st[i]?esc(st[i]):"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</button>`);
    const used = new Set(Object.values(st));
    const bankWords = it.blanks.concat(it.extra).slice().sort();
    return `<div class="passage cloze">${html}</div>
      <div class="wordbank">${bankWords.map(w=>`<button class="wordchip ${used.has(w)?"used":""}" data-a="pickWord" data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div>`;
  },
  begin(){ UI.run.phase = "answer"; UI.run.fill = {}; UI.run.activeBlank = 0; render(); },
  score(it){
    const st = UI.run.fill || {};
    let ok = 0; it.blanks.forEach((a,i) => { if(st[i] === a) ok++; });
    return {pct: ok/it.blanks.length, feedback:`${ok} of ${it.blanks.length} correct · answers: ${it.blanks.join(", ")}`};
  }
};
/* typed blanks (listening) */
RUN.lfib = {
  body(it, t, st){
    const html = it.text.replace(/\{(\d+)\}/g, (m,i)=>`<input class="inline-in" data-b="${i}" autocomplete="off" ${st.phase==="answer"?"":"disabled"}>`);
    return `<div class="audio-note">${st.phase==="listen"?"Listening — type as you go":"Fill every blank"}</div><div class="passage cloze">${html}</div>`;
  },
  begin(it){
    const r = UI.run; r.phase = "listen"; render();
    const spoken = it.text.replace(/\{(\d+)\}/g, (m,i)=>it.blanks[+i]);
    speak(spoken, () => { r.phase = "answer"; render(); });
  },
  score(it){
    let ok = 0; const marks = [];
    it.blanks.forEach((a,i) => {
      const el = document.querySelector(`.inline-in[data-b="${i}"]`);
      const good = el && norm(el.value) === norm(a); if(good) ok++;
      marks.push(`${good?"✓":"✗"} ${a}`);
    });
    return {pct: ok/it.blanks.length, feedback:`${ok} of ${it.blanks.length} · ${marks.join(" · ")}`};
  }
};
/* re-order */
RUN.rop = {
  body(it){
    const order = UI.run.order || (UI.run.order = shuffleStable(it.map((_,i)=>i)));
    return `<div class="muted small" style="margin-bottom:10px">Put the sentences in order. Use the arrows.</div>
      ${order.map((s,pos)=>`<div class="ordrow"><div class="ordtext">${esc(it[s])}</div>
        <div class="ordbtns"><button class="icon-btn" data-a="moveUp" data-p="${pos}" ${pos===0?"disabled":""}>↑</button>
        <button class="icon-btn" data-a="moveDown" data-p="${pos}" ${pos===order.length-1?"disabled":""}>↓</button></div></div>`).join("")}`;
  },
  begin(it, t){ const r = UI.run; r.phase = "answer"; r.order = shuffleStable(it.map((_,i)=>i)); render();
    startTimer(t.limit, l => setClock(l, t.limit), () => submitCurrent()); },
  score(it){
    const o = UI.run.order || [];
    let pairs = 0; for(let i = 0; i < o.length-1; i++) if(o[i+1] === o[i]+1) pairs++;
    return {pct: pairs/(it.length-1), feedback:`${pairs} of ${it.length-1} adjacent pairs correct`};
  }
};
function shuffleStable(arr){
  const a = arr.slice();
  for(let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
  if(a.every((v,i)=>v===i)) a.reverse();
  return a;
}
/* MCQ family */
function mcqBody(it, opts, multi, audioNote){
  const chosen = UI.run.picked || (UI.run.picked = []);
  return `${audioNote ? `<div class="audio-note">${audioNote}</div>` : `<div class="passage">${esc(it.text)}</div>`}
    ${it.q ? `<p class="qline">${esc(it.q)}</p>` : ""}
    <div class="opts">${opts.map((o,i)=>`<button class="opt ${chosen.includes(i)?"on":""}" data-a="pick" data-i="${i}" data-multi="${multi?1:0}">
      <span class="box">${chosen.includes(i)?"✓":""}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
}
const single = (audio, noteFn) => ({
  body(it, t, st){ return mcqBody(it, it.opts, false, audio ? (st.phase==="listen"?"Listening":"Choose one answer") : null); },
  begin(it){ const r = UI.run; r.picked = [];
    if(audio){ r.phase = "listen"; render(); speak(it.text, ()=>{ r.phase="answer"; render(); }); }
    else { r.phase = "answer"; render(); } },
  score(it){ const p = (UI.run.picked||[])[0];
    return {pct: p === it.a ? 1 : 0, feedback: p === it.a ? "Correct." : `Correct answer: ${it.opts[it.a]}`}; }
});
const multi = (audio) => ({
  body(it, t, st){ return mcqBody(it, it.opts, true, audio ? (st.phase==="listen"?"Listening":"Choose every correct answer") : null); },
  begin(it){ const r = UI.run; r.picked = [];
    if(audio){ r.phase = "listen"; render(); speak(it.text, ()=>{ r.phase="answer"; render(); }); }
    else { r.phase = "answer"; render(); } },
  score(it){
    const p = UI.run.picked || [];
    const right = p.filter(i => it.a.includes(i)).length, wrong = p.length - right;
    const pct = clamp01((right - wrong)/it.a.length);
    return {pct, feedback:`${right} right, ${wrong} wrong · answers: ${it.a.map(i=>it.opts[i]).join("; ")}`};
  }
});
RUN.rmcqs = single(false); RUN.rmcqm = multi(false);
RUN.hcs = single(true); RUN.lmcqs = single(true); RUN.lmcqm = multi(true);
/* select missing word */
RUN.smw = {
  body(it, t, st){ return mcqBody(it, it.opts, false, st.phase==="listen" ? "Listening" : "Choose the ending you heard was missing"); },
  begin(it){ const r = UI.run; r.picked = []; r.phase = "listen"; render();
    speak(it.text + " ... beep.", () => { r.phase = "answer"; render(); }); },
  score(it){ const p = (UI.run.picked||[])[0];
    return {pct: p === it.a ? 1 : 0, feedback: p === it.a ? "Correct." : `Correct: ${it.opts[it.a]}`}; }
};
/* highlight incorrect words */
RUN.hiw = {
  body(it, t, st){
    const disp = displayHIW(it);
    const picked = UI.run.picked || (UI.run.picked = []);
    return `<div class="audio-note">${st.phase==="listen"?"Listening — follow the text":"Tap every word that differed from the audio"}</div>
      <div class="passage hiw">${disp.map((w,i)=>`<button class="hw ${picked.includes(i)?"on":""}" data-a="pickWord2" data-i="${i}" ${st.phase==="answer"?"":"disabled"}>${esc(w)}</button>`).join(" ")}</div>`;
  },
  begin(it){ const r = UI.run; r.picked = []; r.phase = "listen"; render();
    speak(it.text, () => { r.phase = "answer"; render(); }); },
  score(it){
    const {wrongIdx} = hiwMap(it);
    const p = UI.run.picked || [];
    const right = p.filter(i => wrongIdx.includes(i)).length, wrong = p.length - right;
    const correctWords = it.text.split(/\s+/);
    return {pct: clamp01((right - wrong)/wrongIdx.length),
      feedback:`${right} of ${wrongIdx.length} found, ${wrong} wrong · the audio said: ${wrongIdx.map(i=>correctWords[i].replace(/[.,;:]$/,"")).join(", ")}`};
  }
};
function hiwMap(it){
  const w = it.text.split(/\s+/).slice();
  const wrongIdx = [];
  it.swaps.forEach(([correct, shown]) => {
    const i = w.findIndex((x, k) => !wrongIdx.includes(k) && x.replace(/[^A-Za-z']/g,"").toLowerCase() === correct.toLowerCase());
    if(i < 0) return;
    const punct = (w[i].match(/[.,;:]$/)||[""])[0];
    w[i] = shown + punct; wrongIdx.push(i);
  });
  return {words:w, wrongIdx};
}
const displayHIW = it => hiwMap(it).words;
/* dictation */
RUN.wfd = {
  body(it, t, st){
    return `<div class="audio-note">${st.phase==="listen"?"Listening":"Type the sentence"}</div>
      <textarea class="field answer" id="ansField" rows="3" placeholder="Type what you heard" ${st.phase==="answer"?"":"disabled"}></textarea>`;
  },
  begin(it){ const r = UI.run; r.phase = "listen"; render();
    speak(it, () => { r.phase = "answer"; render(); const f = document.getElementById("ansField"); if(f) f.focus(); }); },
  score(it){
    const typed = norm((document.getElementById("ansField")||{}).value || "").split(" ").filter(Boolean);
    const target = norm(it).split(" ").filter(Boolean);
    const pool = typed.slice(); let ok = 0;
    target.forEach(w => { const k = pool.indexOf(w); if(k >= 0){ ok++; pool.splice(k,1); } });
    return {pct: ok/target.length, feedback:`${ok} of ${target.length} words · ${it}`};
  }
};

/* ---------- runner chrome ---------- */
function setClock(left, total){
  const el = document.getElementById("clock");
  if(el){ el.textContent = mmss(left); el.parentElement.querySelector(".clockbar i").style.width = (clamp01(left/total)*100)+"%"; }
}
function currentItem(){ const r = UI.run, cur = r.list[r.i]; return {t:TASK(cur.type), it:itemsOf(TASK(cur.type))[cur.idx], cur}; }
function submitCurrent(){
  const r = UI.run; if(r.phase === "scored" || r.phase === "self") return;
  stopTimer(); stopSpeak();
  const {t, it} = currentItem();
  const runner = RUN[t.id];
  const res = runner.score ? runner.score(it, t) : null;
  if(res === null || res === undefined){ r.phase = "self"; render(); return; }
  r.scored = res;
  recordResult(res.pct);
  if(r.mock){ nextItem(); return; }
  r.phase = "scored";
  render();
}
function selfScore(v){
  const r = UI.run;
  const {t} = currentItem();
  let pct = v/5;
  if(t.kind.startsWith("write") && r.inRange === false) pct *= 0.7;
  recordResult(pct);
  if(r.mock){ nextItem(); return; }
  r.scored = {pct, feedback: t.kind === "speak" ? "Self-rated." : `Self-rated · ${r.wcount} words${r.inRange===false?" (outside the limit)":""}`};
  r.phase = "scored"; render();
}
function updateWC(){
  const f = document.getElementById("ansField"), line = document.getElementById("wcLine");
  if(!f || !line) return;
  const {t} = currentItem(); const n = words(f.value).length;
  const ok = n >= t.min && n <= t.max;
  line.innerHTML = `<span class="${ok?"good":"warn"}">${n} words</span> · limit ${t.min}–${t.max}`;
}

/* ---------- runner view ---------- */
function runView(){
  const r = UI.run;
  if(r.phase === "summary") return summaryView();
  const {t, it} = currentItem();
  const runner = RUN[t.id];
  const showReplay = S.settings.replay && !r.mock && ["rs","asq","sst","lfib","hcs","lmcqs","lmcqm","smw","hiw","wfd"].includes(t.id);
  const header = `<div class="runbar">
      <button class="icon-btn" data-a="quitRun" aria-label="Close">✕</button>
      <div class="runtitle"><b>${esc(t.name)}</b><small>${r.mock?`${MOCKS.find(m=>m.id===r.mock).name} · `:""}item ${r.i+1} of ${r.list.length}</small></div>
      <div class="clockwrap"><span id="clock" class="num">–</span><div class="clockbar"><i></i></div></div>
    </div>`;
  let body = "", foot = "";
  if(r.phase === "intro"){
    body = `<div class="introcard">${ic(SECTIONS[t.sec].icon, 44)}<h3 class="serif">${esc(t.name)}</h3>
      <p class="muted">${esc(t.tip)}</p>
      <ul class="specs">${t.prep?`<li>${t.prep}s preparation</li>`:""}${t.resp?`<li>${t.resp}s to answer</li>`:""}
        ${t.limit?`<li>${Math.round(t.limit/60)} min limit</li>`:""}${t.min?`<li>${t.min}–${t.max} words</li>`:""}
        ${t.kind==="speak"?`<li>${S.settings.mic?"Your answer is recorded":"Recording is off"}</li>`:""}</ul>
      <button class="btn block" data-a="beginItem">Start</button></div>`;
  } else if(r.phase === "self"){
    const isSpeak = t.kind === "speak";
    body = `${runner.body(it, t, r)}
      <div class="selfcard">
        <div class="eyebrow">Score yourself</div>
        ${isSpeak && r.audioUrl ? `<audio controls src="${r.audioUrl}" style="width:100%;margin:10px 0"></audio>` : ""}
        ${!isSpeak ? `<div class="wc">${r.wcount} words · limit ${t.min}–${t.max} ${r.inRange?"✓":"✗"}</div>` : ""}
        <ul class="rubric">${rubricFor(t).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        <div class="rate">${[1,2,3,4,5].map(n=>`<button class="ratebtn" data-a="selfScore" data-v="${n}">${n}</button>`).join("")}</div>
        <div class="muted small">1 = far off · 3 = acceptable · 5 = full marks</div>
      </div>`;
  } else if(r.phase === "scored"){
    body = `${runner.body(it, t, r)}
      <div class="scorecard ${r.scored.pct>=0.8?"good":r.scored.pct>=0.5?"mid":"bad"}">
        <div class="big num">${Math.round(r.scored.pct*100)}%</div>
        <div>${esc(r.scored.feedback||"")}</div>
      </div>`;
    foot = `<button class="btn block" data-a="nextItem">${r.i+1 >= r.list.length ? "Finish" : "Next item"}</button>`;
  } else {
    body = runner.body(it, t, r);
    const canSubmit = ["answer"].includes(r.phase);
    foot = `${showReplay && r.phase === "answer" ? `<button class="btn ghost" data-a="replay">Play again</button>` : ""}
      ${canSubmit ? `<button class="btn" style="flex:2" data-a="submit">Submit</button>` : ""}
      ${r.phase === "record" ? `<button class="btn" style="flex:2" data-a="stopSpeaking">Done speaking</button>` : ""}`;
  }
  return `<div class="runner">${header}<div class="runbody">${body}</div>${foot?`<div class="runfoot">${foot}</div>`:""}</div>`;
}
function rubricFor(t){
  if(t.id === "ra") return ["Every word read, nothing skipped or added","Natural phrasing, no long pauses","Clear word endings"];
  if(t.id === "rs") return ["All or most content words repeated","Said in one flow, not word by word","Started within a second of the beep"];
  if(t.id === "di") return ["Opened with what the image shows","Two specific numbers or labels","A comparison or trend","Closed with a summary line"];
  if(t.id === "rts") return ["Every part of the situation addressed","Polite, appropriate register","Clear suggestion or request","Filled most of the 40 seconds"];
  if(t.id === "swt") return ["One sentence only","Main idea plus the key support","25–50 words","No copied chunks longer than a few words"];
  if(t.id === "we") return ["Greeting and sign-off","Every bullet in the prompt covered","80–120 words","Register matches the reader"];
  if(t.id === "sst") return ["Topic named in the first clause","Two or three supporting points","20–30 words","Grammatical and complete"];
  return ["Complete","Accurate","Clear"];
}
function summaryView(){
  const r = UI.run;
  const byType = {};
  r.results.forEach(x => (byType[x.type] = byType[x.type] || []).push(x.pct));
  const overall = sum(r.results.map(x=>x.pct))/Math.max(r.results.length,1);
  const mock = r.mock ? MOCKS.find(m=>m.id===r.mock) : null;
  const secRow = s => {
    const v = r.results.filter(x => TASK(x.type).sec === s).map(x=>x.pct);
    return v.length ? `<div class="row"><div class="name">${SECTIONS[s].name}</div><b class="num">${Math.round(sum(v)/v.length)}%</b></div>` : "";
  };
  return `<div class="runner"><div class="runbar"><button class="icon-btn" data-a="quitRun">✕</button>
      <div class="runtitle"><b>${mock?mock.name+" complete":"Set complete"}</b><small>${r.results.length} items</small></div><div></div></div>
    <div class="runbody">
      <div class="hero" style="text-align:center">${ring(overall/100, 120, 12, overall>=80?"var(--sage)":overall>=60?"var(--brass)":"var(--clay)", Math.round(overall)+"%")}
        <h3 class="serif" style="margin:10px 0 2px">${overall>=85?"Strong":overall>=65?"Getting there":"Needs work"}</h3>
        <div class="muted small">Average across every item in this set</div></div>
      ${mock?`<div class="card"><div class="eyebrow" style="margin-bottom:6px">By section</div>${["sw","rd","ls"].map(secRow).join("")}</div>`:""}
      <div class="card"><div class="eyebrow" style="margin-bottom:6px">By task type</div>
        ${Object.keys(byType).map(k=>{ const v = sum(byType[k])/byType[k].length;
          return `<div class="row"><div class="name">${esc(TASK(k).name)}<small>${byType[k].length} item${byType[k].length===1?"":"s"}</small></div>
            <div class="barline"><i style="width:${v}%;background:${v>=80?"var(--sage)":v>=60?"var(--brass)":"var(--clay)"}"></i></div>
            <b class="num" style="width:44px;text-align:right">${Math.round(v)}%</b></div>`; }).join("")}</div>
      <button class="btn block" data-a="quitRun">Done</button>
    </div></div>`;
}

/* =====================================================================
   Views
   ===================================================================== */
const TABS = [
 {id:"home", label:"Home", icon:"sun", title:"Today"},
 {id:"practice", label:"Practice", icon:"book", title:"Practice"},
 {id:"mocks", label:"Mocks", icon:"clock", title:"Mock exams"},
 {id:"progress", label:"Progress", icon:"chart", title:"Progress"},
 {id:"guide", label:"Guide", icon:"target", title:"Guide"}
];
const VIEWS = {
  home(){
    const d = daysToExam(), ready = overallReadiness();
    const weak = weakest(3);
    const mocksDone = S.mocks.length;
    const todayDrills = weak.map(t => `<button class="listrow" data-a="drill" data-t="${t.id}" data-n="4">
        <div class="name">${esc(t.name)}<small>${typeStats(t.id).n ? Math.round(typeStats(t.id).recent)+"% recent · " : "not tried yet · "}4 items</small></div><span class="go">›</span></button>`).join("");
    const nextMock = MOCKS[Math.min(mocksDone, 7)];
    return `<div class="stack fade-in">
      <div class="hero">
        <div class="eyebrow">Exam ${esc(S.settings.examDate)}</div>
        <h2 class="serif">${d > 0 ? `${d} day${d===1?"":"s"} to go` : d === 0 ? "Exam today" : "Exam date passed"}</h2>
        <div class="muted">${ready==null ? "No scores yet. Start with a drill." : `Recent average ${Math.round(ready)}% across ${S.attempts.length} items.`}</div>
        <div class="herorow">
          <div><small>Mocks done</small><b class="num">${mocksDone}/8</b></div>
          <div><small>Items practised</small><b class="num">${S.attempts.length}</b></div>
          <div><small>Weakest</small><b>${weak[0]?esc(weak[0].short):"–"}</b></div>
        </div>
      </div>
      <div class="card"><div class="card-head"><div class="card-title serif">${ic("target",26)}<div>Today's three<small>Your weakest types first</small></div></div></div>
        ${todayDrills}</div>
      <div class="card"><div class="card-head"><div class="card-title serif">${ic("clock",26)}<div>Next mock<small>${mocksDone>=8?"All eight done — repeat any":"About 70 minutes, full length"}</small></div></div></div>
        <button class="btn block" data-a="startMock" data-m="${nextMock.id}">Start ${esc(nextMock.name)}</button></div>
      <div class="card"><div class="card-head"><div class="card-title serif">${ic("book",26)}<div>Plan to the exam</div></div></div>
        <ol class="steps">
          <li>Every day: three drills on your weakest types, ten minutes each.</li>
          <li>Every second day: one full mock, timed, no replays.</li>
          <li>After each mock: redo the two lowest task types the same evening.</li>
          <li>Last two days: dictation, Repeat Sentence and Read Aloud only. They carry the most marks per minute.</li>
        </ol></div>
    </div>`;
  },
  practice(){
    const sec = UI.sec;
    return `<div class="stack fade-in">
      <div class="seg">${Object.keys(SECTIONS).map(k=>`<button class="${k===sec?"on":""}" data-a="setSec" data-s="${k}">${k==="sw"?"Speak & Write":SECTIONS[k].name}</button>`).join("")}</div>
      ${TASKS.filter(t=>t.sec===sec).map(t=>{
        const st = typeStats(t.id), n = itemsOf(t).length;
        return `<div class="card taskcard">
          <div class="card-head" style="margin-bottom:8px"><div class="card-title serif" style="font-size:15px">${esc(t.name)}<small>${n} items · ${esc(t.tip)}</small></div>
            <span class="badge ${st.n? (st.recent>=80?"good":st.recent>=60?"warn":"bad") : ""}">${st.n?Math.round(st.recent)+"%":"new"}</span></div>
          <div class="btnrow">
            <button class="btn sm" data-a="drill" data-t="${t.id}" data-n="4">Drill 4</button>
            <button class="btn sm ghost" data-a="drill" data-t="${t.id}" data-n="8">Drill 8</button>
            <button class="btn sm quiet" data-a="guideFor" data-t="${t.id}">How to score</button>
          </div></div>`;
      }).join("")}
    </div>`;
  },
  mocks(){
    return `<div class="stack fade-in">
      <div class="card"><div class="card-head"><div class="card-title serif">${ic("clock",26)}<div>Eight full mocks<small>Each one a different set of items</small></div></div></div>
        <p class="muted small" style="margin:0">A mock runs all 20 task types in order, 42 items, with the real timings and no replays. Allow about 70 minutes and headphones.</p></div>
      ${MOCKS.map((m,i)=>{
        const runs = S.mocks.filter(x=>x.mockId===m.id);
        const best = runs.length ? Math.max(...runs.map(r=>r.pct)) : null;
        return `<div class="card"><div class="card-head" style="margin-bottom:8px">
          <div class="card-title serif" style="font-size:15px">${esc(m.name)}<small>${runs.length?`${runs.length} attempt${runs.length===1?"":"s"} · best ${Math.round(best)}%`:"not attempted"}</small></div>
          ${best!=null?`<span class="badge ${best>=80?"good":best>=60?"warn":"bad"}">${Math.round(best)}%</span>`:""}</div>
          ${runs.length?`<div class="row" style="border:0;padding:0 0 10px"><div class="barline"><i style="width:${best}%;background:var(--sage)"></i></div></div>`:""}
          <button class="btn block ${runs.length?"ghost":""}" data-a="startMock" data-m="${m.id}">${runs.length?"Take again":"Start"}</button></div>`;
      }).join("")}
    </div>`;
  },
  progress(){
    const ready = overallReadiness();
    const rows = TASKS.map(t => ({t, s:typeStats(t.id)}));
    const last = S.mocks.slice(-8);
    return `<div class="stack fade-in">
      <div class="card" style="text-align:center">${ring(ready!=null?ready/100:0, 130, 13, ready>=80?"var(--sage)":ready>=60?"var(--brass)":"var(--clay)", ready!=null?Math.round(ready)+"%":"–")}
        <div class="muted small" style="margin-top:8px">Average of your last five attempts in each task type</div></div>
      ${last.length?`<div class="card"><div class="card-head"><div class="card-title serif">${ic("chart",26)}<div>Mock scores</div></div></div>
        <div class="spark">${last.map(m=>`<div class="c"><div class="b" style="height:${m.pct}%;background:${m.pct>=80?"var(--sage)":m.pct>=60?"var(--brass)":"var(--clay)"}" title="${m.date}"></div><div class="l">${MOCKS.findIndex(x=>x.id===m.mockId)+1}</div></div>`).join("")}</div>
        <div class="muted small" style="margin-top:6px">Most recent eight attempts, newest on the right.</div></div>`:""}
      ${["sw","rd","ls"].map(sec=>`<div class="card"><div class="eyebrow" style="margin-bottom:8px">${SECTIONS[sec].name}</div>
        ${rows.filter(r=>r.t.sec===sec).map(r=>`<div class="row"><div class="name">${esc(r.t.name)}<small>${r.s.n?`${r.s.n} items`:"not tried"}</small></div>
          <div class="barline"><i style="width:${r.s.n?r.s.recent:0}%;background:${!r.s.n?"var(--line-2)":r.s.recent>=80?"var(--sage)":r.s.recent>=60?"var(--brass)":"var(--clay)"}"></i></div>
          <b class="num" style="width:44px;text-align:right">${r.s.n?Math.round(r.s.recent)+"%":"–"}</b></div>`).join("")}</div>`).join("")}
    </div>`;
  },
  guide(){
    const s = S.settings;
    return `<div class="stack fade-in">
      <div class="card"><div class="card-head"><div class="card-title serif">${ic("target",26)}<div>Where the marks are<small>PTE Core scores across skills, so one task feeds several scores</small></div></div></div>
        <ul class="steps">
          <li><b>Read Aloud</b> and <b>Repeat Sentence</b> feed both speaking and reading or listening. They are the highest value items in the test.</li>
          <li><b>Write from Dictation</b> scores every correct word and feeds writing and listening. Never leave it blank.</li>
          <li><b>Re-order Paragraphs</b> is scored on adjacent pairs, so getting two sentences together still earns marks.</li>
          <li>In multiple-answer questions a wrong pick cancels a right one. Choose only what you can point to in the text.</li>
          <li>Word limits are hard limits. Outside them, content marks fall away.</li>
        </ul></div>
      ${TASKS.map(t=>`<div class="card"><div class="card-title serif" style="font-size:15px;margin-bottom:6px">${esc(t.name)} <span class="badge">${esc(t.short)}</span></div>
        <div class="muted small">${esc(t.tip)}</div>
        <ul class="rubric" style="margin-top:8px">${rubricFor(t).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
      <div class="card"><div class="card-head"><div class="card-title serif">${ic("gear",26)}<div>Settings</div></div></div>
        <div class="row"><div class="name">Exam date</div><input class="field sm" type="date" style="width:160px" value="${esc(s.examDate)}" data-k="examDate"></div>
        <div class="row"><div class="name">Voice speed<small>for every spoken item</small></div><input class="field sm num" style="width:80px;text-align:right" inputmode="decimal" value="${s.rate}" data-k="rate"></div>
        <div class="row"><div class="name">Voice</div><select class="field sm" style="max-width:190px" data-k="voice"><option value="">Automatic</option>${voices.filter(v=>/^en/i.test(v.lang)).map(v=>`<option ${v.name===s.voice?"selected":""}>${esc(v.name)}</option>`).join("")}</select></div>
        <div class="row"><div class="name">Record speaking answers</div><button class="switch ${s.mic?"on":""}" data-a="toggle" data-k="mic"></button></div>
        <div class="row"><div class="name">Allow replay in practice<small>never in mocks</small></div><button class="switch ${s.replay?"on":""}" data-a="toggle" data-k="replay"></button></div>
        <div class="row"><div class="name">Appearance</div><select class="field sm" style="width:120px" data-k="theme">${[["auto","System"],["light","Light"],["dark","Dark"]].map(([v,l])=>`<option value="${v}" ${v===s.theme?"selected":""}>${l}</option>`).join("")}</select></div>
        <div class="grid2" style="margin-top:12px"><button class="btn" data-a="export">Export JSON</button><button class="btn ghost" data-a="import">Import JSON</button></div>
        <button class="btn danger block" style="margin-top:10px" data-a="reset">Reset all progress</button>
        <div class="muted small" style="margin-top:10px">Practice items were written for this app. They follow the published PTE Core formats and timings but are not past papers.</div>
      </div>
    </div>`;
  }
};

/* ---------- shell ---------- */
function ring(pct, size=64, stroke=8, color="var(--sage)", inner=""){
  const r = (size-stroke)/2, C = 2*Math.PI*r, c = size/2, p = clamp01(pct);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${Math.round(p*100)}%">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${p*C} ${C}" transform="rotate(-90 ${c} ${c})"/>
    ${inner?`<text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-size="${size/4}" font-weight="700" fill="var(--ink)">${inner}</text>`:""}</svg>`;
}
function applyTheme(){ const t = S.settings.theme; if(t==="auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); }
function render(keep){
  const y = window.scrollY;
  applyTheme();
  const app = document.getElementById("app"), bar = document.getElementById("tabbar");
  if(UI.view === "run"){
    document.body.classList.add("in-run");
    app.innerHTML = runView(); bar.style.display = "none";
  } else {
    document.body.classList.remove("in-run");
    bar.style.display = "flex";
    const t = TABS.find(x=>x.id===UI.tab);
    app.innerHTML = `<header class="topbar"><div><div class="sub">${UI.tab==="home"?`ES-PTE${S.settings.name?" · "+esc(S.settings.name):""}`:"ES-PTE"}</div><h1 class="serif">${t.title}</h1></div>
      <div class="badge">${daysToExam()>=0?daysToExam()+"d":"–"}</div></header><main>${VIEWS[UI.tab]()}</main>`;
    bar.innerHTML = TABS.map(x=>`<button class="${x.id===UI.tab?"on":""}" data-a="tab" data-tab="${x.id}">${ic(x.icon,24)}<span>${x.label}</span></button>`).join("");
  }
  window.scrollTo(0, keep ? y : 0);
}
let toastT; function toast(m){ const el = document.getElementById("toast"); el.textContent = m; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove("show"), 2200); }

/* ---------- actions ---------- */
const ACTIONS = {
  tab(b){ UI.tab = b.dataset.tab; UI.view = null; render(); },
  setSec(b){ UI.sec = b.dataset.s; render(); },
  drill(b){
    const t = TASK(b.dataset.t), n = +b.dataset.n, pool = itemsOf(t).length;
    const done = S.attempts.filter(x=>x.type===t.id).length;
    const list = Array.from({length:Math.min(n,pool)}, (_,k) => ({type:t.id, idx:(done + k) % pool}));
    startRun(list, {});
  },
  startMock(b){
    const m = MOCKS.find(x=>x.id===b.dataset.m);
    if(!confirm(`${m.name} runs ${m.items.length} items with exam timings and no replays. Allow about 70 minutes. Start now?`)) return;
    startRun(m.items.slice(), {mock:m.id});
  },
  beginItem(){ const {t, it} = currentItem(); RUN[t.id].begin(it, t, UI.run); },
  submit(){ submitCurrent(); },
  stopSpeaking(){ doneSpeak(); },
  nextItem(){ nextItem(); },
  selfScore(b){ selfScore(+b.dataset.v); },
  replay(){ const {t, it} = currentItem();
    const txt = t.id === "asq" ? it.q : t.id === "lfib" ? it.text.replace(/\{(\d+)\}/g,(m,i)=>it.blanks[+i]) : (typeof it === "string" ? it : it.text);
    speak(t.id === "smw" ? txt + " ... beep." : txt); },
  quitRun(){
    stopTimer(); stopSpeak(); if(REC.on) recStop();
    const r = UI.run;
    if(r && r.phase !== "summary" && r.results && r.results.length){
      r.results.forEach(x => S.attempts.push({id:uid(), date:todayISO(), type:x.type, pct:x.pct}));
      save(); toast(`${r.results.length} item${r.results.length===1?"":"s"} saved`);
    }
    UI.run = null; UI.view = null; render();
  },
  pick(b){
    const i = +b.dataset.i, multi = b.dataset.multi === "1", p = UI.run.picked || (UI.run.picked = []);
    if(multi){ const k = p.indexOf(i); k>=0 ? p.splice(k,1) : p.push(i); }
    else UI.run.picked = [i];
    render(true);
  },
  pickWord2(b){ const i = +b.dataset.i, p = UI.run.picked || (UI.run.picked = []);
    const k = p.indexOf(i); k>=0 ? p.splice(k,1) : p.push(i); render(true); },
  pickBlank(b){ UI.run.activeBlank = +b.dataset.i; render(true); },
  pickWord(b){
    const w = b.dataset.w, st = UI.run.fill || (UI.run.fill = {});
    Object.keys(st).forEach(k => { if(st[k] === w) delete st[k]; });
    st[UI.run.activeBlank || 0] = w;
    const {it} = currentItem();
    const next = it.blanks.findIndex((_,i) => !st[i]);
    UI.run.activeBlank = next >= 0 ? next : UI.run.activeBlank;
    render(true);
  },
  moveUp(b){ const p = +b.dataset.p, o = UI.run.order; [o[p-1],o[p]] = [o[p],o[p-1]]; render(true); },
  moveDown(b){ const p = +b.dataset.p, o = UI.run.order; [o[p+1],o[p]] = [o[p],o[p+1]]; render(true); },
  guideFor(b){ UI.tab = "guide"; render(); setTimeout(()=>{ toast(TASK(b.dataset.t).tip); },200); },
  toggle(b){ S.settings[b.dataset.k] = !S.settings[b.dataset.k]; save(); render(true); },
  export(){ exportJSON(); },
  import(){ document.getElementById("importFile").click(); },
  reset(){ const t = prompt("This clears every score and attempt on this device. Type RESET to confirm.");
    if(t && t.trim().toUpperCase() === "RESET"){ S = blank(); save(); render(); toast("Progress cleared"); } }
};
document.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if(!b || b.disabled) return; const f = ACTIONS[b.dataset.a]; if(f){ e.preventDefault(); f(b); } });
document.addEventListener("input", e => {
  const k = e.target.dataset && e.target.dataset.k; if(!k) return;
  if(k === "rate") S.settings.rate = Math.max(0.5, Math.min(1.6, parseFloat(e.target.value)||1));
  else S.settings[k] = e.target.value;
  save();
});
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.k; if(!k) return;
  S.settings[k] = e.target.value; save();
  if(k === "theme") applyTheme();
});

/* ---------- backup ---------- */
async function exportJSON(){
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:"application/json"});
  const name = `es-pte-progress-${todayISO()}.json`;
  try { const f = new File([blob], name, {type:"application/json"});
    if(navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f]}); toast("Backup ready"); return; } } catch(e){ if(e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast("Backup downloaded");
}
document.getElementById("importFile").addEventListener("change", e => {
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result);
      if(!d || d.app !== "es-pte") throw new Error("Not an ES-PTE backup.");
      if(!confirm("Replace the progress on this device?")) return;
      S = normalize(d); save(); render(); toast("Imported");
    } catch(err){ alert("Couldn't import: " + (err.message||"invalid file")); } e.target.value = ""; };
  r.readAsText(f);
});

/* ---------- boot ---------- */
document.body.insertAdjacentHTML("afterbegin", DEFS);
render();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(()=>{});
