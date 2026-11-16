/* 彈出視窗同互動 */
function newHand(seat,type){
  const d={type:type||'win',winner:seat,method:null,from:null,bao:null,adj:0,sel:{},fan:0,fu:30,fuFixed:false,riichi:[],tenpai:[]};
  if(d.type==='win') sanitize(d);
  return d;
}
const has=(d,n)=>(d.sel[n]||0)>0;
// 呢鋪嘅情況（自摸／出銃、莊閒、前提番種）合唔合
function situational(c,d){
  if(c.only&&d.method!==c.only) return false;
  if(c.dealer===true&&d.winner!==G.dealer) return false;
  if(c.dealer===false&&d.winner===G.dealer) return false;
  if(c.req&&!c.req.every(n=>has(d,n))) return false;
  return true;
}
// 再加埋同已揀番種有冇衝突
function isAvail(c,d){
  if(c.auto||!situational(c,d)) return false;
  const list=CHIPS[G.mode];
  if(list.some(o=>o.limit&&o.n!==c.n&&has(d,o.n))) return false;
  if(c.limit&&list.some(o=>!o.limit&&!o.auto&&has(d,o.n))) return false;
  if((c.x||[]).some(n=>has(d,n))) return false;
  if(list.some(o=>has(d,o.n)&&(o.x||[]).includes(c.n))) return false;
  return true;
}
function autoOn(c,d){
  if(c.auto==='tsumo') return d.method==='tsumo';
  if(c.auto==='menqing') return d.method==='tsumo'&&has(d,'門清');
  return false;
}
function sanitize(d){
  const list=CHIPS[G.mode];
  for(let loop=0;loop<5;loop++){
    list.forEach(c=>{
      if(c.auto){d.sel[c.n]=autoOn(c,d)?1:0;return}
      const n=d.sel[c.n]||0; if(!n) return;
      d.sel[c.n]=0; if(isAvail(c,d)) d.sel[c.n]=n;
    });
  }
  d.fan=list.reduce((s,c)=>s+c.v*(d.sel[c.n]||0),0)+d.adj;
  if(G.mode==='jp'){
    const i=d.riichi.indexOf(d.winner);
    if(has(d,'立直')&&i<0) d.riichi.push(d.winner);
    if(!has(d,'立直')&&i>=0) d.riichi.splice(i,1);
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
    let b=`<div class="lbl">${M.tsumo}定邊個${M.ron}？</div>
      <div class="people four">
        <button class="person g ${d.method==='tsumo'?'on':''}" data-a="hWin" data-v="t"><div class="av">🀄</div><div class="n">${M.tsumo}</div></button>
        ${[0,1,2,3].filter(i=>i!==w).map(i=>`<button class="person ${d.method==='ron'&&d.from===i?'on':''}" data-a="hWin" data-v="${i}"><div class="av">${P(i).emoji}</div><div class="n">${pname(i)}</div></button>`).join('')}
      </div>`;
    if(d.method==='tsumo'&&G.mode==='hk') b+=`<div class="lbl">有冇人包自摸（可唔揀）</div>`+personBtns('hBao',d.bao,{skip:w});
    if(d.method){
      const list=CHIPS[G.mode];
      const vis=list.filter(c=>c.auto?has(d,c.n):(has(d,c.n)||situational(c,d)));
      b+=`<div class="lbl">番種${G.mode==='tw'?'（莊家台會另外自動加）':''}</div><div class="chips">${vis.map(c=>{
          const k=list.indexOf(c), n=d.sel[c.n]||0, dis=c.auto||(!n&&!isAvail(c,d));
          return `<button class="chip ${n?'on':''} ${c.auto?'auto':''}" data-a="hChip" data-v="${k}" ${dis?'disabled':''}>${c.n}${n>1?' ×'+n:''}<b>${c.v*(n||1)}</b>${c.auto?'<i>自動</i>':''}</button>`}).join('')}</div>
        <div class="lbl">合共</div>
        <div class="fanbox"><button data-a="hFan" data-v="-1" ${d.adj?'':'disabled'}>−</button><div class="v">${d.fan}<small>${M.unit}</small></div><button data-a="hFan" data-v="1">＋</button></div>
        ${d.adj?`<div class="adjnote">包括另加 ${d.adj}${M.unit}</div>`:`<div class="adjnote">有其他${M.unit}可以按 ＋ 另加</div>`}`;
      if(G.mode==='jp'){
        if(d.fan<5&&!d.fuFixed) b+=`<div class="lbl">符數</div><div class="fu">${FU.map(f=>`<button class="${d.fu===f?'on':''}" data-a="hFu" data-v="${f}">${f}</button>`).join('')}</div>`;
        else if(d.fan<5) b+=`<div class="adjnote">${d.fu}符（${has(d,'七對子')?'七對子':'平和'+(d.method==='tsumo'?'自摸':'榮和')}固定）</div>`;
        b+=`<div class="lbl">其他人有冇立直（每人 1000，冇就唔使揀）</div>`+personBtns('hRiichi',d.riichi,{skip:w,green:true});
      }
    }
    return sheet(`${P(w).emoji} ${pname(w)} ${M.win}`,b,
      `${preview(r)}<button class="btn primary" data-a="commit" ${r.ok?'':'disabled'}>確認${r.ok?` · ${esc(r.label)}`:''}</button>`);
  }
  if(s==='draw'){
    const d=hand, r=computeHand(G,d,pname);
    let b = G.mode==='jp'
      ? `<div class="lbl">邊個聽牌</div>${personBtns('hTenpai',d.tenpai,{four:true,green:true})}<div class="lbl">今鋪立直嘅人</div>${personBtns('hRiichi',d.riichi,{four:true})}`
      : `<p style="color:var(--muted);font-size:14px;line-height:1.7;margin:4px 0">冇人${M.win}，分數唔變，${pname(G.dealer)} 繼續做莊。</p>`;
    return sheet('流局',b,`${G.mode==='jp'?preview(r):''}<button class="btn primary" data-a="commit">確認流局</button>`);
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
    if(m==='hk'){
      b+=`<div class="field">起糊番數<input type="number" min="0" max="5" data-set="minFan" value="${st.minFan}"></div>
      <div class="field">爆棚（封頂）<input type="number" min="6" max="13" data-set="maxFan" value="${st.maxFan}"></div>
      <div class="field">計法<select data-set="spice"><option value="banla" ${st.spice==='banla'?'selected':''}>半辣上</option><option value="lala" ${st.spice==='lala'?'selected':''}>辣辣上</option></select></div>
      <div class="field">出銃<select data-set="payRule"><option value="full" ${st.payRule==='full'?'selected':''}>全銃（一家包）</option><option value="half" ${st.payRule==='half'?'selected':''}>半銃（三家畀）</option></select></div>
      <table class="ft2"><tr><th>番</th><th>出銃</th><th>自摸每家</th></tr>${Array.from({length:st.maxFan-st.minFan+1},(_,k)=>st.minFan+k).map(f=>{const V=hkValue(f,st);
        return `<tr class="${f===st.maxFan?'cap':''}"><td>${f}</td><td>${st.payRule==='full'?V:`${V/2} ＋ ${V/4}×2`}</td><td>${V/2}</td></tr>`}).join('')}</table>
      <div class="info" style="margin-top:12px"><p>全銃：出銃者一人畀晒；自摸三家各畀一半。包自摸：被包嗰位畀晒三家份。半辣上：5番起每兩番翻一倍，單數番 ×1.5。</p></div>`;
    }
    if(m==='tw') b+=`<div class="field">底<input type="number" min="0" data-set="di" value="${st.di}"></div><div class="field">每台<input type="number" min="0" data-set="tai" value="${st.tai}"></div>
      <div class="info"><p>每鋪 = 底 + 台數 × 每台。放槍一家畀；自摸三家都畀。莊家有份自動加 1 台，連莊再加「連N拉N」（2N台）。</p></div>`;
    if(m==='jp') b+=`<div class="field">起始點數<input type="number" step="1000" data-set="start" value="${st.start}"></div><div class="field">每本場<input type="number" step="100" data-set="honbaPts" value="${st.honbaPts}"></div>
      <div class="field">切上滿貫<select data-set="kiriage"><option value="false" ${!st.kiriage?'selected':''}>唔計</option><option value="true" ${st.kiriage?'selected':''}>計</option></select></div>
      <div class="info"><p>基本點 = 符 × 2^(飜+2)，上限滿貫 2000；跳滿 3000、倍滿 4000、三倍滿 6000、役滿 8000。子家榮和 ×4、莊家 ×6；自摸莊家畀 ×2、子家畀 ×1，全部進位至 100。</p></div>`;
    return sheet(`${MODES[m].name} 規則`,b+`<div class="info"><p style="color:var(--muted);font-size:12px">番數王 · 試作版 · 資料只存喺呢部機</p></div>`);
  }
  return '';
}

/* ---- 動作 ---- */
function advance(r){
  if(r.stay){G.repeat++; if(G.mode==='jp')G.honba++;}
  else{G.dealer=(G.dealer+1)%4;G.repeat=0;G.passes++; if(G.mode==='jp')G.honba=r.win?0:G.honba+1;}
}
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
    G={mode:setupD.mode,settings:JSON.parse(JSON.stringify(old||DEFAULT_SETTINGS)),players,seats,startDealer:setupD.dealer,
       dealer:setupD.dealer,passes:0,repeat:0,honba:0,pot:0,history:[]};
    UI.screen='game';UI.tab='now';save();
  },
  tab(v){UI.tab=v},
  close(){UI.sheet=null;swapSel=null},
  openHand(v){hand=newHand(+v);UI.sheet='hand'},
  openDraw(){hand=newHand(null,'draw');UI.sheet='draw'},
  hWin(v){
    const tsumo=v==='t';
    hand.method=tsumo?'tsumo':'ron'; hand.from=tsumo?null:+v; if(!tsumo) hand.bao=null;
    if(G.mode==='jp'&&tsumo) hand.sel['門前清自摸']=1;
    sanitize(hand);
  },
  hBao(v){hand.bao=hand.bao===+v?null:+v},
  hFan(v){hand.adj=Math.max(0,hand.adj+(+v));sanitize(hand)},
  hFu(v){hand.fu=+v},
  hChip(v){
    const c=CHIPS[G.mode][+v], n=hand.sel[c.n]||0;
    if(c.auto) return;
    if(c.limit&&!n&&situational(c,hand)) hand.sel={}; // 揀爆棚牌就清走其他番種
    if(!n&&!isAvail(c,hand)) return;
    hand.sel[c.n]=n<(c.max||1)?n+1:0; // 可疊嘅番種：再按加一，到頂就清零
    sanitize(hand);
  },
  hRiichi(v){if(+v===hand.winner)return;const i=hand.riichi.indexOf(+v);i<0?hand.riichi.push(+v):hand.riichi.splice(i,1)},
  hTenpai(v){const i=hand.tenpai.indexOf(+v);i<0?hand.tenpai.push(+v):hand.tenpai.splice(i,1)},
  commit(){
    const r=computeHand(G,hand,pname); if(!r.ok) return;
    const deltas={}; r.deltas.forEach((v,i)=>{if(v)deltas[G.seats[i]]=v});
    G.history.push({round:roundText().main,label:r.label,kind:hand.type,winner:hand.winner!=null?G.seats[hand.winner]:null,
      from:hand.from!=null?G.seats[hand.from]:null,method:hand.method,fan:hand.fan,deltas,seats:G.seats.slice(),
      snap:{dealer:G.dealer,passes:G.passes,repeat:G.repeat,honba:G.honba,pot:G.pot}});
    G.pot=r.pot; advance(r); UI.pop=Object.keys(deltas); UI.sheet=null; UI.tab='now'; save();
  },
  undo(){
    const e=G.history.pop(); if(!e){toast('冇嘢可以還原');return}
    Object.assign(G,e.snap); save(); toast('已還原上一鋪');
  },
  openDealer(){UI.dt={dealer:G.dealer,quan:Math.floor(G.passes/4)%4,ju:G.passes%4,rep:G.mode==='jp'?G.honba:G.repeat};UI.sheet='dealer'},
  dDealer(v){UI.dt.dealer=+v}, dQuan(v){UI.dt.quan=+v}, dJu(v){UI.dt.ju=+v},
  dRep(v){UI.dt.rep=Math.max(0,UI.dt.rep+(+v))},
  dSave(){const t=UI.dt;G.dealer=t.dealer;G.passes=t.quan*4+t.ju;if(G.mode==='jp')G.honba=t.rep;else G.repeat=t.rep;UI.sheet=null;save();toast('已更新莊家')},
  openSwap(){swapSel=null;UI.sheet='swap'},
  swapTap(v){
    v=+v; if(swapSel==null){swapSel=v;return}
    if(swapSel!==v){const a=swapSel,b=v;[G.seats[a],G.seats[b]]=[G.seats[b],G.seats[a]];
      if(G.dealer===a)G.dealer=b; else if(G.dealer===b)G.dealer=a; save();}
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
