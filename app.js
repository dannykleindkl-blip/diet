/* מאזן v2.1 – with robust iOS Shortcut deep-link handler */
let DB={},GOAL={cal:1600,deficit:500,weight:'',height:'',age:'',sex:'m',activity:1.375};
let curD=today(),calY,calM;

function today(){return new Date().toISOString().slice(0,10);}
function dd(d){if(!DB[d])DB[d]={foods:[],health:{},weight:null,notes:''};return DB[d];}
function persist(){try{localStorage.setItem('mz4_db',JSON.stringify(DB));}catch(e){}}
function r(x){return Math.round(x);}

const HE_MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HE_DAYS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const HE_DAYS_F=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
function fmtDate(ds){const d=new Date(ds+'T12:00:00');return HE_DAYS_F[d.getDay()]+', '+d.getDate()+' '+HE_MONTHS[d.getMonth()];}

/* ══════════════════════════════════════════════
   iOS SHORTCUT DEEP-LINK HANDLER
   Reads URL params, saves to localStorage,
   updates UI, navigates to log tab.
   Works on install as PWA from Safari.
   ══════════════════════════════════════════════ */
function handleURLParams(){
  // Support both window.location.search and hash-based routing
  let search = window.location.search;

  // PWA on iOS sometimes strips the query — check the full href too
  if(!search || search === '?'){
    const href = window.location.href;
    const qi = href.indexOf('?');
    if(qi !== -1) search = href.slice(qi);
  }

  const p = new URLSearchParams(search);

  // Debug: log what we received (visible in Safari console)
  console.log('[מאזן] URL params received:', search);
  console.log('[מאזן] Parsed params:', Object.fromEntries(p.entries()));

  // Require at least one recognised param
  const hasData = p.has('steps') || p.has('actcal') || p.has('swimmin') || p.has('date');
  if(!hasData) return;

  // Resolve date — support both YYYY-MM-DD and TEST keyword
  let date = p.get('date') || today();
  if(date === 'TEST' || date === 'test') date = today();

  // Validate date format
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today();

  // Write health data
  const h = dd(date).health;
  if(p.has('steps'))    h.steps    = parseInt(p.get('steps'))       || 0;
  if(p.has('walkdist')) h.walkDist = parseFloat(p.get('walkdist'))  || 0;
  if(p.has('swimmin'))  h.swimMin  = parseInt(p.get('swimmin'))     || 0;
  if(p.has('swimdist')) h.swimDist = parseInt(p.get('swimdist'))    || 0;
  if(p.has('actcal'))   h.actCal   = parseInt(p.get('actcal'))      || 0;

  // Persist immediately
  persist();

  // Set current date to the received date
  curD = date;

  // Clean URL — remove query string without reloading
  try {
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch(e){}

  // Navigate to log tab (tab 0) and update UI
  const logBtn = document.querySelector('[data-tab="0"]');
  goTab(0, logBtn);
  updateDateLabels();
  renderLog();

  // Show confirmation toast
  const isTest = (p.get('date')||'').toUpperCase() === 'TEST';
  const msg = isTest
    ? '🧪 TEST: נתוני קיצור נשמרו ל-' + fmtDate(date)
    : '✅ נתוני Apple Watch נשמרו ל-' + fmtDate(date);
  showToast(msg);

  console.log('[מאזן] Saved health data for', date, h);
}

function showToast(msg){
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = [
      'position:fixed','top:24px','left:50%','transform:translateX(-50%)',
      'background:#1a1916','color:#fff','padding:12px 20px',
      'border-radius:99px','font-size:14px','font-family:Heebo,sans-serif',
      'z-index:9999','transition:opacity .4s','white-space:nowrap',
      'pointer-events:none','box-shadow:0 4px 16px rgba(0,0,0,.2)'
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.style.opacity='0'; }, 4000);
}

/* ══ Storage ══ */
function load(){
  try{DB=JSON.parse(localStorage.getItem('mz4_db')||'{}');}catch(e){DB={};}
  try{Object.assign(GOAL,JSON.parse(localStorage.getItem('mz4_goal')||'{}'));}catch(e){}
  ['cal','deficit','weight','height','age'].forEach(k=>{
    const el=document.getElementById('g-'+k);if(el&&GOAL[k])el.value=GOAL[k];
  });
  const gs=document.getElementById('g-sex');if(gs)gs.value=GOAL.sex||'m';
  const ga=document.getElementById('g-activity');if(ga)ga.value=GOAL.activity||1.375;
  const n=new Date();calY=n.getFullYear();calM=n.getMonth();

  // Handle URL params FIRST (before rendering)
  handleURLParams();

  updateDateLabels();
  renderLog();
}

function saveGoal(){
  GOAL.cal=parseInt(document.getElementById('g-cal').value)||1600;
  GOAL.deficit=parseInt(document.getElementById('g-deficit').value)||500;
  GOAL.weight=document.getElementById('g-weight').value;
  GOAL.height=document.getElementById('g-height').value;
  GOAL.age=document.getElementById('g-age').value;
  GOAL.sex=document.getElementById('g-sex').value;
  GOAL.activity=parseFloat(document.getElementById('g-activity').value)||1.375;
  try{localStorage.setItem('mz4_goal',JSON.stringify(GOAL));}catch(e){}
  renderLog();alert('ההגדרות נשמרו ✓');
}

/* ══ Calorie calc ══ */
function dayCalc(d){
  const day=dd(d);
  const inn=(day.foods||[]).reduce((s,f)=>s+(f.cal||0),0);
  const h=day.health||{};
  const stepCal=r((h.steps||0)*0.04);
  const swimCal=r((h.swimMin||0)*8);
  const actCal=h.actCal||0;
  const totalOut=actCal>0?actCal+swimCal:stepCal+swimCal;
  return{inn,totalOut,net:inn-totalOut,stepCal,swimCal,actCal};
}

/* ══ Hebrew food DB ══ */
const FOOD_DB=[
  {k:['ביצה','ביצים'],cal:75},{k:['חביתה'],cal:180},{k:['שקשוקה'],cal:320},
  {k:['גבינה לבנה'],cal:100},{k:['גבינה צהובה'],cal:280},{k:['קוטג'],cal:85},
  {k:['יוגורט יווני','יוגורט'],cal:130},{k:['שיבולת שועל','דייסה'],cal:300},
  {k:['גרנולה'],cal:380},{k:['טוסט'],cal:130},{k:['לחם מלא','לחם'],cal:80},
  {k:['אבוקדו'],cal:160},{k:['חמאת בוטנים'],cal:190},{k:['דבש'],cal:60},
  {k:['בננה'],cal:105},{k:['תפוח'],cal:80},{k:['תפוז'],cal:60},
  {k:['ענבים'],cal:70},{k:['תות','תותים'],cal:50},{k:['מנגו'],cal:100},
  {k:['אבטיח'],cal:45},{k:['מלון'],cal:50},{k:['אגס'],cal:85},
  {k:['קפה שחור','אספרסו'],cal:5},{k:['קפה עם חלב','קפה לבן','קפה'],cal:50},
  {k:['תה'],cal:5},{k:['מיץ'],cal:110},{k:['חלב'],cal:120},
  {k:['עוף','חזה עוף','שוק עוף'],cal:220},{k:['סטייק','בקר'],cal:350},
  {k:['המבורגר'],cal:450},{k:['דג','סלמון'],cal:200},{k:['טונה'],cal:150},
  {k:['שניצל'],cal:380},{k:['פלאפל'],cal:350},{k:['שווארמה'],cal:450},
  {k:['פיצה'],cal:280},{k:['פסטה','ספגטי'],cal:350},{k:['אורז'],cal:200},
  {k:['קינואה'],cal:180},{k:['תפוח אדמה'],cal:160},{k:['בטטה'],cal:130},
  {k:['עדשים'],cal:230},{k:['חומוס'],cal:200},{k:['סלט'],cal:80},
  {k:['מרק עוף'],cal:120},{k:['מרק'],cal:100},{k:['שקד'],cal:580},
  {k:['אגוזים','אגוז'],cal:650},{k:['גרעינים'],cal:500},{k:['שוקולד'],cal:250},
  {k:['עוגה'],cal:300},{k:['קרקר'],cal:130},{k:['חטיף'],cal:280},
  {k:['פופקורן'],cal:150},{k:['גלידה'],cal:200},{k:['תמרים'],cal:280},
  {k:['מים'],cal:0},{k:['בירה'],cal:150},{k:['יין'],cal:125},
  {k:['קולה','ספרייט','סודה'],cal:140}
];

function estimateCal(text){
  if(!text)return 0;
  let total=0,matched=false;
  FOOD_DB.forEach(item=>{
    item.k.forEach(kw=>{
      if(text.includes(kw)){
        const re=new RegExp('(\\d+)\\s*(?:יח|כוס|פרוסות?|מנות?)?\\s*'+kw,'i');
        const m=text.match(re);
        const qty=m?Math.min(parseInt(m[1]),5):1;
        total+=item.cal*qty;matched=true;
      }
    });
  });
  return matched?total:0;
}

/* ══ Date nav ══ */
function updateDateLabels(){
  const isT=curD===today();
  const d=new Date(curD+'T12:00:00');
  const lbl=isT?'היום':HE_DAYS_F[d.getDay()]+', '+d.getDate()+' '+HE_MONTHS[d.getMonth()];
  const mhd=document.getElementById('mh-date');
  const ddbl=document.getElementById('ddb-label');
  if(mhd)mhd.textContent=lbl+' ›';
  if(ddbl)ddbl.textContent=lbl;
}
function shiftDay(delta){const d=new Date(curD+'T12:00:00');d.setDate(d.getDate()+delta);curD=d.toISOString().slice(0,10);updateDateLabels();renderLog();}
function jumpToday(){curD=today();updateDateLabels();renderLog();}
function setDate(){curD=document.getElementById('date-inp').value;closeOv('ov-date');updateDateLabels();renderLog();}

/* ══ Render log ══ */
function renderLog(){
  const{inn,totalOut,net}=dayCalc(curD);
  const goalCal=GOAL.cal;
  const pct=Math.min(1,inn/goalCal);
  const circ=263.9;
  const arc=document.getElementById('ring-arc');
  if(arc){arc.style.strokeDashoffset=circ*(1-pct);arc.style.stroke=inn>goalCal?'#c0392b':inn>goalCal*0.88?'#9a6700':'#2d6a2d';}
  const rv=document.getElementById('ring-val');if(rv)rv.textContent=r(inn);
  const hs=document.getElementById('hero-stats');
  if(hs)hs.innerHTML=`
    <div class="stat-row"><span class="stat-label">נשרף</span><span class="stat-val g">−${r(totalOut)}</span></div>
    <div class="stat-row"><span class="stat-label">מאזן</span><span class="stat-val ${net>200?'r':net<-50?'g':'a'}">${net>=0?'+':''}${r(net)}</span></div>
    <div class="stat-row"><span class="stat-label">יעד</span><span class="stat-val">${goalCal} קק"ל</span></div>`;
  const deficit=totalOut-inn;
  const db=document.getElementById('deficit-banner');
  if(db&&(inn>0||totalOut>0)){
    let cls,txt;
    if(deficit>=GOAL.deficit){cls='good';txt='✅ גרעון '+r(deficit)+' קק"ל — בקצב הזה תוריד כ-'+(deficit*7/7700).toFixed(2)+' ק"ג בשבוע';}
    else if(deficit>0){cls='warn';txt='⚡ גרעון '+r(deficit)+' קק"ל — חסרים עוד '+r(GOAL.deficit-deficit)+' קק"ל ליעד';}
    else{cls='bad';txt='⚠️ עודף '+r(-deficit)+' קק"ל — הגבר פעילות או הפחת צריכה';}
    db.innerHTML='<div class="def-banner '+cls+'">'+txt+'</div>';
  }else if(db)db.innerHTML='';
  renderActivityCards();
  const wi=document.getElementById('weight-input');if(wi)wi.value=dd(curD).weight||'';
  const fl=document.getElementById('food-list');
  if(fl){
    const foods=dd(curD).foods;
    fl.innerHTML=foods.length?foods.map((f,i)=>`
      <div class="item">
        <div class="item-dot food"></div>
        <div class="item-body"><div class="item-name">${f.text||f.name}</div><div class="item-sub">${f.meal}</div></div>
        <div class="item-cal">${f.cal} קק"ל</div>
        <button class="item-del" onclick="rmFood(${i})">×</button>
      </div>`).join(''):'<div class="empty-note">לא נוספו ארוחות עדיין</div>';
  }
}

function renderActivityCards(){
  const h=dd(curD).health||{};
  function setCard(id,val,suffix,set){
    const el=document.getElementById(id);if(!el)return;
    el.textContent=set?val+suffix:'הזן';
    el.className='hc-val'+(set?' set':'');
  }
  setCard('hc-steps',   h.steps    ?r(h.steps).toLocaleString():'','  צעד',!!h.steps);
  setCard('hc-walkdist',h.walkDist ?Number(h.walkDist).toFixed(1):'','  ק"מ',!!h.walkDist);
  setCard('hc-swimmin', h.swimMin  ?r(h.swimMin):'','  דק\'',!!h.swimMin);
  setCard('hc-swimdist',h.swimDist ?r(h.swimDist):'','  מ\'',!!h.swimDist);
  setCard('hc-actcal',  h.actCal   ?r(h.actCal):'','  קק"ל',!!h.actCal);
}

/* ══ Food ══ */
function addFood(){
  const txt=document.getElementById('f-text').value.trim();
  const meal=document.getElementById('f-meal').value;
  if(!txt)return;
  const calEl=document.getElementById('f-cal');
  const manCal=parseInt(calEl.value)||0;
  const estCal=estimateCal(txt);
  const cal=manCal>0?manCal:estCal;
  if(cal===0){calEl.focus();calEl.style.borderColor='#c0392b';calEl.placeholder='לא זוהה — הזן ידנית';return;}
  calEl.style.borderColor='';
  dd(curD).foods.push({text:txt,cal,meal});
  persist();renderLog();closeOv('ov-food');
  document.getElementById('f-text').value='';document.getElementById('f-cal').value='';
}
function autoEstimate(){
  const txt=document.getElementById('f-text').value.trim();
  const cal=estimateCal(txt);
  const el=document.getElementById('f-cal');
  if(cal>0){el.value=cal;el.style.borderColor='';}
  else{el.value='';el.placeholder='לא זוהה — הזן ידנית';}
}
function rmFood(i){dd(curD).foods.splice(i,1);persist();renderLog();}

/* ══ Weight ══ */
function saveWeight(){
  const v=parseFloat(document.getElementById('weight-input').value);
  if(!isNaN(v)&&v>0){dd(curD).weight=v;persist();showToast('⚖️ משקל נשמר: '+v+' ק"ג');}
}

/* ══ Health manual entry ══ */
function saveSteps()   {const v=parseInt(document.getElementById('h-steps').value)||0;    dd(curD).health.steps   =v;persist();renderLog();closeOv('ov-steps');}
function saveWalkDist(){const v=parseFloat(document.getElementById('h-walkdist').value)||0;dd(curD).health.walkDist=v;persist();renderLog();closeOv('ov-walkdist');}
function saveSwim(){
  const min=parseInt(document.getElementById('h-swim-min').value)||0;
  const dist=parseInt(document.getElementById('h-swim-dist').value)||0;
  dd(curD).health.swimMin=min;dd(curD).health.swimDist=dist;
  persist();renderLog();closeOv('ov-swim');
}
function saveActCal()  {const v=parseInt(document.getElementById('h-actcal').value)||0;   dd(curD).health.actCal  =v;persist();renderLog();closeOv('ov-actcal');}

/* ══ Calendar ══ */
function renderCal(){
  document.getElementById('cal-title').textContent=HE_MONTHS[calM]+' '+calY;
  const wc=document.getElementById('week-chart');
  if(wc){
    const days7=[];
    for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days7.push(d.toISOString().slice(0,10));}
    const maxV=Math.max(1,...days7.map(d=>{const c=dayCalc(d);return Math.max(c.inn,c.totalOut);}));
    wc.innerHTML=days7.map(d=>{
      const{inn,totalOut}=dayCalc(d);
      const inH=r((inn/maxV)*62),outH=r((totalOut/maxV)*62);
      const dl=new Date(d+'T12:00:00');
      return`<div class="wbar-wrap"><div class="wbar-cols"><div class="wbar in" style="height:${inH||2}px"></div><div class="wbar out" style="height:${outH||2}px"></div></div><div class="wbar-lbl">${HE_DAYS[dl.getDay()]}</div></div>`;
    }).join('');
  }
  const wt=document.getElementById('weight-trend');
  if(wt){
    const days14=[];
    for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days14.push(d.toISOString().slice(0,10));}
    const wpts=days14.map(d=>({d,w:DB[d]?.weight||null})).filter(x=>x.w);
    if(wpts.length>=2){
      const minW=Math.min(...wpts.map(x=>x.w))-0.5,maxW=Math.max(...wpts.map(x=>x.w))+0.5,range=maxW-minW||1;
      const pts=wpts.map((x,i)=>{const px=r((i/(wpts.length-1))*200),py=r(60-((x.w-minW)/range)*50);return px+','+py;}).join(' ');
      wt.innerHTML=`<div class="ws-title">מגמת משקל (14 יום)</div>
        <svg viewBox="0 0 200 70" style="width:100%;height:70px">
          <polyline points="${pts}" fill="none" stroke="#2d6a2d" stroke-width="2" stroke-linejoin="round"/>
          ${wpts.map((x,i)=>{const px=r((i/(wpts.length-1))*200),py=r(60-((x.w-minW)/range)*50);return`<circle cx="${px}" cy="${py}" r="3" fill="#2d6a2d"/><text x="${px}" y="${py-6}" font-size="8" fill="#8a8780" text-anchor="middle">${x.w}</text>`;}).join('')}
        </svg>`;
    }else{wt.innerHTML='<div class="ws-title">מגמת משקל</div><div class="empty-note">הזן משקל לפחות יומיים לראות מגמה</div>';}
  }
  const dh=document.getElementById('cal-dh'),cg=document.getElementById('cal-days');
  if(!dh||!cg)return;
  dh.innerHTML=HE_DAYS.map(d=>`<div class="cdh">${d}</div>`).join('');
  cg.innerHTML='';
  const first=new Date(calY,calM,1).getDay(),daysInM=new Date(calY,calM+1,0).getDate(),td=today();
  for(let i=0;i<first;i++){const pd=new Date(calY,calM,0-first+i+1);cg.innerHTML+=`<div class="cd other"><div class="cd-num">${pd.getDate()}</div></div>`;}
  for(let d=1;d<=daysInM;d++){
    const ds=`${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const{inn,totalOut,net}=dayCalc(ds);
    const hasData=DB[ds]&&((DB[ds].foods||[]).length||Object.keys(DB[ds].health||{}).length);
    const w=DB[ds]?.weight;
    cg.innerHTML+=`<div class="cd${ds===td?' today':''}${ds===curD?' sel':''}" onclick="calPickDay('${ds}')">
      <div class="cd-num">${d}</div>
      ${hasData?`<div class="cd-net ${net<-80?'ok':net>250?'hi':'lo'}">${net>=0?'+':''}${r(net)}</div>`:''}
      ${w?`<div class="cd-weight">${w}</div>`:''}
      ${hasData?'<div class="cd-dot"></div>':''}
    </div>`;
  }
  renderCalDetail();
}
function calPickDay(ds){curD=ds;updateDateLabels();renderCalDetail();renderLog();}
function renderCalDetail(){
  const panel=document.getElementById('cal-detail-panel');if(!panel)return;
  const{inn,totalOut}=dayCalc(curD);
  const day=dd(curD),h=day.health||{};
  const hasData=DB[curD]&&((day.foods||[]).length||Object.keys(h).length);
  if(!hasData&&!day.weight){panel.innerHTML='';return;}
  const deficit=totalOut-inn;
  panel.innerHTML=`<div class="detail-card"><h3>${fmtDate(curD)}</h3>
    ${day.weight?`<div class="stat-row"><span class="stat-label">⚖️ משקל</span><span class="stat-val">${day.weight} ק"ג</span></div>`:''}
    <div class="stat-row"><span class="stat-label">🍽️ נכנס</span><span class="stat-val">${r(inn)} קק"ל</span></div>
    <div class="stat-row"><span class="stat-label">🔥 נשרף</span><span class="stat-val g">${r(totalOut)} קק"ל</span></div>
    <div class="stat-row"><span class="stat-label">⚡ גרעון</span><span class="stat-val ${deficit>=GOAL.deficit?'g':deficit<0?'r':'a'}">${deficit>=0?'+':''}${r(deficit)}</span></div>
    ${h.steps?`<div class="stat-row"><span class="stat-label">🚶 צעדים</span><span class="stat-val">${r(h.steps).toLocaleString()}</span></div>`:''}
    ${h.walkDist?`<div class="stat-row"><span class="stat-label">📍 הליכה</span><span class="stat-val">${h.walkDist} ק"מ</span></div>`:''}
    ${h.swimMin?`<div class="stat-row"><span class="stat-label">🏊 שחייה</span><span class="stat-val">${h.swimMin} דק' / ${h.swimDist||'?'} מ'</span></div>`:''}
  </div>`;
}
function prevM(){calM--;if(calM<0){calM=11;calY--;}renderCal();}
function nextM(){calM++;if(calM>11){calM=0;calY++;}renderCal();}

/* ══ Analysis ══ */
function renderAdv(){
  const days=Object.keys(DB).sort().slice(-30);
  const ac=document.getElementById('adv-main'),as=document.getElementById('adv-side'),atc=document.getElementById('adv-summary-cards');
  if(!ac)return;
  if(!days.length){ac.innerHTML='<div class="adv-card"><h3>אין עדיין נתונים</h3><p>הזן לפחות יום אחד.</p></div>';return;}
  const totals=days.map(d=>({d,...dayCalc(d)}));
  const avgIn=r(totals.reduce((s,t)=>s+t.inn,0)/totals.length);
  const avgOut=r(totals.reduce((s,t)=>s+t.totalOut,0)/totals.length);
  const avgDef=avgOut-avgIn;
  const weeklyLoss=(avgDef*7/7700).toFixed(2);
  const onTarget=totals.filter(t=>(t.totalOut-t.inn)>=GOAL.deficit).length;
  const weights=days.map(d=>DB[d]?.weight).filter(Boolean);
  const weightDiff=weights.length>=2?(weights[weights.length-1]-weights[0]).toFixed(1):null;
  if(atc)atc.innerHTML=`
    <div class="adv-metric"><div class="adv-metric-label">ממוצע יומי נכנס</div><div class="adv-metric-val" style="color:var(--blue)">${avgIn}</div></div>
    <div class="adv-metric"><div class="adv-metric-label">ממוצע יומי נשרף</div><div class="adv-metric-val" style="color:var(--green)">${avgOut}</div></div>
    <div class="adv-metric"><div class="adv-metric-label">גרעון ממוצע</div><div class="adv-metric-val" style="color:${avgDef>=GOAL.deficit?'var(--green)':'var(--amber)'}">${avgDef>=0?'+':''}${r(avgDef)}</div></div>
    <div class="adv-metric"><div class="adv-metric-label">${weightDiff?'שינוי משקל':'ירידה/שבוע'}</div><div class="adv-metric-val" style="color:var(--green-mid)">${weightDiff?(weightDiff>0?'+':'')+weightDiff+' ק"ג':weeklyLoss+' ק"ג'}</div></div>`;
  let mHtml=`<div class="adv-card ${avgDef>=GOAL.deficit?'highlight':''}">
    <h3>סיכום ${days.length} ימים <span class="adv-tag ${avgDef>0?'g':'r'}">${avgDef>=0?'גרעון':'עודף'}</span></h3>
    <p>${onTarget} מתוך ${days.length} ימים עמדת ביעד.<br>${avgDef>=GOAL.deficit?'בקצב זה תוריד כ-'+weeklyLoss+' ק"ג בשבוע!':'צריך לגדיל גרעון ב-'+r(GOAL.deficit-avgDef)+' קק"ל.'}</p></div>`;
  if(avgOut<300)mHtml+=`<div class="adv-card warn-card"><h3>הגדל פעילות <span class="adv-tag a">חשוב</span></h3><p>שריפה ממוצעת נמוכה. הוסף 30 דק' הליכה ביום.</p></div>`;
  mHtml+=`<div class="adv-card"><h3>📅 תוכנית ל-3 ימים</h3>
    <div class="plan-day"><h4>יום 1</h4><div class="plan-row">בוקר: ביצים + ירקות — 280 קק"ל</div><div class="plan-row">צהריים: עוף + קינואה — 480 קק"ל</div><div class="plan-row">ערב: דג + ירקות — 350 קק"ל</div></div>
    <div class="plan-day"><h4>יום 2</h4><div class="plan-row">בוקר: יוגורט יווני + פירות — 260 קק"ל</div><div class="plan-row">צהריים: סלט טונה + לחם מלא — 400 קק"ל</div><div class="plan-row">ערב: מרק עוף — 280 קק"ל</div></div>
    <div class="plan-day"><h4>יום 3</h4><div class="plan-row">בוקר: שיבולת שועל + בננה — 300 קק"ל</div><div class="plan-row">צהריים: עוף + אורז מלא — 500 קק"ל</div><div class="plan-row">ערב: חביתה + ירקות — 260 קק"ל</div></div>
  </div>`;
  ac.innerHTML=mHtml;
  if(as)as.innerHTML=`
    <div class="adv-card"><h3>💡 טיפים</h3><p>• 2–3 ליטר מים ביום<br>• 8,000+ צעדים = ~320 קק"ל<br>• שינה 7–8 שעות<br>• חלבון בכל ארוחה</p></div>
    <div class="adv-card"><h3>⌚ iOS Shortcut URL</h3>
      <p style="font-size:12px;margin-bottom:8px">העתק ל-"Open URL" בקיצור שלך:</p>
      <div class="shortcut-url">https://dannykleindkl-blip.github.io/diet/?date=[תאריך]&steps=[צעדים]&walkdist=[ק"מ]&actcal=[קל']&swimmin=[דק']&swimdist=[מ']</div>
    </div>`;
}

/* ══ Tabs ══ */
function goTab(i,btn){
  [0,1,2,3].forEach(j=>{const t=document.getElementById('t'+j);if(t)t.style.display=j===i?'block':'none';});
  document.querySelectorAll('.sb-btn,.mn-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('[data-tab="'+i+'"]').forEach(b=>b.classList.add('active'));
  if(i===1)renderCal();if(i===2)renderAdv();
}
function openOv(id){document.getElementById(id).classList.add('on');}
function closeOv(id){document.getElementById(id).classList.remove('on');}
function sp(e){e.stopPropagation();}

/* ══ Export ══ */
function exportCSV(){
  const rows=[['תאריך','משקל','אוכל קק"ל','נשרף קק"ל','גרעון','צעדים','הליכה ק"מ','שחייה דק"','שחייה מ"']];
  Object.keys(DB).sort().forEach(d=>{
    const{inn,totalOut}=dayCalc(d);const h=(DB[d]?.health)||{};
    rows.push([d,DB[d]?.weight||'',r(inn),r(totalOut),r(totalOut-inn),h.steps||'',h.walkDist||'',h.swimMin||'',h.swimDist||'']);
  });
  dlFile('\uFEFF'+rows.map(row=>row.join(',')).join('\n'),'mazan-export.csv','text/csv;charset=utf-8');
}
function exportJSON(){dlFile(JSON.stringify({db:DB,goal:GOAL},null,2),'mazan-backup.json','application/json');}
function dlFile(content,filename,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=filename;a.click();}
function clearAll(){if(confirm('למחוק את כל הנתונים?')){DB={};localStorage.removeItem('mz4_db');renderLog();alert('נמחק.');}}

load();
