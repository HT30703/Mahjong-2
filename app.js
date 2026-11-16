/* 狀態、主畫面 */
const KEY='mj-v2';
const EMOJI=['🐰','🐶','🐨','🐱','🐼','🦊','🐯','🐸','🐷','🐵','🐧','🦁'];
const SEAT_POS=['s0','s1','s2','s3']; // 下、右、上、左（逆時針出牌次序）
const $app=()=>document.getElementById('phone');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ACT={};

let G=null; try{G=JSON.parse(localStorage.getItem(KEY))}catch(e){}
const UI={screen:'splash',tab:'now',sheet:null,pop:[],toast:null};
let setupD=null, hand=null, swapSel=null, benchFor=null;

function save(){try{localStorage.setItem(KEY,JSON.stringify(G))}catch(e){}}
const P=seat=>G.players[G.seats[seat]];
const pname=seat=>esc(P(seat).name);
const seatWind=seat=>WINDS[(seat-G.dealer+4)%4];
const fmt=v=>{const r=Math.round(v*100)/100;return (r>0?'+':r<0?'−':'')+Math.abs(r).toLocaleString('en-US')};
const fmtT=v=>{const r=Math.round(v*100)/100;return (r<0?'−':'')+Math.abs(r).toLocaleString('en-US')};
const cls=v=>v>0?'pos':v<0?'neg':'zero';
function base(){return G.mode==='jp'?G.settings.jp.start:0}
function totalOf(pid){let t=base();G.history.forEach(h=>t+=(h.deltas[pid]||0));return t}
function roundText(){
  const quan=WINDS[Math.floor(G.passes/4)%4], ju=WINDS[G.passes%4];
  const extra=G.mode==='jp'?`${G.honba}本場`:(G.repeat?`連${G.repeat}`:'');
  return {main:`${quan}圈${ju}風`,sub:[MODES[G.mode].name,extra].filter(Boolean).join(' · ')};
}
function toast(t){UI.toast=t;render();setTimeout(()=>{UI.toast=null;render()},1600)}

const ICON={
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  undo:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  sword:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 17.5 21 6V3h-3L6.5 14.5"/><path d="m11 19-6-6M8 16l-4 4M5 21l-2-2"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
};

/* ---- 開機 ---- */
function vSplash(){
  return `<div class="screen splash">
    <div class="bigtile">中</div>
    <h1>番數王</h1><p>四人麻雀 · 自動計分 · 冇廣告</p>
    <button class="btn primary" data-a="openSetup">開新牌局</button>
    ${G?`<button class="btn soft" data-a="resume">繼續上局（${esc(Object.values(G.players).slice(0,4).map(p=>p.name).join('、'))}）</button>`:''}
  </div>`;
}

/* ---- 入名 ---- */
function vSetup(){
  const d=setupD, ok=d.names.every(n=>n.trim());
  return `<div class="screen setup">
    <div class="topbar"><button class="iconbtn" data-a="toSplash">${ICON.back}</button><h2>入座</h2><div style="width:38px"></div></div>
    <div class="body">
      <div class="lbl">玩法</div>
      <div class="seg">${Object.keys(MODES).map(k=>`<button class="${d.mode===k?'on':''}" data-a="sMode" data-v="${k}">${MODES[k].name}</button>`).join('')}</div>
      <div class="lbl">按頭像換公仔 · 按「做莊」揀起莊</div>
      <div class="diamond">
        ${[0,1,2,3].map(i=>`<div class="seat ${SEAT_POS[i]}">
          ${d.dealer===i?'<div class="zh">莊</div>':''}
          <div class="av" data-a="sEmoji" data-v="${i}">${d.emojis[i]}</div>
          <input data-name="${i}" value="${esc(d.names[i])}" placeholder="${WINDS[(i-d.dealer+4)%4]}家名字" maxlength="10">
          <div class="wdl">${WINDS[(i-d.dealer+4)%4]}位 · ${d.dealer===i?'起莊':`<span data-a="sDealer" data-v="${i}" style="color:var(--gold);cursor:pointer">做莊</span>`}</div>
        </div>`).join('')}
        <div class="center"><div class="pick">座位按<br>真實枱面<br>擺放</div></div>
      </div>
    </div>
    <div style="padding:12px 18px 70px"><button class="btn primary" data-a="start" ${ok?'':'disabled'}>開枱</button></div>
  </div>`;
}

/* ---- 枱面 ---- */
function vNow(){
  const r=roundText(), last=G.history[G.history.length-1];
  return `<div class="body now">
    <div class="diamond">
      ${[0,1,2,3].map(i=>{const p=P(i),pid=G.seats[i],t=totalOf(pid),dl=last&&last.deltas[pid];
        return `<button class="seat ${SEAT_POS[i]} ${UI.pop.includes(pid)?'pop':''}" data-a="openHand" data-v="${i}">
          ${G.dealer===i?'<div class="zh">莊</div>':''}${G.dealer===i&&G.repeat&&G.mode!=='jp'?`<div class="lz">連${G.repeat}</div>`:''}
          <div class="wd">${seatWind(i)}</div>
          <div class="av">${p.emoji}</div><div class="nm">${esc(p.name)}</div>
          <div class="sc ${G.mode==='jp'?cls(t-base()):cls(t)}">${fmtT(t)}</div>
          <div class="dl ${cls(dl||0)}">${dl?fmt(dl):''}</div>
        </button>`}).join('')}
      <div class="center">
        <div class="rd" data-a="openDealer" style="cursor:pointer">${r.main} ›<small>${r.sub}</small></div>
        <button class="pill" data-a="openDraw" ${UI.chain?'style="background:var(--ink);color:var(--bg)"':''}>${UI.chain?'完成':'流局 / '+MODES[G.mode].zha}</button>
        ${G.mode==='jp'&&G.pot?`<div class="pot">立直棒 ${G.pot}</div>`:''}
      </div>
    </div>
    <div class="hint">${UI.chain?'一炮多響：按下一位食糊嘅玩家，冇就按「完成」':'按 '+MODES[G.mode].win+'嗰位玩家 嚟記分'}</div>
  </div>`;
}

function vStats(){
  if(!G.history.length) return `<div class="body"><div class="empty">未有數據<br>打完幾鋪再嚟睇</div></div>`;
  const ids=G.seats.concat(Object.keys(G.players).filter(id=>!G.seats.includes(id)&&G.history.some(h=>h.deltas[id])));
  const s={}; ids.forEach(id=>s[id]={win:0,tsumo:0,deal:0,max:0,total:totalOf(id)-base()});
  let biggest=null;
  G.history.forEach(h=>{ if(h.kind!=='win')return;
    const a=s[h.winner]; if(a){a.win++; if(h.method==='tsumo')a.tsumo++; a.max=Math.max(a.max,h.fan);}
    if(h.method==='ron'&&s[h.from]) s[h.from].deal++;
    const gain=h.deltas[h.winner]; if(!biggest||gain>biggest.gain) biggest={gain,h};
  });
  const nmOf=id=>esc(G.players[id].name), max=Math.max(1,...ids.map(id=>Math.abs(s[id].total)));
  const top=k=>{const id=ids.slice().sort((a,b)=>s[b][k]-s[a][k])[0];return s[id][k]?`${G.players[id].emoji} ${nmOf(id)} · ${s[id][k]}次`:'–'};
  const draws=G.history.filter(h=>h.kind==='draw').length;
  return `<div class="body">
    <div class="statcard"><h4>總分</h4><div class="bars">${ids.slice().sort((a,b)=>s[b].total-s[a].total).map(id=>`
      <div class="b"><div>${G.players[id].emoji} ${nmOf(id)}</div>
      <div class="track"><div class="fill" style="width:${Math.abs(s[id].total)/max*100}%;background:${s[id].total>=0?'var(--green)':'var(--red)'}"></div></div>
      <div class="num ${cls(s[id].total)}">${fmt(s[id].total)}</div></div>`).join('')}</div></div>
    <div class="statcard"><h4>今日之最</h4><div class="hl">
      <div><div class="k">食糊王</div><div class="v">${top('win')}</div></div>
      <div><div class="k">出銃王</div><div class="v">${top('deal')}</div></div></div>
      <div class="hl" style="margin-top:10px">
      <div><div class="k">最大一鋪</div><div class="v">${biggest?`${G.players[biggest.h.winner].emoji} ${biggest.h.fan}${MODES[G.mode].unit} · ${fmt(biggest.gain)}`:'–'}</div></div>
      <div><div class="k">流局</div><div class="v">${draws} 次 / 共 ${G.history.length} 鋪</div></div></div></div>
    <div class="statcard"><h4>個人數據</h4><table class="st"><tr><th></th><th>食糊</th><th>自摸</th><th>${MODES[G.mode].ron}</th><th>最大</th></tr>
      ${ids.map(id=>`<tr><td>${G.players[id].emoji} ${nmOf(id)}</td><td>${s[id].win}</td><td>${s[id].tsumo}</td><td>${s[id].deal}</td><td>${s[id].max||'–'}</td></tr>`).join('')}</table></div>
  </div>`;
}

function vLog(){
  if(!G.history.length) return `<div class="body"><div class="empty">未有紀錄</div></div>`;
  return `<div class="body">${G.history.map((h,k)=>({h,k})).reverse().map(({h,k})=>{
    const ids=Object.keys(h.deltas).filter(id=>h.deltas[id]||h.seats.includes(id));
    const show=(h.seats||ids).slice(0,4);
    return `<div class="rec"><div class="top"><span>第 ${k+1} 鋪 · ${h.round}</span><span>${h.input?`<span data-a="editEntry" data-v="${k}" style="color:var(--gold);cursor:pointer;margin-right:12px">修改</span>`:''}${k===G.history.length-1?'<span data-a="undo" style="color:var(--red);cursor:pointer">還原</span>':''}</span></div>
      <div class="ttl">${h.kind==='win'?`${G.players[h.winner].emoji} ${esc(G.players[h.winner].name)} · `:''}${esc(h.label)}</div>
      <div class="ds">${show.map(id=>`<div>${esc(G.players[id].name)}<b class="${cls(h.deltas[id]||0)}">${h.deltas[id]?fmt(h.deltas[id]):'–'}</b></div>`).join('')}</div></div>`}).join('')}</div>`;
}

function vGame(){
  const tools=[['plus','新牌局','openNew'],['undo','還原','undo'],['redo','重做','redo'],['grid','莊家設定','openDealer'],['swap','換人/換位','openSwap'],['info','設定','openInfo']];
  const tabs=[['sword','現時賽果','now'],['chart','統計數據','stats'],['list','詳細紀錄','log']];
  return `<div class="screen">
    <div class="toolbar">${tools.map(t=>`<button class="tool" data-a="${t[2]}"><div class="ic">${ICON[t[0]]}</div>${t[1]}</button>`).join('')}</div>
    ${UI.tab==='now'?vNow():UI.tab==='stats'?vStats():vLog()}
    <div class="tabbar">${tabs.map(t=>`<button class="tab ${UI.tab===t[2]?'on':''}" data-a="tab" data-v="${t[2]}">${ICON[t[0]]}${t[1]}</button>`).join('')}</div>
  </div>`;
}

function render(){
  let h = UI.screen==='splash'?vSplash():UI.screen==='setup'?vSetup():vGame();
  if(UI.sheet) h+=`<div class="mask" data-a="close"></div>`+vSheet();
  if(UI.toast) h+=`<div class="toast">${UI.toast}</div>`;
  const ae=document.activeElement, fid=ae&&ae.dataset&&ae.dataset.name, pos=ae&&ae.selectionStart;
  $app().innerHTML=h; UI.pop=[];
  const sc=$app().querySelector('.screen'); if(sc&&UI.screen!==UI._ls) sc.classList.add('anim');
  if(UI.sheet&&UI.sheet===UI._lsh) $app().querySelectorAll('.sheet,.mask').forEach(x=>x.classList.add('still'));
  UI._ls=UI.screen; UI._lsh=UI.sheet;
  if(fid!=null){const el=$app().querySelector(`[data-name="${fid}"]`); if(el){el.focus(); try{el.setSelectionRange(pos,pos)}catch(e){}}}
}
