/* =========================================================
   Gamblers Luck — core logic
   - Front-end only
   - Optional Firebase for public results
   - Fallback to localStorage
   ========================================================= */

let fb = null;               // firebase app
let auth = null;
let db = null;
const TZ = 'Europe/Amsterdam';  // voor weeklabeling (voor later gebruik)

document.addEventListener('DOMContentLoaded', init);

async function init(){
  // Init Firebase if enabled
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE){
    fb = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
  }

  const path = location.pathname.toLowerCase();
  if (path.endsWith('/admin.html') || path.endsWith('admin.html')) initAdmin();
  else initPublic();
}

/* =======================
   ISO Week helpers
   ======================= */
function toISOWeekId(date = new Date()){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() || 7); // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const weekStr = String(weekNo).padStart(2,'0');
  return `${d.getUTCFullYear()}-W${weekStr}`;
}
function currentISOWeekId(){ return toISOWeekId(new Date()); }

/* =======================
   Storage (names & results)
   ======================= */
const LS_KEYS = {
  NAMES: 'gl-names',
  LATEST: 'gl-latest-week',
  RESULT_PREFIX: 'gl-week-' // gl-week-2026-W08
};

async function saveNames(names){
  names = uniqueNonEmpty(names).slice(0,100);
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && db){
    const docRef = db.collection('gamblersLuckMeta').doc('names');
    await docRef.set({ list: names, updatedAt: new Date().toISOString() });
  }else{
    localStorage.setItem(LS_KEYS.NAMES, JSON.stringify(names));
  }
  return names.length;
}

async function loadNames(){
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && db){
    const doc = await db.collection('gamblersLuckMeta').doc('names').get();
    if (doc.exists) return doc.data().list || [];
    return [];
  }else{
    const raw = localStorage.getItem(LS_KEYS.NAMES);
    return raw ? JSON.parse(raw) : [];
  }
}

async function saveResult(weekId, result){
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && db){
    await db.collection('gamblersLuck').doc(weekId).set(result, { merge: false });
  }else{
    localStorage.setItem(LS_KEYS.RESULT_PREFIX+weekId, JSON.stringify(result));
  }
  localStorage.setItem(LS_KEYS.LATEST, weekId);
}

async function loadResult(weekId){
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && db){
    const doc = await db.collection('gamblersLuck').doc(weekId).get();
    return doc.exists ? doc.data() : null;
  }else{
    const raw = localStorage.getItem(LS_KEYS.RESULT_PREFIX+weekId);
    return raw ? JSON.parse(raw) : null;
  }
}

async function loadLatestWeekId(){
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && db){
    const snap = await db.collection('gamblersLuck')
      .orderBy('timestamp','desc')
      .limit(1).get();
    if (!snap.empty) return snap.docs[0].id;
    return null;
  }else{
    return localStorage.getItem(LS_KEYS.LATEST);
  }
}

/* =======================
   Public page
   ======================= */
async function initPublic(){
  const $latestWeek = document.getElementById('latestWeek');
  const $latestConductor = document.getElementById('latestConductor');
  const $latestVIP = document.getElementById('latestVIP');
  const $copyLatest = document.getElementById('copyLatestLink');

  const weekParam = new URLSearchParams(location.search).get('week');
  const weekToShow = weekParam || await loadLatestWeekId();

  if (weekToShow){
    const res = await loadResult(weekToShow);
    if (res){
      $latestWeek.textContent = weekToShow;
      $latestConductor.textContent = res.conductor || '—';
      $latestVIP.textContent = res.vip || '—';
      $copyLatest.onclick = () => copyLinkForWeek(weekToShow);
    }else{
      $latestWeek.textContent = '—';
      $latestConductor.textContent = '—';
      $latestVIP.textContent = '—';
      if ($copyLatest) $copyLatest.disabled = true;
    }
  }else{
    $latestWeek.textContent = '—';
    $latestConductor.textContent = '—';
    $latestVIP.textContent = '—';
    if ($copyLatest) $copyLatest.disabled = true;
  }

  const $weekInput = document.getElementById('weekInput');
  const $loadWeekBtn = document.getElementById('loadWeekBtn');
  const $chosenWeek = document.getElementById('chosenWeek');
  const $chosenConductor = document.getElementById('chosenConductor');
  const $chosenVIP = document.getElementById('chosenVIP');

  if ($loadWeekBtn){
    $loadWeekBtn.onclick = async () => {
      const wk = ($weekInput.value||'').trim();
      if (!wk){ return; }
      const res = await loadResult(wk);
      if (res){
        $chosenWeek.textContent = wk;
        $chosenConductor.textContent = res.conductor || '—';
        $chosenVIP.textContent = res.vip || '—';
      }else{
        $chosenWeek.textContent = wk;
        $chosenConductor.textContent = '—';
        $chosenVIP.textContent = '—';
      }
    };
  }
}

function copyLinkForWeek(weekId){
  const url = new URL(location.href);
  url.searchParams.set('week', weekId);
  navigator.clipboard.writeText(url.toString());
  alert(`Link gekopieerd:\n${url.toString()}`);
}

/* =======================
   Admin page
   ======================= */
let wheel = null;
let loggedIn = false;

async function initAdmin(){
  const $loginPanel = document.getElementById('loginPanel');
  const $adminPanel = document.getElementById('adminPanel');
  const $loginBtn = document.getElementById('loginBtn');
  const $adminPassword = document.getElementById('adminPassword');
  const $loginMsg = document.getElementById('loginMsg');

  $loginBtn.onclick = async ()=>{
    $loginMsg.textContent = '';
    try {
      if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && auth && FIREBASE_ADMIN.email && FIREBASE_ADMIN.password){
        await auth.signInWithEmailAndPassword(FIREBASE_ADMIN.email, FIREBASE_ADMIN.password);
        loggedIn = true;
      } else {
        const ok = await checkPassword($adminPassword.value, ADMIN_PASSWORD_PLAIN);
        if (!ok) throw new Error('Onjuist wachtwoord');
        loggedIn = true;
      }
      $loginPanel.classList.add('hidden');
      $adminPanel.classList.remove('hidden');
      await afterLoginInit();
    } catch(e){
      $loginMsg.textContent = e.message || 'Login mislukt';
    }
  };
}

async function afterLoginInit(){
  const $namesInput = document.getElementById('namesInput');
  const $saveNamesBtn = document.getElementById('saveNamesBtn');
  const $clearNamesBtn = document.getElementById('clearNamesBtn');
  const $namesCount = document.getElementById('namesCount');

  const names = await loadNames();
  $namesInput.value = names.join('\n');
  updateNamesCount();

  $saveNamesBtn.onclick = async ()=>{
    const list = parseNames($namesInput.value);
    const count = await saveNames(list);
    $namesInput.value = list.join('\n');
    updateNamesCount();
    toast(`Opgeslagen (${count} namen).`);
    drawWheel(list);
  };

  $clearNamesBtn.onclick = async ()=>{
    $namesInput.value = '';
    await saveNames([]);
    updateNamesCount();
    drawWheel([]);
    toast('Lijst leeggemaakt.');
  };

  function updateNamesCount(){
    const list = parseNames($namesInput.value);
    $namesCount.textContent = `${Math.min(list.length,100)}/100`;
  }
  $namesInput.addEventListener('input', updateNamesCount);

  drawWheel(parseNames($namesInput.value));

  const $weekLabel = document.getElementById('weekLabel');
  const wk = currentISOWeekId();
  $weekLabel.textContent = wk;

  const $spinBtn = document.getElementById('spinBtn');
  const $panel = document.getElementById('spinResult');
  const $w = document.getElementById('resWeek');
  const $c = document.getElementById('resConductor');
  const $v = document.getElementById('resVIP');
  const $copy = document.getElementById('copyShareLink');

  $spinBtn.onclick = async ()=>{
    const weekId = currentISOWeekId();
    const existing = await loadResult(weekId);
    if (existing){
      showResult(existing, weekId);
      toast('Voor deze week bestaat al een uitslag. (Her)publiceren toegestaan, opnieuw trekken niet.');
      return;
    }

    const pool = uniqueNonEmpty(parseNames($namesInput.value)).slice(0,100);
    if (pool.length < 2){
      toast('Minimaal 2 namen nodig.');
      return;
    }

    $spinBtn.disabled = true;
    const conductor = await spinAndPick(pool, 'Train Conductor');
    const remaining = pool.filter(n => n !== conductor);
    const vip = await spinAndPick(remaining, 'VIP Passenger');

    const result = {
      weekId,
      conductor,
      vip,
      timestamp: new Date().toISOString(),
      totalPool: pool.length
    };
    await saveResult(weekId, result);
    showResult(result, weekId);
    $spinBtn.disabled = false;
  };

  function showResult(res, weekId){
    $panel.classList.remove('hidden');
    $w.textContent = weekId;
    $c.textContent = res.conductor || '—';
    $v.textContent = res.vip || '—';
    $copy.onclick = ()=> copyLinkForWeek(weekId);
  }
}

/* =======================
   Wheel rendering & spin
   ======================= */
function drawWheel(names){
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 6;

  wheel = { names, angle: 0, speed: 0, spinning: false, ctx, W, H, cx, cy, r };
  renderWheel();
}

function renderWheel(){
  if (!wheel) return;
  const {names, angle, ctx, W, H, cx, cy, r} = wheel;
  ctx.clearRect(0,0,W,H);

  const n = Math.max(1, names.length);
  const arc = 2*Math.PI / n;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  for (let i=0;i<n;i++){
    const start = i*arc;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,start,start+arc);
    ctx.closePath();
    ctx.fillStyle = i%2===0 ? '#3a444f' : '#2b333c';
    ctx.fill();
    ctx.strokeStyle = '#6f7a85';
    ctx.lineWidth = 1;
    ctx.stroke();

    const label = (names[i]||'—').substring(0,20);
    ctx.save();
    ctx.rotate(start + arc/2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e6edf5';
    ctx.font = '14px Oswald, Arial';
    ctx.translate(r-10, 0);
    ctx.rotate(Math.PI/2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0,0,32,0,2*Math.PI);
  ctx.fillStyle = '#aa7f3d';
  ctx.fill();
  ctx.strokeStyle = '#d1ae68';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();

  if (wheel.spinning){
    wheel.angle += wheel.speed;
    wheel.speed *= 0.985;
    if (wheel.speed < 0.002){
      wheel.spinning = false;
    }
    requestAnimationFrame(renderWheel);
  }
}

function pickAtPointer(){
  if (!wheel || wheel.names.length === 0) return null;
  const n = wheel.names.length;
  const arc = 2*Math.PI / n;
  let a = (Math.PI/2 - wheel.angle) % (2*Math.PI);
  if (a < 0) a += 2*Math.PI;
  const idx = Math.floor(a / arc);
  return wheel.names[idx];
}

function animateSpinTo(targetName){
  return new Promise(resolve=>{
    if (!wheel || !wheel.names.length) return resolve();
    wheel.spinning = true;
    wheel.speed = 0.45 + Math.random()*0.15;
    const endCheck = setInterval(()=>{
      if (!wheel.spinning){
        clearInterval(endCheck);
        const idx = wheel.names.indexOf(targetName);
        if (idx >= 0){
          const n = wheel.names.length;
          const arc = 2*Math.PI / n;
          const desired = Math.PI/2 - (idx*arc + arc/2);
          let delta = (desired - wheel.angle) % (2*Math.PI);
          wheel.angle += delta;
        }
        renderWheel();
        resolve();
      }
    }, 60);
    renderWheel();
  });
}

async function spinAndPick(pool, label){
  const shuffled = [...pool].sort(()=>Math.random()-0.5);
  wheel.names = shuffled;
  wheel.angle = Math.random()*Math.PI*2;
  renderWheel();

  const target = shuffled[Math.floor(Math.random()*shuffled.length)];
  await animateSpinTo(target);
  toast(`${label}: ${target}`);
  return target;
}

/* =======================
   Admin password (client)
   ======================= */
async function checkPassword(input, plainStored){
  const [hIn, hStored] = await Promise.all([sha256(input), sha256(plainStored)]);
  return hIn === hStored;
}

async function sha256(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* =======================
   Utils
   ======================= */
function uniqueNonEmpty(arr){
  const set = new Set();
  const out = [];
  for (const s of arr){
    const t = (s||'').trim();
    if (t && !set.has(t.toLowerCase())){
      set.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
}
function parseNames(text){
  return uniqueNonEmpty((text||'').split(/\r?\n/)).slice(0,100);
}
function toast(msg){ console.log(msg); }
