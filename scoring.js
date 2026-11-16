/* 計分邏輯（以座位 0–3 計，返回每個座位嘅分數變化） */
const WINDS=['東','南','西','北'];
const MODES={
  hk:{name:'香港麻雀',unit:'番',win:'食糊',ron:'出銃',tsumo:'自摸',zha:'詐糊'},
  tw:{name:'台灣麻將',unit:'台',win:'胡牌',ron:'放槍',tsumo:'自摸',zha:'詐胡'},
  jp:{name:'日本麻雀',unit:'飜',win:'和了',ron:'放銃',tsumo:'自摸',zha:'錯和'}
};
/* 番種規則
   auto: 自動計（唔使揀）  only: 只限自摸 tsumo / 出銃 ron  dealer: true 只限莊家 / false 只限閒家
   fromDealer: 要食莊家出嘅牌  req: 要先有（全部）  reqAny: 要先有其中一樣  x: 唔可以同時有
   max: 可以疊幾次  limit: 例牌（揀咗就唔再加其他）  solo: 獨立計番（花糊類）
   日麻專用 — closed: 門清限定  kui: 副露減一飜  dora: 寶牌（唔算役）  ym: 役滿（可以疊）
   g: 分組 */
const CHIPS={
  hk:[
    {n:'自摸',v:1,auto:'tsumo',g:'基本'},
    {n:'門前清',v:1,g:'基本'},
    {n:'平糊',v:1,g:'基本',x:['對對糊','花么九','紅中','發財','白板','門風','圈風','小三元','大三元','小四喜','坎坎糊']},
    {n:'搶槓',v:1,only:'ron',g:'基本'},
    {n:'海底撈月',v:1,only:'tsumo',g:'基本'},
    {n:'槓上開花',v:1,only:'tsumo',g:'基本',x:['連槓開花','海底撈月']},
    {n:'紅中',v:1,g:'番子（刻子／槓）'},
    {n:'發財',v:1,g:'番子（刻子／槓）'},
    {n:'白板',v:1,g:'番子（刻子／槓）'},
    {n:'門風',v:1,g:'番子（刻子／槓）',wind:'seat'},
    {n:'圈風',v:1,g:'番子（刻子／槓）',wind:'round'},
    {n:'無花',v:1,g:'花',x:['正花','一台花']},
    {n:'正花',v:1,max:2,g:'花'},
    {n:'一台花',v:2,max:1,g:'花'},
    {n:'對對糊',v:3,g:'牌型'},
    {n:'花么九',v:1,req:['對對糊'],g:'牌型',x:['清一色']},
    {n:'混一色',v:3,g:'牌型',x:['清一色','小四喜']},
    {n:'小三元',v:5,g:'牌型',x:['大三元','紅中','發財','白板']},
    {n:'小四喜',v:6,g:'牌型',x:['清一色']},
    {n:'清一色',v:7,g:'牌型'},
    {n:'大三元',v:8,g:'牌型',x:['紅中','發財','白板']},
    {n:'坎坎糊',v:8,only:'tsumo',g:'牌型',x:['對對糊','門前清']},
    {n:'連槓開花',v:8,only:'tsumo',g:'牌型',x:['海底撈月']},
    {n:'花糊',v:3,solo:true,only:'tsumo',g:'花糊'},
    {n:'大花糊',v:8,solo:true,only:'tsumo',g:'花糊'},
    {n:'字一色',v:10,limit:true,g:'例牌'},
    {n:'清么九',v:10,limit:true,g:'例牌'},
    {n:'九子連環',v:10,limit:true,g:'例牌'},
    {n:'十三么',v:13,limit:true,g:'例牌'},
    {n:'大四喜',v:13,limit:true,g:'例牌'},
    {n:'十八羅漢',v:13,limit:true,g:'例牌'},
    {n:'天糊',v:13,limit:true,only:'tsumo',dealer:true,g:'例牌'},
    {n:'地糊',v:13,limit:true,only:'ron',dealer:false,fromDealer:true,g:'例牌'},
    {n:'人糊',v:13,limit:true,only:'tsumo',dealer:false,g:'例牌'}
  ],
  tw:[
    {n:'自摸',v:1,auto:'tsumo',g:'基本'},
    {n:'門清',v:1,g:'基本',x:['全求人','半求人']},
    {n:'不求人',v:1,auto:'menqing',g:'基本'},
    {n:'獨聽',v:1,g:'基本',x:['平胡']},
    {n:'半求人',v:1,only:'tsumo',g:'基本',x:['全求人']},
    {n:'全求人',v:2,only:'ron',g:'基本'},
    {n:'搶槓',v:1,only:'ron',g:'基本'},
    {n:'河底撈魚',v:1,only:'ron',g:'基本'},
    {n:'槓上開花',v:1,only:'tsumo',g:'基本',x:['海底撈月']},
    {n:'海底撈月',v:1,only:'tsumo',g:'基本'},
    {n:'三元牌',v:1,max:3,g:'字牌刻子',x:['平胡','小三元','大三元']},
    {n:'圈風',v:1,g:'字牌刻子',wind:'round',x:['平胡']},
    {n:'門風',v:1,g:'字牌刻子',wind:'seat',x:['平胡']},
    {n:'正花',v:1,max:2,g:'花',x:['平胡','八仙過海','七搶一']},
    {n:'花槓',v:2,max:2,g:'花',x:['平胡','八仙過海','七搶一']},
    {n:'八仙過海',v:8,only:'tsumo',g:'花',x:['平胡']},
    {n:'七搶一',v:8,only:'ron',g:'花',x:['平胡']},
    {n:'平胡',v:2,only:'ron',g:'牌型',x:['碰碰胡','三暗刻','四暗刻','五暗刻','混一色','字一色','小三元','大三元','小四喜','大四喜']},
    {n:'三暗刻',v:2,g:'牌型',x:['四暗刻','五暗刻']},
    {n:'碰碰胡',v:4,g:'牌型'},
    {n:'混一色',v:4,g:'牌型',x:['清一色','字一色']},
    {n:'小三元',v:4,g:'牌型',x:['大三元']},
    {n:'四暗刻',v:5,g:'牌型',x:['五暗刻']},
    {n:'五暗刻',v:8,g:'牌型'},
    {n:'清一色',v:8,g:'牌型',x:['字一色']},
    {n:'大三元',v:8,g:'牌型'},
    {n:'小四喜',v:8,g:'牌型',x:['大四喜']},
    {n:'字一色',v:16,g:'牌型'},
    {n:'大四喜',v:16,g:'牌型'},
    {n:'天胡',v:16,limit:true,only:'tsumo',dealer:true,g:'特殊'},
    {n:'地胡',v:16,limit:true,only:'tsumo',dealer:false,g:'特殊'},
    {n:'人胡',v:16,limit:true,only:'ron',dealer:false,g:'特殊'}
  ],
  jp:[
    {n:'立直',v:1,closed:true,g:'一飜',x:['雙立直']},
    {n:'一發',v:1,closed:true,reqAny:['立直','雙立直'],g:'一飜'},
    {n:'門前清自摸',v:1,closed:true,only:'tsumo',g:'一飜'},
    {n:'斷么九',v:1,g:'一飜',x:['役牌','混全帶么九','純全帶么九','混老頭','小三元']},
    {n:'平和',v:1,closed:true,g:'一飜',x:['役牌','對對和','七對子','三暗刻','三色同刻','三槓子','小三元','混老頭']},
    {n:'一盃口',v:1,closed:true,g:'一飜',x:['二盃口','七對子']},
    {n:'役牌',v:1,max:4,g:'一飜',x:['七對子']},
    {n:'搶槓',v:1,only:'ron',g:'一飜'},
    {n:'河底撈魚',v:1,only:'ron',g:'一飜',x:['搶槓']},
    {n:'嶺上開花',v:1,only:'tsumo',g:'一飜',x:['海底摸月']},
    {n:'海底摸月',v:1,only:'tsumo',g:'一飜'},
    {n:'雙立直',v:2,closed:true,g:'二飜'},
    {n:'七對子',v:2,closed:true,g:'二飜',x:['對對和','三色同順','一氣通貫','三暗刻','三色同刻','三槓子','混全帶么九','純全帶么九','小三元','二盃口']},
    {n:'三色同順',v:2,kui:true,g:'二飜',x:['三色同刻','一氣通貫','對對和']},
    {n:'一氣通貫',v:2,kui:true,g:'二飜',x:['三色同刻','對對和','混全帶么九','純全帶么九']},
    {n:'混全帶么九',v:2,kui:true,g:'二飜',x:['純全帶么九','混老頭']},
    {n:'對對和',v:2,g:'二飜'},
    {n:'三暗刻',v:2,g:'二飜'},
    {n:'三色同刻',v:2,g:'二飜'},
    {n:'三槓子',v:2,g:'二飜'},
    {n:'小三元',v:2,g:'二飜'},
    {n:'混老頭',v:2,g:'二飜',x:['純全帶么九']},
    {n:'純全帶么九',v:3,kui:true,g:'三飜以上'},
    {n:'二盃口',v:3,closed:true,g:'三飜以上'},
    {n:'混一色',v:3,kui:true,g:'三飜以上',x:['清一色']},
    {n:'清一色',v:6,kui:true,g:'三飜以上'},
    {n:'寶牌',v:1,max:12,dora:true,g:'寶牌（唔算役）'},
    {n:'赤寶牌',v:1,max:3,dora:true,g:'寶牌（唔算役）'},
    {n:'裏寶牌',v:1,max:12,dora:true,reqAny:['立直','雙立直'],g:'寶牌（唔算役）'},
    {n:'國士無雙',v:13,ym:true,closed:true,g:'役滿',x:['四暗刻','大三元','字一色','綠一色','清老頭','小四喜','大四喜','四槓子','九蓮寶燈']},
    {n:'四暗刻',v:13,ym:true,closed:true,g:'役滿',x:['九蓮寶燈']},
    {n:'大三元',v:13,ym:true,g:'役滿',x:['綠一色','清老頭','小四喜','大四喜','九蓮寶燈']},
    {n:'字一色',v:13,ym:true,g:'役滿',x:['綠一色','清老頭','九蓮寶燈']},
    {n:'綠一色',v:13,ym:true,g:'役滿',x:['清老頭','小四喜','大四喜','九蓮寶燈']},
    {n:'清老頭',v:13,ym:true,g:'役滿',x:['小四喜','大四喜','九蓮寶燈']},
    {n:'小四喜',v:13,ym:true,g:'役滿',x:['大四喜','九蓮寶燈']},
    {n:'大四喜',v:13,ym:true,g:'役滿',x:['九蓮寶燈']},
    {n:'四槓子',v:13,ym:true,g:'役滿',x:['九蓮寶燈']},
    {n:'九蓮寶燈',v:13,ym:true,closed:true,g:'役滿'},
    {n:'天和',v:13,ym:true,closed:true,only:'tsumo',dealer:true,g:'役滿',x:['地和']},
    {n:'地和',v:13,ym:true,closed:true,only:'tsumo',dealer:false,g:'役滿'}
  ]
};
const FU=[30,40,50,60,70,80,90,100,110];
const UMA={'0':[0,0,0,0],'5-10':[10,5,-5,-10],'10-20':[20,10,-10,-20],'10-30':[30,10,-10,-30],'20-30':[30,20,-20,-30]};
const DEFAULT_SETTINGS={
  hk:{minFan:3,maxFan:10,spice:'banla',payRule:'full',drawStay:false,qiangBao:true,multi:false,zhaPen:'full'},
  tw:{di:5,tai:1,drawStay:true,zhaTai:8},
  jp:{start:25000,honbaPts:300,kiriage:false,tobi:true,kaeshi:30000,uma:'10-20'}
};
// 流局連唔連莊（香港預設過莊，台灣預設連莊，日麻睇聽牌）
function drawStays(m,st){return m==='tw'?st.drawStay!==false:st.drawStay===true}

function hkValue(f,st){
  f=Math.min(f,st.maxFan);
  if(f<=4||st.spice==='lala') return Math.pow(2,f);
  const e=f%2===0?f:f-1, ve=16*Math.pow(2,(e-4)/2);
  return f%2===0?ve:ve*1.5;
}
function jpBasic(han,fu,st){
  if(han>=13) return [8000,'累計役滿'];
  if(han>=11) return [6000,'三倍滿'];
  if(han>=8) return [4000,'倍滿'];
  if(han>=6) return [3000,'跳滿'];
  if(han>=5) return [2000,'滿貫'];
  const b=fu*Math.pow(2,han+2);
  if(b>=2000) return [2000,'滿貫'];
  if(st.kiriage&&b===1920) return [2000,'切上滿貫'];
  return [b,`${fu}符 ${han}飜`];
}

/* g = 牌局狀態；d = 今鋪輸入；name(seat) 返回名 */
function computeHand(g,d,name){
  const m=g.mode, M=MODES[m], st=g.settings[m];
  const deltas=[0,0,0,0]; let pot=g.pot||0;
  if(d.type==='draw'){
    if(m==='jp'){
      d.riichi.forEach(p=>{deltas[p]-=1000;pot+=1000});
      const t=d.tenpai.length;
      if(t>0&&t<4) for(let i=0;i<4;i++) deltas[i]+=d.tenpai.includes(i)?3000/t:-3000/(4-t);
      return {ok:true,deltas,label:'流局',pot,stay:d.tenpai.includes(g.dealer),win:false};
    }
    return {ok:true,deltas,label:'流局',pot,stay:drawStays(m,st),win:false};
  }
  if(d.type==='zha'){
    const z=d.zha; if(z==null) return {ok:false,msg:`揀邊個${M.zha}`};
    const fine=(p,a)=>{deltas[z]-=a;deltas[p]+=a};
    const others=[0,1,2,3].filter(i=>i!==z);
    if(m==='hk'){ const V=hkValue(st.maxFan,st); others.forEach(p=>fine(p,st.zhaPen==='half'?V/2:V)); }
    if(m==='tw'){ others.forEach(p=>fine(p,st.di+st.zhaTai*st.tai)); }
    if(m==='jp'){ others.forEach(p=>fine(p,(z===g.dealer||p===g.dealer)?4000:2000)); }
    return {ok:true,deltas,label:`${name(z)} ${M.zha}`,pot,noAdvance:true,win:false};
  }
  const w=d.winner;
  if(!d.method) return {ok:false,msg:`揀${M.tsumo}定邊個${M.ron}`};
  if(d.method==='ron'&&d.from==null) return {ok:false,msg:`揀邊個${M.ron}`};
  const others=[0,1,2,3].filter(i=>i!==w);
  const pay=(p,a)=>{deltas[p]-=a;deltas[w]+=a};
  const how=d.method==='tsumo'?M.tsumo:`${name(d.from)} ${M.ron}`;
  let label;
  if(m==='hk'){
    if(d.fan<st.minFan) return {ok:false,msg:`未夠 ${st.minFan} 番起糊`};
    const f=Math.min(d.fan,st.maxFan), V=hkValue(f,st);
    const qiang=d.method==='ron'&&(d.sel||{})['搶槓']>0&&st.qiangBao!==false;
    if(d.method==='tsumo'){
      if(d.bao!=null) pay(d.bao,V*1.5); else others.forEach(p=>pay(p,V/2));
    }else if(qiang) pay(d.from,V*1.5);
    else if(st.payRule==='full') pay(d.from,V);
    else others.forEach(p=>pay(p,p===d.from?V/2:V/4));
    label=`${f}番${d.fan>st.maxFan?'（爆棚）':''} · ${how}${qiang?' · 搶槓包自摸':''}${d.bao!=null&&d.method==='tsumo'?` · ${name(d.bao)}包`:''}`;
  }
  if(m==='tw'){
    const lz=1+2*(g.repeat||0);
    const amt=p=>st.di+d.fan*st.tai+((w===g.dealer||p===g.dealer)?lz*st.tai:0);
    if(d.method==='tsumo') others.forEach(p=>pay(p,amt(p))); else pay(d.from,amt(d.from));
    label=`${d.fan}台 · ${how}`;
  }
  if(m==='jp'){
    if(!d.ym&&!d.hasYaku) return {ok:false,msg:'冇役唔可以和（寶牌唔算役）'};
    let b,nm;
    if(d.ym){ b=8000*d.ym; nm=d.ym>1?`${d.ym}倍役滿`:'役滿'; }
    else [b,nm]=jpBasic(d.fan,d.fu,st);
    const up=x=>Math.ceil(x/100)*100;
    const dw=w===g.dealer, hb=(g.honba||0)*st.honbaPts;
    if(d.method==='ron') pay(d.from,up(b*(dw?6:4))+hb);
    else others.forEach(p=>pay(p,up(b*((dw||p===g.dealer)?2:1))+hb/3));
    d.riichi.forEach(p=>{deltas[p]-=1000;pot+=1000});
    deltas[w]+=pot; pot=0;
    label=`${nm} · ${how}${d.open?' · 副露':''}`;
  }
  return {ok:true,deltas,label,pot,stay:w===g.dealer,win:true};
}
