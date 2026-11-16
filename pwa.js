/* App 功能：深色模式、螢幕常亮、加入主畫面、圈完提示、執位 */
const PKEY='mj-prefs';
let PREFS={theme:'light',wake:true,remind:true};
try{Object.assign(PREFS,JSON.parse(localStorage.getItem(PKEY))||{})}catch(e){}
const savePrefs=()=>{try{localStorage.setItem(PKEY,JSON.stringify(PREFS))}catch(e){}};
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});

function applyTheme(){
  const dark=PREFS.theme==='dark'||(PREFS.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.querySelector('meta[name=theme-color]').content=dark?'#1b1916':'#f6f1e7';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{applyTheme()});
if(isStandalone()) document.documentElement.classList.add('standalone');

/* 螢幕常亮 */
let wakeLock=null, wakeErr=false;
async function syncWake(){
  const want=PREFS.wake&&UI.screen==='game'&&document.visibilityState==='visible';
  if(!want){ if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null} return }
  if(wakeLock||!('wakeLock' in navigator)) return;
  try{ wakeLock=await navigator.wakeLock.request('screen'); wakeErr=false;
       wakeLock.addEventListener('release',()=>{wakeLock=null}); }
  catch(e){ wakeErr=true }
}
document.addEventListener('visibilitychange',syncWake);
function wakeStatus(){
  if(!('wakeLock' in navigator)) return '呢部機／瀏覽器唔支援';
  if(!PREFS.wake) return '打牌時螢幕唔會自動熄';
  return wakeLock?'已啟用 · 打牌時螢幕唔會熄':(wakeErr?'呢個瀏覽器暫時用唔到':'打牌時螢幕唔會自動熄');
}

/* 圖示（iPhone 主畫面要 PNG，用 canvas 即場畫） */
(function makeIcon(){
  try{
    const c=document.createElement('canvas');c.width=c.height=180;const x=c.getContext('2d');
    x.fillStyle='#f6f1e7';x.fillRect(0,0,180,180);
    x.fillStyle='#2f8a5b';x.beginPath();x.roundRect(40,34,100,124,18);x.fill();
    x.fillStyle='#fffdf6';x.beginPath();x.roundRect(40,24,100,124,18);x.fill();
    x.fillStyle='#d0443a';x.font='900 82px "Songti TC","STSong",serif';x.textAlign='center';x.textBaseline='middle';x.fillText('中',90,90);
    const l=document.createElement('link');l.rel='apple-touch-icon';l.href=c.toDataURL('image/png');document.head.appendChild(l);
  }catch(e){}
})();
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}) }

/* ---- 執位 ---- */
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const r=new Uint32Array(1);crypto.getRandomValues(r);const j=r[0]%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function vZhiwai(){
  const z=UI.zw, ids=z.ids;
  // 開局入座用 setupD 嘅名，打緊用 G.players
  const who=id=>z.setup?{emoji:setupD.emojis[id],name:setupD.names[id].trim()||`玩家${id+1}`}:G.players[id];
  const cells=ids.map((id,k)=>{
    const w=z.res?z.res.indexOf(id):-1;
    return `<div class="cell"><div class="mjt ${z.res?'flip':''}"><div class="in" style="animation-delay:${k*.15}s">
      <div class="b"></div><div class="f ${w===0?'east':''}">${w>=0?WINDS[w]:''}</div></div></div>
      <div class="n">${who(id).emoji} ${esc(who(id).name)}</div></div>`}).join('');
  return sheet('執位',`<div class="zw">${cells}</div>
    <div class="zwnote">${z.res?`執到「東」嘅 ${esc(who(z.res[0]).name)} 坐東位做莊<br>其他人按東南西北逆時針入座${z.setup?'':'，分數跟人走'}`:'按「執位」，每人隨機抽一隻風牌決定座位'}</div>`,
    z.res?`<div class="stack"><button class="btn primary" data-a="zwApply">確認入座</button><button class="btn ghost" data-a="zwDraw">再執過</button></div>`
         :`<button class="btn primary" data-a="zwDraw">執位</button>`);
}

/* ---- 圈完提示 ---- */
// 日麻完場：(點數 − 返し點)/1000 ＋ 順位馬，第一名加オカ同場上立直棒
function jpFinal(){
  const st=G.settings.jp, uma=UMA[String(st.uma??'10-20')]||UMA['0'], kaeshi=st.kaeshi??30000;
  const order=G.seats.map((id,i)=>({id,i,pts:totalOf(id)}))
    .sort((a,b)=>b.pts-a.pts||((a.i-(G.startDealer||0)+4)%4)-((b.i-(G.startDealer||0)+4)%4));
  order.forEach((o,k)=>{ if(k===0) o.pts+=G.pot||0; o.pt=(o.pts-kaeshi)/1000+uma[k]+(k===0?(kaeshi-st.start)*4/1000:0); });
  return order;
}
function vRoundEnd(){
  const r=UI.re;
  let rank;
  if(r.final&&G.mode==='jp'){
    rank=jpFinal().map((o,i)=>`<div class="r"><span class="no">${i+1}</span><span>${G.players[o.id].emoji}</span><span class="t">${esc(G.players[o.id].name)}<small style="display:block;font-size:11px;color:var(--muted);font-weight:400">${o.pts.toLocaleString('en-US')} 點</small></span>
      <span class="v ${cls(o.pt)}">${o.pt>0?'+':''}${(Math.round(o.pt*10)/10).toFixed(1)}</span></div>`).join('');
  } else {
    const ids=G.seats.slice().sort((a,b)=>totalOf(b)-totalOf(a));
    rank=ids.map((id,i)=>`<div class="r"><span class="no">${i+1}</span><span>${G.players[id].emoji}</span><span class="t">${esc(G.players[id].name)}</span>
      <span class="v ${cls(totalOf(id)-base())}">${fmtT(totalOf(id))}</span></div>`).join('');
  }
  const body=`<div class="re-hero"><div class="big">${r.title}</div><div class="sm">${r.sub}</div></div><div class="rank">${rank}</div>`;
  const foot = r.final
    ? `<div class="stack"><button class="btn primary" data-a="confirmNew">開新一場</button><button class="btn soft" data-a="openZw">執位再打</button><button class="btn ghost" data-a="close">繼續打落去</button></div>`
    : `<div class="stack"><button class="btn primary" data-a="close">繼續 · 入${r.next}圈</button><button class="btn soft" data-a="openZw">先執位</button></div>`;
  return sheet('',body,foot);
}

/* ---- 設定 ---- */
function vAppSettings(){
  const tg=(k,on)=>`<button class="toggle ${on?'on':''}" data-a="pref" data-v="${k}" aria-label="${k}"></button>`;
  return `<div class="lbl">外觀</div>
    <div class="seg">${[['light','淺色'],['dark','深色'],['auto','跟系統']].map(t=>`<button class="${PREFS.theme===t[0]?'on':''}" data-a="theme" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="lbl">打牌時</div>
    <div class="field"><div>螢幕保持開啟<span class="sub">${wakeStatus()}</span></div>${tg('wake',PREFS.wake)}</div>
    <div class="field"><div>換莊 / 圈完提示<span class="sub">換莊會震一下兼顯示，圈完彈出排名同執位</span></div>${tg('remind',PREFS.remind)}</div>`;
}

const _vSheet=vSheet;
vSheet=function(){
  const s=UI.sheet;
  if(s==='zhiwai') return vZhiwai();
  if(s==='roundEnd') return vRoundEnd();
  if(s==='info'){
    const tab=UI.infoTab||'rules';
    const seg=`<div class="seg" style="margin-bottom:6px">${[['rules',MODES[G.mode].name+'規則'],['app','App 設定']].map(t=>`<button class="${tab===t[0]?'on':''}" data-a="infoTab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>`;
    if(tab==='app') return sheet('設定',seg+vAppSettings());
    return _vSheet().replace('<div class="bd">','<div class="bd">'+seg).replace(/<h3>[^<]*<\/h3>/,'<h3>設定</h3>');
  }
  if(s==='swap'){
    return _vSheet().replace('<div class="bd">','<div class="bd"><button class="btn soft" data-a="openZw" style="margin:2px 0 6px">🀀 執位（隨機抽座位）</button>');
  }
  return _vSheet();
};

/* ---- 動作 ---- */
const _commit=ACT.commit;
Object.assign(ACT,{
  commit(){
    const b={passes:G.passes,len:G.history.length};
    _commit(); if(G.history.length===b.len) return;
    navigator.vibrate?.(25);
    if(G.mode==='jp'&&G.settings.jp.tobi!==false){
      const bust=G.seats.filter(id=>totalOf(id)<0);
      if(bust.length){
        UI.re={title:'飛び · 完場',sub:`${bust.map(id=>esc(G.players[id].name)).join('、')} 跌穿 0 點`,final:true};
        UI.sheet='roundEnd'; navigator.vibrate?.([40,60,40]); return;
      }
    }
    if(!PREFS.remind||G.passes===b.passes) return;
    const endAt=G.mode==='jp'?8:16;
    if(G.passes%4===0){
      const done=WINDS[(G.passes/4-1)%4], fin=G.passes%endAt===0;
      UI.re={title:fin?(G.mode==='jp'?'半莊完':'一場完'):`${done}圈完`,
             sub:fin?`打咗 ${G.history.length} 鋪`:`下一圈：${WINDS[(G.passes/4)%4]}圈 · ${pname(G.dealer)} 做莊`,
             next:WINDS[(G.passes/4)%4],final:fin};
      UI.sheet='roundEnd'; navigator.vibrate?.([40,60,40]);
    } else toast(`換莊 · 輪到 ${P(G.dealer).emoji} ${P(G.dealer).name} 做莊`);
  },
  openZw(){UI.zw={ids:G.seats.slice(),res:null};UI.sheet='zhiwai'},
  zwDraw(){
    if(UI.zw.res){UI.zw.res=null;render();setTimeout(()=>{UI.zw.res=shuffle(UI.zw.ids);render()},380);return}
    UI.zw.res=shuffle(UI.zw.ids);
  },
  zwApply(){
    if(UI.zw.setup){
      const order=UI.zw.res; // order[位] = 執到呢個風嘅人
      setupD.names=order.map(i=>setupD.names[i]); setupD.emojis=order.map(i=>setupD.emojis[i]); setupD.dealer=0;
      UI.sheet=null; toast(`${setupD.names[0].trim()||'東家'} 坐東做莊`); return;
    }
    G.seats=UI.zw.res.slice(); G.dealer=0; G.repeat=0; if(G.mode==='jp') G.honba=0;
    UI.sheet=null; save(); toast(`${P(0).emoji} ${P(0).name} 坐東做莊`);
  },
  sShuffle(){ UI.zw={setup:true,ids:[0,1,2,3],res:null}; UI.sheet='zhiwai'; },
  infoTab(v){UI.infoTab=v},
  theme(v){PREFS.theme=v;savePrefs();applyTheme()},
  pref(k){PREFS[k]=!PREFS[k];savePrefs();syncWake().then(render)}
});

/* 入座畫面加隨機執位掣 */
const _vSetup=vSetup;
vSetup=function(){
  return _vSetup().replace('<div style="padding:12px 18px 70px">','<div class="setup-foot" style="padding:8px 18px 70px"><button class="dice" data-a="sShuffle" style="margin:0 auto 12px">🀄 執位（抽風牌決定座位）</button>');
};

/* 每次畫面更新後：主題、玩法 class、螢幕常亮；保留捲動位置 */
const _render=render;
render=function(){
  const q=s=>$app().querySelector(s);
  const sb=q('.sheet .bd'), bd=q('.body');
  const keep={sheet:UI.sheet, sTop:sb?sb.scrollTop:0, bTop:bd?bd.scrollTop:0, tab:UI.tab};
  _render();
  $app().className='phone'+(G?' mode-'+G.mode:'');
  if(keep.sheet&&keep.sheet===UI.sheet){const n=q('.sheet .bd'); if(n) n.scrollTop=keep.sTop}
  if(keep.tab===UI.tab){const n=q('.body'); if(n) n.scrollTop=keep.bTop}
  syncWake();
};
// 直接撳數字輸入番／台／飜：只更新結果，唔重畫輸入框（鍵盤唔會收埋）
document.addEventListener('input',e=>{
  const f=e.target; if(!f.hasAttribute||!f.hasAttribute('data-fanin')||!hand) return;
  const raw=f.value.replace(/\D/g,'').slice(0,3); if(raw!==f.value) f.value=raw;
  hand.adj=(raw===''?0:parseInt(raw,10))-chipSum(hand); sanitize(hand);
  const q=s=>$app().querySelector(s), tmp=document.createElement('div'); tmp.innerHTML=vSheet();
  [['.sheet .ft','.ft'],['.sheet .adjnote','.adjnote']].forEach(([a,b])=>{const o=q(a),n=tmp.querySelector(b); if(o&&n) o.innerHTML=n.innerHTML});
  const minus=q('[data-a="hFan"][data-v="-1"]'); if(minus) minus.disabled=hand.fan<=0;
});
// 打完先重畫一次（日麻符數要睇飜數決定顯唔顯示）
document.addEventListener('change',e=>{ if(e.target.hasAttribute&&e.target.hasAttribute('data-fanin')&&G&&G.mode==='jp') render(); });
document.addEventListener('focusin',e=>{ if(e.target.hasAttribute&&e.target.hasAttribute('data-fanin')) setTimeout(()=>{try{e.target.select()}catch(x){}},0) });
document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.hasAttribute&&e.target.hasAttribute('data-fanin')) e.target.blur(); });
applyTheme(); render();
