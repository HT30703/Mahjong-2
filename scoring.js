/* 計分邏輯（以座位 0–3 計，返回每個座位嘅分數變化） */
const WINDS=['東','南','西','北'];
const MODES={
  hk:{name:'香港麻雀',unit:'番',win:'食糊',ron:'出銃',tsumo:'自摸'},
  tw:{name:'台灣麻將',unit:'台',win:'胡牌',ron:'放槍',tsumo:'自摸'},
  jp:{name:'日本麻雀',unit:'飜',win:'和了',ron:'放銃',tsumo:'自摸'}
};
/* 番種規則
   auto: 自動計（唔使揀）  only: 只限自摸 tsumo / 出銃 ron  dealer: true 只限莊家 / false 只限閒家
   fromDealer: 要食莊家出嘅牌  req: 要先有  x: 唔可以同時有  max: 可以疊幾次
   limit: 例牌（揀咗就唔再加其他）  solo: 獨立計番（花糊類，唔加其他、唔加自摸）  g: 分組 */
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
    {n:'自摸',v:1,auto:'tsumo'},
    {n:'門清',v:1,x:['全求人']},
    {n:'不求人',v:1,auto:'menqing'},
    {n:'三元牌',v:1,max:3,x:['平胡','小三元','大三元']},
    {n:'圈風',v:1,x:['平胡']},
    {n:'門風',v:1,x:['平胡']},
    {n:'正花',v:1,max:2,x:['平胡']},
    {n:'花槓',v:2,x:['平胡']},
    {n:'搶槓',v:1,only:'ron'},
    {n:'河底撈魚',v:1,only:'ron'},
    {n:'槓上開花',v:1,only:'tsumo'},
    {n:'海底撈月',v:1,only:'tsumo'},
    {n:'平胡',v:2,only:'ron',x:['碰碰胡','三暗刻','四暗刻','混一色']},
    {n:'全求人',v:2,only:'ron'},
    {n:'三暗刻',v:2,x:['四暗刻','五暗刻']},
    {n:'碰碰胡',v:4},
    {n:'混一色',v:4,x:['清一色','字一色']},
    {n:'小三元',v:4,x:['大三元']},
    {n:'四暗刻',v:5,x:['五暗刻']},
    {n:'五暗刻',v:8},
    {n:'清一色',v:8,x:['字一色']},
    {n:'大三元',v:8},
    {n:'小四喜',v:8,x:['大四喜']},
    {n:'字一色',v:16},
    {n:'大四喜',v:16},
    {n:'天胡',v:16,limit:true,only:'tsumo',dealer:true},
    {n:'地胡',v:16,limit:true,only:'tsumo',dealer:false}
  ],
  jp:[
    {n:'立直',v:1},
    {n:'一發',v:1,req:['立直']},
    {n:'門前清自摸',v:1,only:'tsumo'},
    {n:'斷么九',v:1},
    {n:'平和',v:1,x:['對對和','七對子','役牌']},
    {n:'役牌',v:1,max:4},
    {n:'一盃口',v:1,x:['七對子']},
    {n:'寶牌',v:1,max:8},
    {n:'搶槓',v:1,only:'ron'},
    {n:'河底撈魚',v:1,only:'ron'},
    {n:'嶺上開花',v:1,only:'tsumo'},
    {n:'海底摸月',v:1,only:'tsumo'},
    {n:'七對子',v:2,x:['對對和','三色同順','一氣通貫']},
    {n:'三色同順',v:2},
    {n:'一氣通貫',v:2},
    {n:'對對和',v:2},
    {n:'混一色',v:3,x:['清一色']},
    {n:'清一色',v:6},
    {n:'役滿',v:13,limit:true}
  ]
};
const FU=[30,40,50,60,70,80,90,100,110];
const DEFAULT_SETTINGS={
  hk:{minFan:3,maxFan:10,spice:'banla',payRule:'full'},
  tw:{di:5,tai:1},
  jp:{start:25000,honbaPts:300,kiriage:false}
};

function hkValue(f,st){
  f=Math.min(f,st.maxFan);
  if(f<=4||st.spice==='lala') return Math.pow(2,f);
  const e=f%2===0?f:f-1, ve=16*Math.pow(2,(e-4)/2);
  return f%2===0?ve:ve*1.5;
}
function jpBasic(han,fu,st){
  if(han>=13) return [8000,'役滿'];
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
    return {ok:true,deltas,label:'流局',pot,stay:true,win:false};
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
    if(d.method==='tsumo'){
      if(d.bao!=null) pay(d.bao,V*1.5); else others.forEach(p=>pay(p,V/2));
    }else if(st.payRule==='full') pay(d.from,V);
    else others.forEach(p=>pay(p,p===d.from?V/2:V/4));
    label=`${f}番${d.fan>st.maxFan?'（爆棚）':''} · ${how}${d.bao!=null&&d.method==='tsumo'?` · ${name(d.bao)}包`:''}`;
  }
  if(m==='tw'){
    const lz=1+2*(g.repeat||0);
    const amt=p=>st.di+d.fan*st.tai+((w===g.dealer||p===g.dealer)?lz*st.tai:0);
    if(d.method==='tsumo') others.forEach(p=>pay(p,amt(p))); else pay(d.from,amt(d.from));
    label=`${d.fan}台 · ${how}`;
  }
  if(m==='jp'){
    if(d.fan<1) return {ok:false,msg:'最少要 1 飜'};
    const [b,nm]=jpBasic(d.fan,d.fu,st), up=x=>Math.ceil(x/100)*100;
    const dw=w===g.dealer, hb=(g.honba||0)*st.honbaPts;
    if(d.method==='ron') pay(d.from,up(b*(dw?6:4))+hb);
    else others.forEach(p=>pay(p,up(b*((dw||p===g.dealer)?2:1))+hb/3));
    d.riichi.forEach(p=>{deltas[p]-=1000;pot+=1000});
    deltas[w]+=pot; pot=0;
    label=`${nm} · ${how}`;
  }
  return {ok:true,deltas,label,pot,stay:w===g.dealer,win:true};
}
