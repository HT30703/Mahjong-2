/* 彈出視窗同互動 */
function newHand(seat,type){
  const d={type:type||'win',winner:seat,method:null,from:null,bao:null,adj:0,sel:{},fan:0,fu:30,fuFixed:false,riichi:[],tenpai:[],
    open:false,ym:0,hasYaku:false,zha:null,chain:false};
  if(d.type==='win') sanitize(d);
  return d;
}
const has=(d,n)=>(d.sel[n]||0)>0;
const isSolo=c=>c.limit||c.solo;
// 日麻副露減飜
const chipVal=(c,d)=>c.v-(d.open&&c.kui?1:0);
// 呢鋪嘅情況（自摸／出銃、莊閒、門清、前提番種）合唔合
function situational(c,d){
  if(c.only&&d.method!==c.only) return false;
  if(c.dealer===true&&d.winner!==G.dealer) return false;
  if(c.dealer===false&&d.winner===G.dealer) return false;
  if(c.fromDealer&&d.from!==G.dealer) return false;
  if(c.closed&&d.open) return false;
  if(c.req&&!c.req.every(n=>has(d,n))) return false;
  if(c.reqAny&&!c.reqAny.some(n=>has(d,n))) return false;
  return true;
}
// 再加埋同已揀番種有冇衝突
function isAvail(c,d){
  if(c.auto||!situational(c,d)) return false;
  const list=CHIPS[G.mode];
  if(list.some(o=>isSolo(o)&&o.n!==c.n&&has(d,o.n))) return false;
  if(isSolo(c)&&list.some(o=>!isSolo(o)&&!o.auto&&has(d,o.n))) return false;
  // 役滿：可以幾個役滿疊，但唔再加普通役
  if(!c.ym&&list.some(o=>o.ym&&has(d,o.n))) return false;
  if(c.ym&&list.some(o=>!o.ym&&has(d,o.n))) return false;
  if((c.x||[]).some(n=>has(d,n))) return false;
  if(list.some(o=>has(d,o.n)&&(o.x||[]).includes(c.n))) return false;
  return true;
}
// 一台花已用咗一套花，正花最多得返另一套嗰隻
function maxOf(c,d){return c.n==='正花'&&has(d,'一台花')?1:(c.max||1)}
function autoOn(c,d){
  if(CHIPS[G.mode].some(o=>o.solo&&has(d,o.n))) return false;
  if(c.auto==='tsumo') return d.method==='tsumo';
  if(c.auto==='menqing') return d.method==='tsumo'&&has(d,'門清');
  return false;
}
function chipName(c,d){
  if(c.wind==='seat') return `門風（${seatWind(d.winner)}）`;
  if(c.wind==='round') return `圈風（${WINDS[Math.floor(G.passes/4)%4]}）`;
  return c.n;
}
const chipSum=d=>CHIPS[G.mode].reduce((s,c)=>s+chipVal(c,d)*(d.sel[c.n]||0),0);
function sanitize(d){
  const list=CHIPS[G.mode];
  for(let loop=0;loop<5;loop++){
    list.forEach(c=>{
      if(c.auto){d.sel[c.n]=autoOn(c,d)?1:0;return}
      const n=d.sel[c.n]||0; if(!n) return;
      d.sel[c.n]=0; if(isAvail(c,d)) d.sel[c.n]=Math.min(n,maxOf(c,d));
    });
  }
  d.fan=Math.max(0,chipSum(d)+d.adj);
  if(G.mode==='jp'){
    d.ym=list.reduce((s,c)=>s+(c.ym?(d.sel[c.n]||0):0),0);
    d.hasYaku=list.some(c=>!c.dora&&!c.ym&&has(d,c.n));
    const i=d.riichi.indexOf(d.winner);
    const rii=has(d,'立直')||has(d,'雙立直');
    if(rii&&i<0) d.riichi.push(d.winner);
    if(!rii&&i>=0) d.riichi.splice(i,1);
    const was=d.fuFixed;
    if(has(d,'七對子')){d.fu=25;d.fuFixed=true}
    else if(has(d,'平和')&&d.method){d.fu=d.method==='tsumo'?20:30;d.fuFixed=true}
    else{d.fuFixed=false; if(was||d.fu<30) d.fu=30}
  }
}
function personBtns(act,selected,opts={}){
  return `<div class="people ${opts.four?'four':''}">${[0,1,2,3].filter(i=>opts.four||i!==opts.skip).map(i=>{
    const on=Array.isArray(selected)?selected.includes(i):selected===i;
    return `<button class="person ${on?'on':''} ${opts.green?'g':''}" data-a="${act}" data-v="${i}"><div class="av">${P(i).emoji}</div><div class="n">${pname(i)}</div></button>`}).join('')}</div>`;
}
function preview(r){
  if(!r.ok) return `<div class="err">${r.msg}</div>`;
  return `<div class="res">${[0,1,2,3].map(i=>`<div><div class="n">${pname(i)}</div><div class="v ${cls(r.deltas[i])}">${r.deltas[i]?fmt(r.deltas[i]):'0'}</div></div>`).join('')}</div>`;
}
function sheet(title,body,foot){
  return `<div class="sheet"><div class="grab"></div><div class="hd"><h3>${title}</h3><button class="x" data-a="close">完成</button></div>
    <div class="bd">${body}</div>${foot?`<div class="ft">${foot}</div>`:''}</div>`;
}

function vSheet(){
  const M=G?MODES[G.mode]:null, s=UI.sheet;
  if(s==='emoji'){
    return sheet('揀公仔',`<div class="emo">${EMOJI.map(e=>`<button class="${setupD.emojis[benchFor]===e?'on':''}" data-a="pickEmoji" data-v="${e}">${e}</button>`).join('')}</div>`);
  }
  if(s==='hand'){
    const d=hand, r=computeHand(G,d,pname), w=d.winner;
    const chain=UI.chain&&!UI.edit;
    let b = chain
      ? `<div class="lbl">一炮多響：食 ${pname(d.from)} 打出嗰隻牌</div>`
      : `<div class="lbl">${M.tsumo}定邊個${M.ron}？</div>
      <div class="people four">
        <button class="person g ${d.method==='tsumo'?'on':''}" data-a="hWin" data-v="t"><div class="av">🀄</div><div class="n">${M.tsumo}</div></button>
        ${[0,1,2,3].filter(i=>i!==w).map(i=>`<button class="person ${d.method==='ron'&&d.from===i?'on':''}" data-a="hWin" data-v="${i}"><div class="av">${P(i).emoji}</div><div class="n">${pname(i)}</div></button>`).join('')}
      </div>`;
    if(UI.edit) b=`<div class="lbl">邊個${M.win}</div>`+personBtns('hWinner',w,{four:true,green:true})+b;
    if(d.method==='tsumo'&&G.mode==='hk') b+=`<div class="lbl">有冇人包自摸（可唔揀）</div>`+personBtns('hBao',d.bao,{skip:w});
    if(d.method){
      const list=CHIPS[G.mode];
      if(G.mode==='jp') b+=`<div class="lbl">手牌</div><div class="seg"><button class="${!d.open?'on':''}" data-a="hOpen" data-v="0">門清（冇碰冇上）</button><button class="${d.open?'on':''}" data-a="hOpen" data-v="1">副露（有碰／上／明槓）</button></div>`;
      const vis=list.filter(c=>c.auto?has(d,c.n):(has(d,c.n)||situational(c,d)));
      const groups=[...new Set(vis.map(c=>c.g||''))];
      const chip=c=>{
          const k=list.indexOf(c), n=d.sel[c.n]||0, dis=c.auto||(!n&&!isAvail(c,d)), v=chipVal(c,d);
          return `<button class="chip ${n?'on':''} ${c.auto?'auto':''}" data-a="hChip" data-v="${k}" ${dis?'disabled':''}>${chipName(c,d)}${n>1?' ×'+n:''}<b>${c.ym?'役滿':v*(n||1)}</b>${c.auto?'<i>自動</i>':''}</button>`};
      const total = d.ym ? `${d.ym>1?d.ym+'倍':''}役滿`
        : `<input class="fanin" data-fanin type="text" inputmode="numeric" pattern="[0-9]*" value="${d.fan}" aria-label="${M.unit}數"><small>${M.unit}</small>`;
      b+=`<div class="lbl">番種${G.mode==='tw'?'（莊家台會另外自動加）':''}${G.mode==='jp'&&d.open?'（副露：部分役減一飜）':''}</div>
        ${groups.map(g=>`${g?`<div class="glbl">${g}</div>`:''}<div class="chips">${vis.filter(c=>(c.g||'')===g).map(chip).join('')}</div>`).join('')}
        <div class="lbl">合共</div>
        <div class="fanbox"><button data-a="hFan" data-v="-1" ${d.fan>0&&!d.ym?'':'disabled'}>−</button><div class="v" style="${d.ym?'font-size:32px':''}">${total}</div><button data-a="hFan" data-v="1" ${d.ym?'disabled':''}>＋</button></div>
        ${d.ym?'':`<div class="adjnote">${d.adj>0?`包括另加 ${d.adj}${M.unit} · `:d.adj<0?`已減 ${-d.adj}${M.unit} · `:''}可以直接撳數字輸入</div>`}`;
      if(G.mode==='jp'){
        if(!d.ym&&d.fan<5&&!d.fuFixed) b+=`<div class="lbl">符數</div><div class="fu">${FU.map(f=>`<button class="${d.fu===f?'on':''}" data-a="hFu" data-v="${f}">${f}</button>`).join('')}</div>`;
        else if(!d.ym&&d.fan<5) b+=`<div class="adjnote">${d.fu}符（${has(d,'七對子')?'七對子':'平和'+(d.method==='tsumo'?'自摸':'榮和')}固定）</div>`;
        b+=`<div class="lbl">其他人有冇立直（每人 1000，冇就唔使揀）</div>`+personBtns('hRiichi',d.riichi,{skip:w,green:true});
      }
    }
    const st=G.settings[G.mode];
    const canChain=!UI.edit&&G.mode==='hk'&&st.multi&&d.method==='ron'&&r.ok;
    return sheet(`${P(w).emoji} ${pname(w)} ${M.win}${UI.edit?' · 修改':''}`,b,
      `${preview(r)}<button class="btn primary" data-a="commit" ${r.ok?'':'disabled'}>${UI.edit?'儲存修改':'確認'}${r.ok?` · ${esc(r.label)}`:''}</button>
       ${canChain?`<button class="btn soft" data-a="commitChain">確認，仲有人食呢隻牌</button>`:''}`);
  }
  if(s==='draw'){
    const d=hand, r=computeHand(G,d,pname), zha=d.type==='zha';
    const st=G.settings[G.mode];
    const seg=UI.edit?'':`<div class="seg" style="margin-bottom:10px"><button class="${!zha?'on':''}" data-a="dType" data-v="draw">流局</button><button class="${zha?'on':''}" data-a="dType" data-v="zha">${M.zha}</button></div>`;
    let b;
    if(zha){
      const pen = G.mode==='hk' ? `每家賠${st.zhaPen==='half'?'爆棚自摸價':'爆棚出銃價'}`
                : G.mode==='tw' ? `每家賠 底 + ${st.zhaTai}台` : '滿貫罰符（閒家 8000、莊家 12000）';
      b=`<div class="lbl">邊個${M.zha}？（${pen}，今鋪重打，唔換莊）</div>${personBtns('hZha',d.zha,{four:true})}`;
    } else b = G.mode==='jp'
      ? `<div class="lbl">邊個聽牌</div>${personBtns('hTenpai',d.tenpai,{four:true,green:true})}<div class="lbl">今鋪立直嘅人</div>${personBtns('hRiichi',d.riichi,{four:true})}`
      : `<p style="color:var(--muted);font-size:14px;line-height:1.7;margin:4px 0">冇人${M.win}，分數唔變，${drawStays(G.mode,st)?pname(G.dealer)+' 繼續做莊（連莊）':'過莊，輪到 '+pname((G.dealer+1)%4)+' 做莊'}。</p>`;
    return sheet(zha?M.zha:'流局',seg+b,`${zha||G.mode==='jp'?preview(r):''}<button class="btn primary" data-a="commit" ${r.ok?'':'disabled'}>${UI.edit?'儲存修改':zha?'確認'+M.zha:'確認流局'}</button>`);
  }
  if(s==='dealer'){
    const t=UI.dt;
    return sheet('莊家設定',`<div class="lbl">而家邊個做莊</div>${personBtns('dDealer',t.dealer,{four:true})}
      <div class="lbl">圈</div><div class="seg">${WINDS.map((w,i)=>`<button class="${t.quan===i?'on':''}" data-a="dQuan" data-v="${i}">${w}圈</button>`).join('')}</div>
      <div class="lbl">局</div><div class="seg">${WINDS.map((w,i)=>`<button class="${t.ju===i?'on':''}" data-a="dJu" data-v="${i}">${w}風</button>`).join('')}</div>
      <div class="lbl">${G.mode==='jp'?'本場':'連莊次數'}</div>
      <div class="fanbox"><button data-a="dRep" data-v="-1">−</button><div class="v">${t.rep}</div><button data-a="dRep" data-v="1">＋</button></div>`,
      `<button class="btn primary" data-a="dSave">儲存</button>`);
  }
  if(s==='swap'){
    return sheet('換人 / 換位',`<div class="lbl">換位：按兩個座位對調（分數跟人走）</div>
      <div class="diamond swap" style="height:300px">${[0,1,2,3].map(i=>`<button class="seat ${SEAT_POS[i]} ${swapSel===i?'sel':''}" data-a="swapTap" data-v="${i}" style="padding:10px 8px">
        ${G.dealer===i?'<div class="zh">莊</div>':''}<div class="wd">${seatWind(i)}</div><div class="av">${P(i).emoji}</div><div class="nm">${pname(i)}</div></button>`).join('')}
        <div class="center"><div class="pick" style="font-size:12px;color:var(--muted)">${swapSel==null?'揀第一個':'再揀一個'}</div></div></div>
      <div class="lbl">改名 / 換人落場</div><div class="list">${[0,1,2,3].map(i=>`<div class="rowitem"><div class="av">${P(i).emoji}</div>
        <div class="t"><input data-rename="${i}" value="${pname(i)}" style="border:0;background:transparent;font-size:15px;font-weight:700;width:100%;color:var(--ink)"><span>${seatWind(i)}位 · ${fmtT(totalOf(G.seats[i]))} 分</span></div>
        <button class="small" data-a="openBench" data-v="${i}">換人</button></div>`).join('')}</div>`);
  }
  if(s==='bench'){
    const out=Object.keys(G.players).filter(id=>!G.seats.includes(id));
    return sheet(`換走 ${pname(benchFor)}`,`<div class="lbl">新玩家（由 0 分開始）</div>
      <div class="field"><input id="newName" placeholder="名字" maxlength="10" style="width:100%;text-align:left"></div>
      <div class="emo">${EMOJI.map(e=>`<button class="${UI.newEmoji===e?'on':''}" data-a="benchEmoji" data-v="${e}">${e}</button>`).join('')}</div>
      ${out.length?`<div class="lbl">或者叫返之前落咗場嘅人（保留分數）</div><div class="list">${out.map(id=>`<button class="rowitem" data-a="benchBack" data-v="${id}">
        <div class="av">${G.players[id].emoji}</div><div class="t" style="text-align:left"><b>${esc(G.players[id].name)}</b><span>${fmtT(totalOf(id))} 分</span></div></button>`).join('')}</div>`:''}
      <div class="lbl">${pname(benchFor)} 嘅分數會保留喺統計入面</div>`,
      `<button class="btn primary" data-a="benchNew">落場</button>`);
  }
  if(s==='new'){
    return sheet('開新牌局',`<p style="color:#5d554a;font-size:14px;line-height:1.8">而家呢局有 ${G.history.length} 鋪紀錄。開新牌局會清除分數，但會保留玩家名同座位，方便再開。</p>`,
      `<button class="btn primary" data-a="confirmNew" style="background:var(--red)">清除並重新入座</button>`);
  }
  if(s==='info'){
    const m=G.mode, st=G.settings[m]; let b='';
    const sel=(k,opts,cur)=>`<select data-set="${k}">${opts.map(o=>`<option value="${o[0]}" ${String(cur)===String(o[0])?'selected':''}>${o[1]}</option>`).join('')}</select>`;
    const drawSel=`<div class="field">流局${sel('drawStay',[['false','過莊'],['true','莊家連莊']],drawStays(m,st))}</div>`;
    if(m==='hk'){
      b+=`<div class="field">起糊番數<input type="number" min="0" max="5" data-set="minFan" value="${st.minFan}"></div>
      <div class="field">爆棚（封頂）<input type="number" min="6" max="13" data-set="maxFan" value="${st.maxFan}"></div>
      <div class="field">計法${sel('spice',[['banla','半辣上'],['lala','辣辣上']],st.spice)}</div>
      <div class="field">出銃${sel('payRule',[['full','全銃（一家包）'],['half','半銃（三家畀）']],st.payRule)}</div>
      ${drawSel}
      <div class="field"><div>搶槓<span class="sub">被搶槓嗰位點樣畀</span></div>${sel('qiangBao',[['true','當自摸，一家包'],['false','當出銃計']],st.qiangBao!==false)}</div>
      <div class="field"><div>一隻牌兩人食<span class="sub">截糊：只係下家最近嗰位食到</span></div>${sel('multi',[['false','截糊'],['true','一炮多響']],!!st.multi)}</div>
      <div class="field">詐糊罰${sel('zhaPen',[['full','每家爆棚出銃價'],['half','每家爆棚自摸價']],st.zhaPen||'full')}</div>
      <table class="ft2"><tr><th>番</th><th>出銃</th><th>自摸每家</th></tr>${Array.from({length:st.maxFan-st.minFan+1},(_,k)=>st.minFan+k).map(f=>{const V=hkValue(f,st);
        return `<tr class="${f===st.maxFan?'cap':''}"><td>${f}</td><td>${st.payRule==='full'?V:`${V/2} ＋ ${V/4}×2`}</td><td>${V/2}</td></tr>`}).join('')}</table>
      <div class="info" style="margin-top:12px"><p>全銃：出銃者一人畀晒；自摸三家各畀一半。包自摸：被包嗰位畀晒三家份。半辣上：5番起每兩番翻一倍，單數番 ×1.5。</p></div>`;
    }
    if(m==='tw') b+=`<div class="field">底<input type="number" min="0" data-set="di" value="${st.di}"></div><div class="field">每台<input type="number" min="0" data-set="tai" value="${st.tai}"></div>${drawSel}
      <div class="field">詐胡每家賠<input type="number" min="0" data-set="zhaTai" value="${st.zhaTai??8}"></div>
      <div class="info"><p>每鋪 = 底 + 台數 × 每台。放槍一家畀；自摸三家都畀。莊家有份自動加 1 台，連莊再加「連N拉N」（2N台）。詐胡每家賠 底 + 上面台數。</p></div>`;
    if(m==='jp') b+=`<div class="field">起始點數<input type="number" step="1000" data-set="start" value="${st.start}"></div>
      <div class="field">返し點<input type="number" step="1000" data-set="kaeshi" value="${st.kaeshi??30000}"></div>
      <div class="field">順位馬${sel('uma',[['0','冇'],['5-10','5-10'],['10-20','10-20'],['10-30','10-30'],['20-30','20-30']],st.uma??'10-20')}</div>
      <div class="field">每本場<input type="number" step="100" data-set="honbaPts" value="${st.honbaPts}"></div>
      <div class="field">切上滿貫${sel('kiriage',[['false','唔計'],['true','計']],!!st.kiriage)}</div>
      <div class="field"><div>飛び<span class="sub">有人跌穿 0 點即完場</span></div>${sel('tobi',[['true','有'],['false','冇']],st.tobi!==false)}</div>
      <div class="info"><p>基本點 = 符 × 2^(飜+2)，上限滿貫 2000；跳滿 3000、倍滿 4000、三倍滿 6000、役滿 8000。子家榮和 ×4、莊家 ×6；自摸莊家畀 ×2、子家畀 ×1，全部進位至 100。</p>
      <p>完場：(點數 − 返し點) ÷ 1000 ＋ 順位馬，第一名另加オカ（(返し點 − 起始點) × 4 ÷ 1000），場上剩低嘅立直棒歸第一名。錯和：閒家罰 8000、莊家罰 12000，今局重打。</p></div>`;
    return sheet(`${MODES[m].name} 規則`,b+`<div class="info"><p style="color:var(--muted);font-size:12px">番數王 · 試作版 · 資料只存喺呢部機</p></div>`);
  }
  return '';
}

/* ---- 動作 ---- */
const clone=o=>JSON.parse(JSON.stringify(o));
function advance(r){
  if(r.stay){G.repeat++; if(G.mode==='jp')G.honba++;}
  else{G.dealer=(G.dealer+1)%4;G.repeat=0;G.passes++; if(G.mode==='jp')G.honba=r.win?0:G.honba+1;}
}
// 記低一鋪：新紀錄、重做、修改後重新計都用呢個
function applyHand(inp){
  const r=computeHand(G,inp,pname); if(!r.ok) return null;
  const deltas={}; r.deltas.forEach((v,i)=>{if(v)deltas[G.seats[i]]=v});
  const snap={dealer:G.dealer,passes:G.passes,repeat:G.repeat,honba:G.honba,pot:G.pot,chainStay:!!G.chainStay};
  G.history.push({round:roundText().main,label:r.label,kind:inp.type,winner:inp.winner!=null?G.seats[inp.winner]:null,
    from:inp.from!=null?G.seats[inp.from]:null,method:inp.method,fan:inp.fan,deltas,seats:G.seats.slice(),
    input:clone(inp),gid:inp.gid,snap});
  G.pot=r.pot;
  if(inp.chain) G.chainStay=!!G.chainStay||r.stay;           // 一炮多響：等埋其他人先換莊
  else if(!r.noAdvance){ advance({...r,stay:r.stay||!!G.chainStay}); G.chainStay=false; }
  return deltas;
}
function finalizeChain(){
  const last=G.history[G.history.length-1];
  if(last&&last.input&&last.input.chain){ last.input.chain=false; advance({stay:!!G.chainStay,win:true}); G.chainStay=false; }
  UI.chain=null; save();
}
function saveEdit(){
  const ed=UI.edit; if(!applyHand(hand)) return;
  let fails=0;
  ed.tail.forEach(e=>{ G.seats=e.seats.slice(); if(!applyHand(e.input)){fails++;G.history.push(e)} });
  G.seats=ed.seats; G.redo=[]; UI.edit=null; UI.sheet=null; save();
  toast(fails?`已修改，有 ${fails} 鋪要再檢查`:'已修改，之後嘅分數已重新計');
}
function mergeSettings(s){
  s=s||{}; Object.keys(DEFAULT_SETTINGS).forEach(m=>s[m]=Object.assign({},DEFAULT_SETTINGS[m],s[m])); return s;
}
ICON.redo='<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>';
if(G){ G.settings=mergeSettings(G.settings); const l=G.history[G.history.length-1]; if(l&&l.input&&l.input.chain) finalizeChain(); }
Object.assign(ACT,{
  openSetup(){
    setupD = G ? {mode:G.mode,names:G.seats.map(id=>G.players[id].name),emojis:G.seats.map(id=>G.players[id].emoji),dealer:G.startDealer||0}
               : {mode:'hk',names:['','','',''],emojis:EMOJI.slice(0,4),dealer:0};
    UI.screen='setup';
  },
  resume(){UI.screen='game';UI.tab='now'},
  toSplash(){UI.screen='splash'},
  sMode(v){setupD.mode=v},
  sDealer(v){setupD.dealer=+v},
  sEmoji(v){benchFor=+v;UI.sheet='emoji'},
  pickEmoji(v){setupD.emojis[benchFor]=v;UI.sheet=null},
  start(){
    const players={},seats=[];
    setupD.names.forEach((n,i)=>{const id='p'+Date.now().toString(36)+i;players[id]={name:n.trim(),emoji:setupD.emojis[i]};seats.push(id)});
    const old=G&&G.settings;
    G={mode:setupD.mode,settings:mergeSettings(JSON.parse(JSON.stringify(old||DEFAULT_SETTINGS))),players,seats,startDealer:setupD.dealer,
       dealer:setupD.dealer,passes:0,repeat:0,honba:0,pot:0,history:[],redo:[]};
    UI.chain=null; UI.screen='game';UI.tab='now';save();
  },
  tab(v){UI.tab=v},
  close(){
    if(UI.edit){G=JSON.parse(UI.edit.backup);UI.edit=null}
    UI.sheet=null;swapSel=null;
  },
  openHand(v){
    v=+v;
    if(UI.chain){
      if(v===UI.chain.from||UI.chain.done.includes(v)){toast('揀另一位食糊嘅玩家');return}
      hand=newHand(v); hand.method='ron'; hand.from=UI.chain.from; sanitize(hand); UI.sheet='hand'; return;
    }
    hand=newHand(v);UI.sheet='hand';
  },
  openDraw(){ if(UI.chain){ACT.chainDone();return} hand=newHand(null,'draw');UI.sheet='draw'},
  chainDone(){finalizeChain(); toast(`輪到 ${P(G.dealer).emoji} ${P(G.dealer).name} 做莊`)},
  dType(v){hand.type=v==='zha'?'zha':'draw'},
  hZha(v){hand.zha=+v},
  hOpen(v){hand.open=v==='1'; if(!hand.open&&hand.method==='tsumo') hand.sel['門前清自摸']=1; sanitize(hand)},
  hWinner(v){v=+v; hand.winner=v; if(hand.from===v){hand.from=null;hand.method=null} if(hand.bao===v)hand.bao=null; sanitize(hand)},
  hWin(v){
    const tsumo=v==='t';
    hand.method=tsumo?'tsumo':'ron'; hand.from=tsumo?null:+v; if(!tsumo) hand.bao=null;
    if(G.mode==='jp'&&tsumo) hand.sel['門前清自摸']=1;
    sanitize(hand);
  },
  hBao(v){hand.bao=hand.bao===+v?null:+v},
  hFan(v){hand.adj=Math.max(0,hand.fan+(+v))-chipSum(hand); sanitize(hand)},
  hFu(v){hand.fu=+v},
  hChip(v){
    const c=CHIPS[G.mode][+v], n=hand.sel[c.n]||0;
    if(c.auto) return;
    if(isSolo(c)&&!n&&situational(c,hand)) hand.sel={}; // 揀例牌／花糊就清走其他番種
    if(c.ym&&!n&&situational(c,hand)&&!CHIPS[G.mode].some(o=>o.ym&&has(hand,o.n))) hand.sel={}; // 第一個役滿清走普通役
    if(!n&&!isAvail(c,hand)) return;
    hand.sel[c.n]=n<maxOf(c,hand)?n+1:0; // 可疊嘅番種：再按加一，到頂就清零
    sanitize(hand);
  },
  hRiichi(v){if(+v===hand.winner)return;const i=hand.riichi.indexOf(+v);i<0?hand.riichi.push(+v):hand.riichi.splice(i,1)},
  hTenpai(v){const i=hand.tenpai.indexOf(+v);i<0?hand.tenpai.push(+v):hand.tenpai.splice(i,1)},
  commit(){
    if(UI.edit){saveEdit();return}
    hand.gid=UI.chain?UI.chain.gid:Date.now(); hand.chain=false;
    const deltas=applyHand(hand); if(!deltas) return;
    G.redo=[]; UI.chain=null; UI.pop=Object.keys(deltas); UI.sheet=null; UI.tab='now'; save();
  },
  commitChain(){
    hand.gid=UI.chain?UI.chain.gid:Date.now(); hand.chain=true;
    const deltas=applyHand(hand); if(!deltas) return;
    G.redo=[]; UI.chain={gid:hand.gid,from:hand.from,done:[...(UI.chain?UI.chain.done:[]),hand.winner]};
    UI.pop=Object.keys(deltas); UI.sheet=null; UI.tab='now'; save(); toast('按下一位食糊嘅玩家');
  },
  undo(){
    UI.chain=null;
    const last=G.history[G.history.length-1]; if(!last){toast('冇嘢可以還原');return}
    const grp=[];
    while(G.history.length&&(!grp.length||(last.gid!=null&&G.history[G.history.length-1].gid===last.gid))) grp.unshift(G.history.pop());
    Object.assign(G,grp[0].snap);
    (G.redo=G.redo||[]).push(grp);
    save(); toast(grp.length>1?`已還原上一鋪（${grp.length} 人食）`:'已還原上一鋪');
  },
  redo(){
    const grp=(G.redo||[]).pop(); if(!grp){toast('冇嘢可以重做');return}
    if(!grp.every(e=>e.input)){G.redo.push(grp);toast('呢鋪舊紀錄唔可以重做');return}
    const cur=G.seats.slice();
    grp.forEach(e=>{G.seats=e.seats.slice(); applyHand(e.input)});
    G.seats=cur;
    const l=G.history[G.history.length-1]; if(l&&l.input&&l.input.chain) finalizeChain();
    save(); toast('已重做');
  },
  editEntry(k){
    k=+k; const e=G.history[k];
    if(!G.history.slice(k).every(h=>h.input)){toast('舊紀錄唔可以修改');return}
    UI.chain=null;
    UI.edit={k,backup:JSON.stringify(G),seats:G.seats.slice(),tail:G.history.slice(k+1)};
    G.history=G.history.slice(0,k); Object.assign(G,e.snap); G.seats=e.seats.slice();
    hand=clone(e.input); if(hand.type==='win') sanitize(hand);
    UI.sheet=hand.type==='win'?'hand':'draw';
  },
  openDealer(){UI.dt={dealer:G.dealer,quan:Math.floor(G.passes/4)%4,ju:G.passes%4,rep:G.mode==='jp'?G.honba:G.repeat};UI.sheet='dealer'},
  dDealer(v){UI.dt.dealer=+v}, dQuan(v){UI.dt.quan=+v}, dJu(v){UI.dt.ju=+v},
  dRep(v){UI.dt.rep=Math.max(0,UI.dt.rep+(+v))},
  dSave(){const t=UI.dt;G.dealer=t.dealer;G.passes=t.quan*4+t.ju;if(G.mode==='jp')G.honba=t.rep;else G.repeat=t.rep;UI.sheet=null;save();toast('已更新莊家')},
  openSwap(){swapSel=null;UI.sheet='swap'},
  swapTap(v){
    v=+v; if(swapSel==null){swapSel=v;return}
    if(swapSel!==v){const a=swapSel,b=v;[G.seats[a],G.seats[b]]=[G.seats[b],G.seats[a]]; save();} // 莊跟座位，唔跟人
    swapSel=null;
  },
  openBench(v){benchFor=+v;UI.newEmoji=EMOJI.find(e=>!Object.values(G.players).some(p=>p.emoji===e))||EMOJI[0];UI.sheet='bench'},
  benchEmoji(v){UI.newEmoji=v; const n=document.getElementById('newName'); UI.newName=n?n.value:''},
  benchNew(){
    const n=(document.getElementById('newName')||{}).value||UI.newName||''; if(!n.trim()){toast('請輸入名字');return}
    const id='p'+Date.now().toString(36); G.players[id]={name:n.trim(),emoji:UI.newEmoji};
    G.seats[benchFor]=id; UI.newName=''; UI.sheet='swap'; save(); toast(`${n.trim()} 落場`);
  },
  benchBack(id){G.seats[benchFor]=id;UI.sheet='swap';save()},
  openNew(){UI.sheet='new'},
  confirmNew(){UI.sheet=null;ACT.openSetup()},
  openInfo(){UI.sheet='info'}
});

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]'); if(!b||b.disabled) return;
  const f=ACT[b.dataset.a]; if(!f) return;
  f(b.dataset.v); render();
  if(UI.sheet==='bench'&&UI.newName){const n=document.getElementById('newName'); if(n)n.value=UI.newName}
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.name!=null){ setupD.names[+el.dataset.name]=el.value;
    const btn=document.querySelector('[data-a="start"]'); if(btn) btn.disabled=!setupD.names.every(n=>n.trim()); }
  if(el.dataset.rename!=null&&el.value.trim()){ P(+el.dataset.rename).name=el.value.trim(); save(); }
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.set){ let v=el.value; v=v==='true'?true:v==='false'?false:(isNaN(+v)?v:+v);
    const st=G.settings[G.mode]; st[el.dataset.set]=v;
    if(G.mode==='hk'){st.maxFan=Math.max(st.minFan+1,Math.min(13,st.maxFan))}
    save(); render(); }
  if(el.dataset.rename!=null) render();
});
render();
