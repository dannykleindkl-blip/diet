/* ══════════════════════════════════════════
   מאזן – App Logic
   ══════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────
let DB = {}, GOAL = {
  cal: 1600, deficit: 500,
  weight: '', height: '', age: '', sex: 'm', activity: 1.375
};
let curD = today();
let calY, calM;

// ── Helpers ────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}
function dd(d) {
  if (!DB[d]) DB[d] = { foods: [], exercises: [], health: {}, notes: '' };
  return DB[d];
}
function dayCalc(d) {
  const day = dd(d);
  const inn = (day.foods || []).reduce((s, f) => s + f.cal, 0);
  const exOut = (day.exercises || []).reduce((s, e) => s + e.cal, 0);
  const h = day.health || {};
  const hOut = (h.activeCal || 0) + (h.swimCal || 0) + (h.gymCal || 0) + Math.round((h.steps || 0) * 0.04);
  const totalOut = exOut + hOut;
  return { inn, totalOut, net: inn - totalOut, exOut, hOut };
}
function persist() {
  try { localStorage.setItem('mz3_db', JSON.stringify(DB)); } catch (e) {}
}
function n(x) { return Math.round(x); }

// ── Hebrew labels ──────────────────────────────────────────────
const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HE_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const HE_DAYS_FULL = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function fmtDate(ds) {
  const d = new Date(ds + 'T12:00:00');
  return HE_DAYS_FULL[d.getDay()] + ', ' + d.getDate() + ' ' + HE_MONTHS[d.getMonth()];
}

// ── Storage ────────────────────────────────────────────────────
function load() {
  try { DB = JSON.parse(localStorage.getItem('mz3_db') || '{}'); } catch(e) { DB = {}; }
  try { Object.assign(GOAL, JSON.parse(localStorage.getItem('mz3_goal') || '{}')); } catch(e) {}
  // populate settings fields
  ['cal','deficit','weight','height','age'].forEach(k => {
    const el = document.getElementById('g-' + k);
    if (el && GOAL[k]) el.value = GOAL[k];
  });
  const gs = document.getElementById('g-sex'); if (gs) gs.value = GOAL.sex || 'm';
  const ga = document.getElementById('g-activity'); if (ga) ga.value = GOAL.activity || 1.375;
  const n = new Date(); calY = n.getFullYear(); calM = n.getMonth();
  updateDateLabels();
  renderLog();
}

function saveGoal() {
  GOAL.cal = parseInt(document.getElementById('g-cal').value) || 1600;
  GOAL.deficit = parseInt(document.getElementById('g-deficit').value) || 500;
  GOAL.weight = document.getElementById('g-weight').value;
  GOAL.height = document.getElementById('g-height').value;
  GOAL.age = document.getElementById('g-age').value;
  GOAL.sex = document.getElementById('g-sex').value;
  GOAL.activity = parseFloat(document.getElementById('g-activity').value) || 1.375;
  try { localStorage.setItem('mz3_goal', JSON.stringify(GOAL)); } catch(e) {}
  renderLog();
  alert('ההגדרות נשמרו ✓');
}

// ── Date navigation ────────────────────────────────────────────
function updateDateLabels() {
  const isT = curD === today();
  const d = new Date(curD + 'T12:00:00');
  const label = isT ? 'היום' : HE_DAYS_FULL[d.getDay()] + ', ' + d.getDate() + ' ' + HE_MONTHS[d.getMonth()];
  const mhDate = document.getElementById('mh-date');
  const ddbLabel = document.getElementById('ddb-label');
  if (mhDate) mhDate.textContent = label + ' ›';
  if (ddbLabel) ddbLabel.textContent = label;
}

function shiftDay(delta) {
  const d = new Date(curD + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  curD = d.toISOString().slice(0, 10);
  updateDateLabels();
  renderLog();
}
function jumpToday() {
  curD = today();
  updateDateLabels();
  renderLog();
}
function setDate() {
  curD = document.getElementById('date-inp').value;
  closeOv('ov-date');
  updateDateLabels();
  renderLog();
}

// ── Render Log ─────────────────────────────────────────────────
function renderLog() {
  const { inn, totalOut, net } = dayCalc(curD);
  const goalCal = GOAL.cal;
  const pct = Math.min(1, inn / goalCal);
  const circ = 263.9;

  // Ring
  const arc = document.getElementById('ring-arc');
  if (arc) {
    arc.style.strokeDashoffset = circ * (1 - pct);
    arc.style.stroke = inn > goalCal ? '#c0392b' : inn > goalCal * 0.88 ? '#9a6700' : '#2d6a2d';
  }
  const rv = document.getElementById('ring-val');
  if (rv) rv.textContent = n(inn);

  // Hero stats
  const hs = document.getElementById('hero-stats');
  if (hs) hs.innerHTML = `
    <div class="stat-row"><span class="stat-label">נשרף (כולל שעון)</span><span class="stat-val g">−${n(totalOut)}</span></div>
    <div class="stat-row"><span class="stat-label">מאזן נטו</span><span class="stat-val ${net > 200 ? 'r' : net < -50 ? 'g' : 'a'}">${net >= 0 ? '+' : ''}${n(net)}</span></div>
    <div class="stat-row"><span class="stat-label">יעד יומי</span><span class="stat-val">${goalCal} קק"ל</span></div>`;

  // Deficit banner
  const deficit = totalOut - inn;
  const db = document.getElementById('deficit-banner');
  if (db && (inn > 0 || totalOut > 0)) {
    let cls, txt;
    if (deficit >= GOAL.deficit) {
      cls = 'good';
      txt = `✅ גרעון של <strong>${n(deficit)} קק"ל</strong> — מעולה! בקצב הזה תוריד כ-${(deficit * 7 / 7700).toFixed(2)} ק"ג בשבוע`;
    } else if (deficit > 0) {
      cls = 'warn';
      txt = `⚡ גרעון של <strong>${n(deficit)} קק"ל</strong> — חסרים עוד ${n(GOAL.deficit - deficit)} קק"ל ליעד`;
    } else {
      cls = 'bad';
      txt = `⚠️ עודף של <strong>${n(-deficit)} קק"ל</strong> — נסה להוסיף פעילות או להפחית צריכה`;
    }
    db.innerHTML = `<div class="def-banner ${cls}">${txt}</div>`;
  } else if (db) { db.innerHTML = ''; }

  // Health cards
  const h = dd(curD).health || {};
  const setHC = (id, val, suffix) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val ? (typeof val === 'number' ? val.toLocaleString() : val) + suffix : 'הזן';
    el.className = 'hc-val' + (val ? ' set' : '');
  };
  setHC('hc-steps', h.steps, ' צעד');
  setHC('hc-active', h.activeCal, ' קק"ל');
  setHC('hc-swim', h.swimMin, ' דק\'');
  setHC('hc-gym', h.gymMin, ' דק\'');

  // Food list
  const fl = document.getElementById('food-list');
  if (fl) {
    const foods = dd(curD).foods;
    fl.innerHTML = foods.length ? foods.map((f, i) => `
      <div class="item">
        <div class="item-dot food"></div>
        <div class="item-body"><div class="item-name">${f.name}</div><div class="item-sub">${f.meal}</div></div>
        <div class="item-cal">${f.cal}</div>
        <button class="item-del" onclick="rmFood(${i})">×</button>
      </div>`).join('') : '<div class="empty-note">לא נוספו ארוחות עדיין</div>';
  }

  // Exercise list
  const el = document.getElementById('ex-list');
  if (el) {
    const exs = dd(curD).exercises;
    el.innerHTML = exs.length ? exs.map((e, i) => `
      <div class="item">
        <div class="item-dot ex"></div>
        <div class="item-body"><div class="item-name">${e.name}</div><div class="item-sub">${e.label}</div></div>
        <div class="item-cal neg">−${e.cal}</div>
        <button class="item-del" onclick="rmEx(${i})">×</button>
      </div>`).join('') : '<div class="empty-note">לא נוספה פעילות עדיין</div>';
  }

  // Notes
  const nt = document.getElementById('day-notes');
  if (nt) nt.value = dd(curD).notes || '';
}

// ── Food ───────────────────────────────────────────────────────
function addFood() {
  const nm = document.getElementById('f-name').value.trim();
  const cal = parseInt(document.getElementById('f-cal').value);
  const meal = document.getElementById('f-meal').value;
  if (!nm || !cal || cal <= 0) { alert('נא למלא שם וקלוריות'); return; }
  dd(curD).foods.push({ name: nm, cal, meal });
  persist(); renderLog(); closeOv('ov-food');
  document.getElementById('f-name').value = '';
  document.getElementById('f-cal').value = '';
}
function rmFood(i) { dd(curD).foods.splice(i, 1); persist(); renderLog(); }

// ── Exercise ───────────────────────────────────────────────────
const EX_RATE = { run: 10, walk: 4.5, swim: 8.5, cycle: 7, gym: 6.5, yoga: 3, other: 5 };
const EX_NAME = { run: 'ריצה', walk: 'הליכה', swim: 'שחייה', cycle: 'רכיבה על אופניים', gym: 'אימון כושר', yoga: 'יוגה / פילאטיס', other: 'פעילות גופנית' };

function calcEx() {
  const t = document.getElementById('e-type').value;
  const m = parseFloat(document.getElementById('e-min').value) || 0;
  document.getElementById('e-cal').value = n(m * EX_RATE[t]);
}
function addEx() {
  const t = document.getElementById('e-type').value;
  const m = parseFloat(document.getElementById('e-min').value) || 0;
  if (m <= 0) { alert('נא להזין משך זמן'); return; }
  const cal = parseInt(document.getElementById('e-cal').value) || n(m * EX_RATE[t]);
  dd(curD).exercises.push({ name: EX_NAME[t], cal, label: n(m) + ' דקות' });
  persist(); renderLog(); closeOv('ov-ex');
  document.getElementById('e-min').value = '';
  document.getElementById('e-cal').value = '';
}
function rmEx(i) { dd(curD).exercises.splice(i, 1); persist(); renderLog(); }

// ── Notes ──────────────────────────────────────────────────────
function saveNotes() {
  dd(curD).notes = document.getElementById('day-notes').value;
  persist();
}

// ── Health / Watch input ───────────────────────────────────────
function saveSteps() {
  const v = parseInt(document.getElementById('h-steps').value) || 0;
  dd(curD).health.steps = v;
  persist(); renderLog(); closeOv('ov-steps');
  document.getElementById('h-steps').value = '';
}
function saveActive() {
  const v = parseInt(document.getElementById('h-active').value) || 0;
  dd(curD).health.activeCal = v;
  persist(); renderLog(); closeOv('ov-active');
  document.getElementById('h-active').value = '';
}
function calcSwim() {
  const m = parseInt(document.getElementById('h-swim-min').value) || 0;
  document.getElementById('h-swim-cal').value = n(m * 8);
}
function saveSwim() {
  const m = parseInt(document.getElementById('h-swim-min').value) || 0;
  const cal = parseInt(document.getElementById('h-swim-cal').value) || n(m * 8);
  dd(curD).health.swimMin = m; dd(curD).health.swimCal = cal;
  persist(); renderLog(); closeOv('ov-swim');
}
function calcGym() {
  const m = parseInt(document.getElementById('h-gym-min').value) || 0;
  document.getElementById('h-gym-cal').value = n(m * 6.5);
}
function saveGym() {
  const m = parseInt(document.getElementById('h-gym-min').value) || 0;
  const cal = parseInt(document.getElementById('h-gym-cal').value) || n(m * 6.5);
  dd(curD).health.gymMin = m; dd(curD).health.gymCal = cal;
  persist(); renderLog(); closeOv('ov-gym');
}

// ── Calendar ───────────────────────────────────────────────────
function renderCal() {
  document.getElementById('cal-title').textContent = HE_MONTHS[calM] + ' ' + calY;

  // Week bar chart (last 7 days)
  const wc = document.getElementById('week-chart');
  if (wc) {
    const days7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days7.push(d.toISOString().slice(0, 10));
    }
    const maxV = Math.max(1, ...days7.map(d => { const { inn, totalOut } = dayCalc(d); return Math.max(inn, totalOut); }));
    wc.innerHTML = days7.map(d => {
      const { inn, totalOut } = dayCalc(d);
      const inH = n((inn / maxV) * 62);
      const outH = n((totalOut / maxV) * 62);
      const dl = new Date(d + 'T12:00:00');
      return `<div class="wbar-wrap">
        <div class="wbar-cols">
          <div class="wbar in" style="height:${inH || 2}px"></div>
          <div class="wbar out" style="height:${outH || 2}px"></div>
        </div>
        <div class="wbar-lbl">${HE_DAYS[dl.getDay()]}</div>
      </div>`;
    }).join('');
  }

  // Calendar grid
  const dh = document.getElementById('cal-dh');
  const cg = document.getElementById('cal-days');
  if (!dh || !cg) return;
  dh.innerHTML = HE_DAYS.map(d => `<div class="cdh">${d}</div>`).join('');
  cg.innerHTML = '';
  const first = new Date(calY, calM, 1).getDay();
  const daysInM = new Date(calY, calM + 1, 0).getDate();
  const td = today();

  for (let i = 0; i < first; i++) {
    const pd = new Date(calY, calM, 0 - first + i + 1);
    cg.innerHTML += `<div class="cd other"><div class="cd-num">${pd.getDate()}</div></div>`;
  }
  for (let d = 1; d <= daysInM; d++) {
    const ds = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const { inn, totalOut, net } = dayCalc(ds);
    const hasData = DB[ds] && (DB[ds].foods.length || DB[ds].exercises.length || Object.keys(DB[ds].health || {}).length);
    const netCls = net < -80 ? 'ok' : net > 250 ? 'hi' : 'ok';
    const netTxt = hasData ? (net >= 0 ? '+' : '') + n(net) : '';
    const isSel = ds === curD;
    const isT = ds === td;
    cg.innerHTML += `<div class="cd${isT ? ' today' : ''}${isSel ? ' sel' : ''}" onclick="calPickDay('${ds}')">
      <div class="cd-num">${d}</div>
      ${hasData ? `<div class="cd-net ${netCls}">${netTxt}</div><div class="cd-dot"></div>` : ''}
    </div>`;
  }
  renderCalDetail();
}

function calPickDay(ds) {
  curD = ds;
  updateDateLabels();
  renderCalDetail();
  renderLog();
  // re-render calendar to update sel state
  const cells = document.querySelectorAll('.cd');
  cells.forEach(c => c.classList.remove('sel'));
}

function renderCalDetail() {
  const panel = document.getElementById('cal-detail-panel');
  if (!panel) return;
  const { inn, totalOut, net } = dayCalc(curD);
  const day = dd(curD);
  const hasData = DB[curD] && (day.foods.length || day.exercises.length || Object.keys(day.health || {}).length);
  if (!hasData) { panel.innerHTML = ''; return; }
  const deficit = totalOut - inn;
  panel.innerHTML = `
    <div class="detail-card">
      <h3>${fmtDate(curD)}</h3>
      <div class="stat-row"><span class="stat-label">קלוריות שנכנסו</span><span class="stat-val">${n(inn)}</span></div>
      <div class="stat-row"><span class="stat-label">קלוריות שנשרפו</span><span class="stat-val g">${n(totalOut)}</span></div>
      <div class="stat-row"><span class="stat-label">גרעון</span><span class="stat-val ${deficit >= GOAL.deficit ? 'g' : deficit < 0 ? 'r' : 'a'}">${deficit >= 0 ? '+' : ''}${n(deficit)}</span></div>
      ${day.notes ? `<div style="font-size:12px;color:var(--text2);margin-top:10px;padding-top:10px;border-top:1px solid var(--border);line-height:1.5">${day.notes}</div>` : ''}
    </div>`;
}

function prevM() { calM--; if (calM < 0) { calM = 11; calY--; } renderCal(); }
function nextM() { calM++; if (calM > 11) { calM = 0; calY++; } renderCal(); }

// ── Analysis ───────────────────────────────────────────────────
function renderAdv() {
  const days = Object.keys(DB).sort().slice(-30);
  const ac = document.getElementById('adv-main');
  const as = document.getElementById('adv-side');
  const atc = document.getElementById('adv-summary-cards');
  if (!ac) return;

  if (!days.length) {
    ac.innerHTML = '<div class="adv-card"><h3>אין עדיין נתונים</h3><p>הזן לפחות יום אחד של נתונים כדי לקבל ניתוח מלא.</p></div>';
    return;
  }

  const totals = days.map(d => ({ d, ...dayCalc(d) }));
  const avgIn = n(totals.reduce((s, t) => s + t.inn, 0) / totals.length);
  const avgOut = n(totals.reduce((s, t) => s + t.totalOut, 0) / totals.length);
  const avgDeficit = avgOut - avgIn;
  const daysLogged = days.length;
  const weeklyLoss = (avgDeficit * 7 / 7700).toFixed(2);
  const daysOnTarget = totals.filter(t => (t.totalOut - t.inn) >= GOAL.deficit).length;

  // Top metric cards
  if (atc) atc.innerHTML = `
    <div class="adv-metric"><div class="adv-metric-label">ממוצע יומי נכנס</div><div class="adv-metric-val" style="color:var(--blue)">${avgIn}</div></div>
    <div class="adv-metric"><div class="adv-metric-label">ממוצע יומי נשרף</div><div class="adv-metric-val" style="color:var(--green)">${avgOut}</div></div>
    <div class="adv-metric"><div class="adv-metric-label">גרעון ממוצע</div><div class="adv-metric-val" style="color:${avgDeficit>=GOAL.deficit?'var(--green)':'var(--amber)'}">${avgDeficit>=0?'+':''}${n(avgDeficit)}</div></div>
    <div class="adv-metric"><div class="adv-metric-label">ירידה שבועית צפויה</div><div class="adv-metric-val" style="color:var(--green-mid)">${weeklyLoss > 0 ? weeklyLoss + ' ק"ג' : '—'}</div></div>`;

  // Main cards
  let mHtml = '';
  mHtml += `<div class="adv-card ${avgDeficit >= GOAL.deficit ? 'highlight' : ''}">
    <h3>סיכום ${daysLogged} ימים <span class="adv-tag ${avgDeficit > 0 ? 'g' : 'r'}">${avgDeficit >= 0 ? 'גרעון' : 'עודף'}</span></h3>
    <p>${daysOnTarget} מתוך ${daysLogged} ימים עמדת ביעד הגרעון.<br>
    ${avgDeficit >= GOAL.deficit ? `מצוין! בקצב זה תוריד כ-${weeklyLoss} ק"ג בשבוע.` : `צריך לגדיל גרעון ב-${n(GOAL.deficit - avgDeficit)} קק"ל לעמידה ביעד.`}</p>
  </div>`;

  if (avgOut < 300) mHtml += `<div class="adv-card warn-card"><h3>הגדל פעילות גופנית <span class="adv-tag a">חשוב</span></h3><p>שריפת קלוריות ממוצעת נמוכה (${n(avgOut)} קק"ל). הוסף 30–40 דקות הליכה מהירה כל יום.</p></div>`;
  if (avgIn > GOAL.cal + 150) mHtml += `<div class="adv-card warn-card"><h3>הפחת צריכה <span class="adv-tag r">דחוף</span></h3><p>הצריכה עולה על יעדך ב-${n(avgIn - GOAL.cal)} קק"ל. נסה להחליף חטיפים קלוריים בירקות.</p></div>`;

  // 3-day plan
  mHtml += `<div class="adv-card">
    <h3>📅 תוכנית ל-3 הימים הקרובים</h3>
    <div class="plan-day"><h4>יום 1 — פרוטאין + ירקות</h4>
      <div class="plan-row">בוקר: ביצים (2) + ירקות + קפה שחור — 280 קק"ל</div>
      <div class="plan-row">צהריים: חזה עוף 200g + ירקות מוקפצים + קינואה — 480 קק"ל</div>
      <div class="plan-row">ערב: דג אפוי + ירקות מאודים — 350 קק"ל</div>
      <div class="plan-row">פעילות: 35 דק' הליכה מהירה (−158 קק"ל)</div>
    </div>
    <div class="plan-day"><h4>יום 2 — ים תיכוני</h4>
      <div class="plan-row">בוקר: יוגורט יווני 0% + פירות יער + שיבולת שועל — 260 קק"ל</div>
      <div class="plan-row">צהריים: סלט טונה גדול + לחם מחיטה מלאה — 400 קק"ל</div>
      <div class="plan-row">ערב: מרק עוף + ירקות — 280 קק"ל</div>
      <div class="plan-row">פעילות: שחייה 30 דק' (−255 קק"ל)</div>
    </div>
    <div class="plan-day"><h4>יום 3 — יום אימון</h4>
      <div class="plan-row">בוקר: שיבולת שועל + בננה + אגוזים — 340 קק"ל</div>
      <div class="plan-row">צהריים: עוף בגריל + אורז מלא + סלט — 520 קק"ל</div>
      <div class="plan-row">ערב: חביתה (3 ביצים) + ירקות — 260 קק"ל</div>
      <div class="plan-row">פעילות: אימון כוח 45 דק' (−295 קק"ל)</div>
    </div>
  </div>`;
  ac.innerHTML = mHtml;

  // Side tips
  if (as) as.innerHTML = `
    <div class="adv-card">
      <h3>💡 טיפים לירידה במשקל</h3>
      <p>• שתה 2–3 ליטר מים ביום — מפחית רעב<br>
      • אכול לאט ובלי מסכים — מאפשר לחוש שובע<br>
      • תכנן ארוחות מראש — מונע חטיפים<br>
      • 8,000+ צעדים ביום = ~320 קק"ל נוספים<br>
      • שינה 7–8 שעות — מפחיתה קורטיזול ורעב<br>
      • אכול חלבון בכל ארוחה — שומר מסת שריר</p>
    </div>
    <div class="adv-card">
      <h3>⌚ Apple Watch</h3>
      <p>הטבעות (Move/Exercise/Stand) מסנכרנות ל-Apple Health. כל ערב בדוק:<br><br>
      🔴 <strong>קלוריות פעילות</strong> (הטבעת האדומה)<br>
      🚶 <strong>צעדים</strong> — כל 1,000 צעדים = כ-40 קק"ל<br>
      🏊 <strong>שחייה</strong> — מזוהה אוטומטית בשעון<br>
      🏋️ <strong>כושר</strong> — הפעל "אימון" בשעון</p>
    </div>`;
}

// ── Tabs ───────────────────────────────────────────────────────
function goTab(i, btn) {
  [0, 1, 2, 3].forEach(j => {
    const t = document.getElementById('t' + j);
    if (t) t.style.display = j === i ? 'block' : 'none';
  });
  document.querySelectorAll('.sb-btn, .mn-btn').forEach(b => b.classList.remove('active'));
  // activate matching buttons
  document.querySelectorAll('[data-tab="' + i + '"]').forEach(b => b.classList.add('active'));
  if (i === 1) renderCal();
  if (i === 2) renderAdv();
  if (i === 3) {} // settings already populated
}

// ── Overlays ───────────────────────────────────────────────────
function openOv(id) { document.getElementById(id).classList.add('on'); }
function closeOv(id) { document.getElementById(id).classList.remove('on'); }
function sp(e) { e.stopPropagation(); }

// ── Export / Import ────────────────────────────────────────────
function exportCSV() {
  const rows = [['תאריך','אוכל קק"ל','פעילות קק"ל','בריאות קק"ל','סה"כ נשרף','מאזן']];
  Object.keys(DB).sort().forEach(d => {
    const { inn, totalOut, net, exOut, hOut } = dayCalc(d);
    rows.push([d, n(inn), n(exOut), n(hOut), n(totalOut), n(net)]);
  });
  const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  dl(csv, 'mazan-export.csv', 'text/csv;charset=utf-8');
}

function exportJSON() {
  dl(JSON.stringify({ db: DB, goal: GOAL }, null, 2), 'mazan-backup.json', 'application/json');
}

function dl(content, filename, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename; a.click();
}

function clearAll() {
  if (confirm('למחוק את כל הנתונים? פעולה זו אינה הפיכה.')) {
    DB = {};
    localStorage.removeItem('mz3_db');
    renderLog();
    alert('הנתונים נמחקו.');
  }
}

// ── Init ───────────────────────────────────────────────────────
load();
