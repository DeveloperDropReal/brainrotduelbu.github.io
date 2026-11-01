
/* Brainrot Duel */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const STORE = 'brainrotDuel_v1';
const PROMO_CODE = 'RELEASE26';
const PROMO_REWARD = 150;
const ADMIN_CODE = 'ADMINPANEL666SECRET';
const ADMIN_MAX_CURRENCY = 500000000;

const cases = {
  free: {
    name: 'Free Case', cost: 0, free: true,
    items: [
      {name:'Лаграндо Комбисион',icon:'🐉',rarity:'Secret',value:100,chance:45},
      {name:'7 Кристаллов',icon:'💎',rarity:'Обычный',value:7,chance:54,crystals:7},
      {name:'Лос Трио Хэллоуин',icon:'👻',rarity:'Secret',value:150,chance:20}
    ]
  },
  lucky: {
    name: 'Lucky Block Case', cost: 10,
    items: [
      {name:'Admin Block',icon:'👑',rarity:'Admin',value:50,chance:50},
      {name:'Taco Block',icon:'🌮',rarity:'Taco',value:100,chance:40},
      {name:'Secret Block',icon:'🟪',rarity:'Secret',value:200,chance:10},
      {name:'GOD Block',icon:'⚡',rarity:'God',value:150,chance:20},
      {name:'Мифик Block',icon:'💠',rarity:'Мифик',value:50,chance:30}
    ]
  },
  secret: {
    name: 'Secret Brainrots case', cost: 10,
    items: [
      {name:'La Grande Combination',icon:'🐉',rarity:'Secret',value:100,chance:30},
      {name:'Los Treats',icon:'🎃',rarity:'Secret',value:50,chance:40},
      {name:'Admin Lucky Blocks',icon:'👑',rarity:'Admin',value:10,chance:50}
    ]
  }
};

function freshState() {
  return {
    users:{},
    currentUser:null,
    inventory:[],
    lastFreeClaim:0,
    balance:0,
    usedPromo:false
  };
}

function loadState() {
  try {
    return {...freshState(),...JSON.parse(localStorage.getItem(STORE)||'{}')};
  } catch {
    return freshState();
  }
}

let state = loadState();
let authMode = 'login';

function save() {
  localStorage.setItem(STORE,JSON.stringify(state));
}

function current() {
  return state.currentUser ? state.users[state.currentUser] : null;
}

function balance() {
  return current()?.balance ?? 0;
}

function setBalance(v) {
  const u=current();
  if(u) u.balance=Math.max(0,v);
  save();
  render();
}

function toast(msg) {
  const el=$('#toast');
  el.textContent=msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2400);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function formatTime(ms) {
  const h=Math.floor(ms/3600000);
  const m=Math.floor(ms%3600000/60000);
  const s=Math.floor(ms%60000/1000);
  return `${h}ч ${m}м ${s}с`;
}

function render() {
  $('#balance').textContent=balance().toLocaleString('ru-RU');
  $('#authButton').textContent=current()?'Выйти':'Войти';
  $('#profileButton').textContent=current()?'🙂':'👤';
  $('#inventoryCount').textContent=`${state.inventory.length} предметов`;

  const grid=$('#inventoryGrid');

  if(!state.inventory.length) {
    grid.innerHTML='<div class="empty-state"><span>▧</span><b>Пока здесь пусто</b><small>Открой кейс, чтобы получить первую награду.</small></div>';
  } else {
    grid.innerHTML=state.inventory.map((it,i)=>`
      <div class="inventory-item">
        <span class="item-icon">${it.icon}</span>
        <div>
          <b>${escapeHtml(it.name)}</b>
          <small>${escapeHtml(it.rarity)} · ${it.value} B ${it.level?`· Ур. ${it.level}`:''}</small>
        </div>
        <button data-sell="${i}">Продать</button>
      </div>
    `).join('');
  }

  refreshUpgradeOptions();

  const remaining=86400000-(Date.now()-state.lastFreeClaim);
  $('#freeCooldown').textContent=remaining>0
    ?`Следующий кейс через ${formatTime(remaining)}`
    :'Доступен сейчас';

  $$('.case-open[data-case="free"]').forEach(b=>{
    b.disabled=remaining>0;
    b.textContent=remaining>0?'Уже открывали сегодня':'Открыть кейс';
  });
}

function renderDrops() {
  for(const [id,c] of Object.entries(cases)) {
    $(`#drops-${id}`).innerHTML=c.items.map(it=>`
      <div class="drop-item">
        <span>${it.icon} ${escapeHtml(it.name)}</span>
        <span>${it.chance}%</span>
      </div>
    `).join('');
  }
}

function choose(items) {
  const total=items.reduce((n,x)=>n+x.chance,0);
  let roll=Math.random()*total;
  for(const it of items) {
    roll-=it.chance;
    if(roll<=0) return it;
  }
  return items[items.length-1];
}

function openCase(id) {
  if(!current()) {
    toast('Сначала войди или зарегистрируйся');
    openAuth();
    return;
  }

  const c=cases[id];
  if(!c) return;

  if(c.free && Date.now()-state.lastFreeClaim<86400000) {
    toast('Бесплатный кейс доступен раз в 24 часа');
    return;
  }

  if(balance()<c.cost) {
    toast('Недостаточно B на балансе');
    return;
  }

  if(!c.free) setBalance(balance()-c.cost);
  if(c.free) state.lastFreeClaim=Date.now();

  const item=choose(c.items);

  if(item.crystals) {
    setBalance(balance()+item.crystals);
  } else {
    state.inventory.unshift({
      ...item,
      caseName:c.name,
      obtainedAt:Date.now(),
      level:0
    });
  }

  save();
  render();
  showResult(item,c);
}

function showResult(item,c) {
  $('#resultIcon').textContent=item.icon;
  $('#resultName').textContent=item.name;
  $('#resultRarity').textContent=item.rarity.toUpperCase();
  $('#resultDescription').textContent=item.crystals
    ?`Ты получил ${item.crystals} B на баланс!`
    :`Награда добавлена в инвентарь. Продать можно за ${item.value} B.`;
  $('#resultModal').hidden=false;
}

function openAuth() {
  if(current()) {
    if(confirm('Выйти из аккаунта?')) {
      state.currentUser=null;
      save();
      render();
    }
  } else {
    $('#authModal').hidden=false;
  }
}

$$('[data-close]').forEach(b=>{
  b.addEventListener('click',()=>$('#'+b.dataset.close).hidden=true);
});

$('#authButton').addEventListener('click',openAuth);

$('#profileButton').addEventListener('click',()=>{
  current()?toast(`Ты вошёл как ${current().name}`):openAuth();
});

$$('[data-auth-mode]').forEach(b=>{
  b.addEventListener('click',()=>{
    authMode=b.dataset.authMode;
    $$('[data-auth-mode]').forEach(x=>x.classList.toggle('active',x===b));
    $('#authTitle').textContent=authMode==='login'?'Войти в аккаунт':'Создать аккаунт';
    $('#authMessage').textContent='';
  });
});

$('#authForm').addEventListener('submit',e=>{
  e.preventDefault();

  const name=$('#username').value.trim();
  const pass=$('#password').value;
  const msg=$('#authMessage');

  if(authMode==='register') {
    if(state.users[name]) {
      msg.textContent='Такой пользователь уже существует.';
      return;
    }

    state.users[name]={name,password:pass,balance:0};
    state.currentUser=name;
  } else {
    const u=state.users[name];

    if(!u||u.password!==pass) {
      msg.textContent='Неверное имя пользователя или пароль.';
      return;
    }

    state.currentUser=name;
  }

  save();
  $('#authModal').hidden=true;
  $('#authForm').reset();
  render();
  toast('Добро пожаловать в Brainrot Duel!');
});

$$('.case-open').forEach(b=>{
  b.addEventListener('click',()=>openCase(b.dataset.case));
});

$('#inventoryGrid').addEventListener('click',e=>{
  const b=e.target.closest('[data-sell]');
  if(!b) return;

  const i=Number(b.dataset.sell);
  const item=state.inventory[i];
  if(!item) return;

  state.inventory.splice(i,1);
  setBalance(balance()+item.value);
  toast(`Продано: +${item.value} B`);
});

$('#promoForm').addEventListener('submit',e=>{
  e.preventDefault();

  const msg=$('#promoMessage');
  const code=$('#promoInput').value.trim().toUpperCase();

  if(!current()) {
    msg.textContent='Сначала войди в аккаунт.';
    return;
  }

  if(code!==PROMO_CODE) {
    msg.textContent='Промокод не найден.';
    return;
  }

  if(current().usedPromo) {
    msg.textContent='Ты уже активировал этот промокод.';
    return;
  }

  current().balance+=PROMO_REWARD;
  current().usedPromo=true;
  save();
  render();

  msg.textContent=`Успешно! +${PROMO_REWARD} B добавлено.`;
  $('#promoInput').value='';
});

renderDrops();
render();
setInterval(render,1000);

// Боковая шторка
const drawer=$('#sideDrawer');
const scrim=$('#drawerScrim');

function closeDrawer() {
  drawer.classList.remove('open');
  scrim.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  $('#menuToggle').setAttribute('aria-expanded','false');
}

function openDrawer() {
  drawer.classList.add('open');
  scrim.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  $('#menuToggle').setAttribute('aria-expanded','true');
}

$('#menuToggle').addEventListener('click',()=>{
  drawer.classList.contains('open')?closeDrawer():openDrawer();
});

$('#drawerClose').addEventListener('click',closeDrawer);
scrim.addEventListener('click',closeDrawer);

$$('.drawer-link[href]').forEach(a=>{
  a.addEventListener('click',closeDrawer);
});

// Активация админ-панели
$('#adminActivate').addEventListener('click',()=>{
  const msg=$('#adminAccessMessage');

  if($('#adminCodeInput').value===ADMIN_CODE) {
    $('#adminControls').hidden=false;
    msg.textContent='Админ-панель активирована!';
    populateAdminBrainrots();
  } else {
    $('#adminControls').hidden=true;
    msg.textContent='Неверный код доступа.';
  }
});

function allBrainrots() {
  return Object.values(cases).flatMap(c=>
    c.items.filter(x=>!x.crystals).map(it=>({...it,caseName:c.name}))
  );
}

function populateAdminBrainrots() {
  const select=$('#adminBrainrotSelect');

  select.innerHTML=allBrainrots().map((it,i)=>
    `<option value="${i}">${escapeHtml(it.name)} — ${escapeHtml(it.rarity)} (${escapeHtml(it.caseName)})</option>`
  ).join('');
}

// Выдать валюту
$('#adminGiveCurrency').addEventListener('click',()=>{
  const amount=Number($('#adminCurrencyAmount').value);
  const msg=$('#adminActionMessage');

  if(!current()) {
    msg.textContent='Сначала войди в аккаунт игрока.';
    return;
  }

  if(!Number.isSafeInteger(amount)||amount<1||amount>ADMIN_MAX_CURRENCY) {
    msg.textContent='Введи число от 1 до 500 000 000.';
    return;
  }

  current().balance+=amount;
  save();
  render();

  msg.textContent=`Выдано ${amount.toLocaleString('ru-RU')} B!`;
});

// Выдать Brainrot
$('#adminGiveBrainrot').addEventListener('click',()=>{
  const msg=$('#adminActionMessage');

  if(!current()) {
    msg.textContent='Сначала войди в аккаунт игрока.';
    return;
  }

  const item=allBrainrots()[Number($('#adminBrainrotSelect').value)];

  if(!item) {
    msg.textContent='Выбери Brainrot.';
    return;
  }

  state.inventory.unshift({
    ...item,
    level:0,
    adminGift:true,
    obtainedAt:Date.now()
  });

  save();
  render();

  msg.textContent=`${item.name} добавлен в инвентарь!`;
});

// Апгрейдер
function upgradeCost(item) {
  return Math.max(10,Math.round((item.value||10)*(1+(item.level||0)*0.75)));
}

function refreshUpgradeOptions() {
  const select=$('#upgradeItemSelect');
  if(!select) return;

  const previous=select.value;

  select.innerHTML=state.inventory.length
    ?state.inventory.map((it,i)=>
      `<option value="${i}">${escapeHtml(it.name)} · Ур. ${it.level||0}</option>`
    ).join('')
    :'<option value="">Нет Brainrot в инвентаре</option>';

  if(state.inventory[Number(previous)]) select.value=previous;

  updateUpgradePreview();
}

function updateUpgradePreview() {
  const select=$('#upgradeItemSelect');
  const preview=$('#upgradePreview');
  const cost=$('#upgradeCost');
  const button=$('#upgradeButton');

  if(!select||!state.inventory.length) {
    preview.textContent='🎒 Сначала получи Brainrot из кейса';
    cost.textContent='—';
    button.disabled=true;
    return;
  }

  const item=state.inventory[Number(select.value)];

  if(!item) {
    preview.textContent='🎒 Выбери предмет';
    cost.textContent='—';
    button.disabled=true;
    return;
  }

  preview.textContent=`${item.icon} ${item.name} · ${item.rarity} · уровень ${item.level||0} → ${(item.level||0)+1}`;
  cost.textContent=`${upgradeCost(item).toLocaleString('ru-RU')} B`;
  button.disabled=false;
}

$('#openUpgrader').addEventListener('click',()=>{
  closeDrawer();

  if(!current()) {
    toast('Сначала войди в аккаунт');
    openAuth();
    return;
  }

  refreshUpgradeOptions();
  $('#upgraderModal').hidden=false;
});

$('#upgradeItemSelect').addEventListener('change',updateUpgradePreview);

$('#upgradeButton').addEventListener('click',()=>{
  const msg=$('#upgradeMessage');
  const item=state.inventory[Number($('#upgradeItemSelect').value)];

  if(!current()) {
    msg.textContent='Войди в аккаунт.';
    return;
  }

  if(!item) {
    msg.textContent='Нет предмета для улучшения.';
    return;
  }

  const cost=upgradeCost(item);

  if(balance()<cost) {
    msg.textContent=`Недостаточно валюты. Нужно ${cost} B.`;
    return;
  }

  current().balance-=cost;
  item.level=(item.level||0)+1;
  item.value=Math.max(1,Math.round(item.value*1.5));

  if(item.level>=3&&item.rarity!=='Admin'&&item.rarity!=='God') {
    item.rarity='Upgraded '+item.rarity;
  }

  save();
  render();
  updateUpgradePreview();

  msg.textContent=`Успех! ${item.name} улучшен до уровня ${item.level}.`;
});
