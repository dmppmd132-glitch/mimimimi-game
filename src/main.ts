import './styles/main.css'
import './styles/garden.css'
import './styles/broadcast.css'
import './styles/characters.css'
import './styles/stage.css'
import './styles/shop.css'

type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7
type Item = { id: string; emoji: string; label: string; x: number; y: number; className?: string }

const root = document.getElementById('ui')!
const audio = new Audio('./bgm-bunny.mp3')
audio.loop = true
audio.volume = 0.32
let musicOn = false
let level: Level = 1
let carrots = new Set<string>()
let clues = new Set<string>()
let cakeClues = new Set<string>()
let chaos = 0
let score = 0
let timeLeft = 90
let timer: number | undefined
let jokeIndex = 0
let gameStarted = false
let level2Solved = false
let level3Solved = false
let lunarClues = new Set<string>()
let level4Solved = false
let gardenClues = new Set<string>()
let level5Solved = false
let signalClues = new Set<string>()
let level6Solved = false
let level7Solved = false
let secretCombo: string[] = []
let roleCombo: string[] = []
let bestScore = Number(localStorage.getItem('mimimimi-best-score') ?? 0)
let carrotCoins = Number(localStorage.getItem('mimimimi-carrot-coins') ?? 0)

const jokes = [
  '撲街兔表示：這是戰術，不是跌倒！',
  '好吃兔正在確認這個按鈕能不能吃。',
  '貼貼兔和木箱成為了永遠的朋友。',
  '睡睡兔說：我剛剛在夢裡已經解完了。',
  '咪咪咪：抓不到我吧！其實我也不知道我在哪。',
  '好吃兔表示：蛋糕只是暫時住進我的肚子。',
]

function el<T extends HTMLElement>(selector: string): T { return document.querySelector<T>(selector)! }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function toast(message: string, kind = 'normal') {
  const note = document.createElement('div')
  note.className = `toast ${kind}`
  note.textContent = message
  el('#toasts').append(note)
  window.setTimeout(() => note.remove(), 2600)
}
function updateShopUI() {
  document.querySelectorAll<HTMLElement>('[data-coins]').forEach(node => { node.textContent = String(carrotCoins) })
  document.querySelectorAll<HTMLButtonElement>('[data-shop-buy]').forEach(button => { button.disabled = carrotCoins < Number(button.dataset.price ?? 0) })
}
function addCoins(amount: number) { carrotCoins += amount; localStorage.setItem('mimimimi-carrot-coins', String(carrotCoins)); updateShopUI() }
function openShop() { el('#shopModal').classList.remove('hidden'); updateShopUI() }
function buyShopItem(id: string, price: number) {
  if (carrotCoins < price) { toast('胡蘿蔔幣不夠，先完成更多關卡吧！', 'funny'); return }
  carrotCoins -= price; localStorage.setItem('mimimimi-carrot-coins', String(carrotCoins)); updateShopUI()
  if (id === 'clock') { timeLeft += 20; el('#timeText').textContent = String(timeLeft); toast('兔兔時鐘加速！目前關卡增加 20 秒。', 'good') }
  if (id === 'tape') { chaos = Math.max(0, chaos - 3); el('#chaosFill').style.width = `${chaos * 20}%`; toast('貼貼膠帶把混亂值黏住了！', 'good') }
  if (id === 'radar') { document.querySelectorAll<HTMLElement>('.scene-item:not(.collected)').forEach(item => item.classList.add('radar-ping')); window.setTimeout(() => document.querySelectorAll<HTMLElement>('.radar-ping').forEach(item => item.classList.remove('radar-ping')), 5000); toast('咪咪咪雷達啟動！未收集物件會閃爍 5 秒。', 'good') }
  if (id === 'encore') { if (level === 7) { secretCombo = ['spotlight','record','mic','curtain']; updateHud(); toast('月光放大鏡揭開神秘幕簾，隱藏舞台提前出現！', 'good') } else toast('月光放大鏡已收好，第七關會自動揭露隱藏舞台。', 'good') }
}
function setMusic(on: boolean) {
  musicOn = on
  el<HTMLButtonElement>('#musicToggle').textContent = on ? '♫ 音樂 ON' : '♫ 音樂 OFF'
  if (on) audio.play().catch(() => toast('點一下畫面就可以解鎖配樂喔！'))
  else audio.pause()
}
function playCakeBiteSound() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const ctx = new AudioContextClass()
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.015)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
  master.connect(ctx.destination)

  const crunch = ctx.createOscillator()
  crunch.type = 'triangle'
  crunch.frequency.setValueAtTime(180, now)
  crunch.frequency.exponentialRampToValueAtTime(72, now + 0.22)
  crunch.connect(master)
  crunch.start(now)
  crunch.stop(now + 0.23)

  const chime = ctx.createOscillator()
  chime.type = 'sine'
  chime.frequency.setValueAtTime(520, now + 0.08)
  chime.frequency.exponentialRampToValueAtTime(260, now + 0.32)
  const chimeGain = ctx.createGain()
  chimeGain.gain.setValueAtTime(0.0001, now)
  chimeGain.gain.exponentialRampToValueAtTime(0.14, now + 0.09)
  chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
  chime.connect(chimeGain).connect(ctx.destination)
  chime.start(now + 0.06)
  chime.stop(now + 0.35)
  window.setTimeout(() => ctx.close(), 500)
}
function bumpChaos(amount = 1) {
  chaos = clamp(chaos + amount, 0, 5)
  el('#chaosFill').style.width = `${chaos * 20}%`
  if (chaos >= 5) {
    toast('全員決定先躺一下。兔兔休息 2 秒！', 'funny')
    chaos = 0
    el('#chaosFill').style.width = '0%'
    document.querySelectorAll('.bunny').forEach(b => b.classList.add('flop'))
    window.setTimeout(() => document.querySelectorAll('.bunny').forEach(b => b.classList.remove('flop')), 2100)
  }
}
function renderShell() {
  root.innerHTML = `
    <main class="game-shell">
      <header class="topbar"><div class="brand"><span class="brand-mark">🥕</span><div><strong>咪咪咪大作戰</strong><small>兔兔村今天也很不安分</small></div></div><div class="top-actions"><button class="pill shop-pill" id="shopBtn">🛒 商店 <b data-coins>${carrotCoins}</b></button><button class="pill" id="musicToggle">♫ 音樂 OFF</button><button class="pill" id="helpBtn">？提示</button></div></header>
      <section class="title-card" id="titleCard"><div class="title-bunnies"><img src="./characters/stick.png" alt="貼貼兔" /><img src="./characters/sleep.png" alt="睡睡兔" /><img src="./characters/mimi.png" alt="咪咪咪" /></div><p class="eyebrow">BUNNY MAYHEM · 兔兔解謎小遊戲</p><h1>咪咪咪大作戰</h1><p>找回胡蘿蔔、拆穿惡作劇，還要阻止好吃兔把任務吃掉。</p><div class="title-actions"><button class="big-btn" id="startBtn">開始大作戰 <span>→</span></button><button class="soft-btn" id="howBtn">玩法說明</button></div><div class="best-score">最高紀錄 <strong id="bestScoreText">${bestScore}</strong> 分 · 共七關</div></section>
      <section class="hud hidden" id="hud"><div><span class="level-tag" id="levelTag">第 1 關</span><h2 id="levelTitle">胡蘿蔔不見了</h2><p id="objective">找回房間裡失蹤的 5 根胡蘿蔔</p></div><div class="stats"><div><b id="progressText">胡蘿蔔 0/5</b><div class="mini-progress"><i id="progressFill"></i></div></div><div><b>混亂值</b><div class="chaos"><i id="chaosFill"></i></div></div><div class="time">⏱ <b id="timeText">90</b></div></div></section>
      <section class="scene hidden" id="scene"></section><section class="bottom-panel hidden" id="bottomPanel"><div class="character-row" id="characterRow"></div><div class="hint-box" id="hintBox">點擊場景中的物件，兔兔會自己想辦法。</div></section><section class="finish hidden" id="finish"></section><section class="shop-modal hidden" id="shopModal"><div class="shop-card"><button class="shop-close" id="shopClose">×</button><p class="eyebrow">BUNNY SHOP · 兔兔道具店</p><h2>今天想買哪個小道具？</h2><p class="shop-wallet">錢包：🥕 <strong data-coins>${carrotCoins}</strong> 胡蘿蔔幣</p><div class="shop-grid"><button class="shop-item" data-shop-buy="clock" data-price="8"><span>⏱️</span><b>兔兔時鐘</b><small>目前關卡 +20 秒</small><em>🥕 8</em></button><button class="shop-item" data-shop-buy="tape" data-price="6"><span>🩹</span><b>貼貼膠帶</b><small>混亂值 -3</small><em>🥕 6</em></button><button class="shop-item" data-shop-buy="radar" data-price="10"><span>📡</span><b>咪咪咪雷達</b><small>物件閃爍 5 秒</small><em>🥕 10</em></button><button class="shop-item" data-shop-buy="encore" data-price="12"><span>🔍</span><b>月光放大鏡</b><small>第七關提前揭露彩蛋</small><em>🥕 12</em></button></div></div></section><div id="toasts" aria-live="polite"></div>
    </main>`
  el<HTMLButtonElement>('#musicToggle').onclick = () => setMusic(!musicOn)
  el<HTMLButtonElement>('#startBtn').onclick = () => startLevel(1)
  el<HTMLButtonElement>('#shopBtn').onclick = () => openShop()
  el<HTMLButtonElement>('#shopClose').onclick = () => el('#shopModal').classList.add('hidden')
  document.querySelectorAll<HTMLButtonElement>('[data-shop-buy]').forEach(button => { button.onclick = () => buyShopItem(button.dataset.shopBuy!, Number(button.dataset.price)) })
  el<HTMLButtonElement>('#howBtn').onclick = () => toast('七關玩法：找線索、解危機，最後用兔兔合作喚醒隱藏的月光舞台！', 'funny')
  el<HTMLButtonElement>('#helpBtn').onclick = () => giveHint()
}
function sceneButton(item: Item) {
  return `<button class="scene-item ${item.className ?? ''}" data-item="${item.id}" style="left:${item.x}%;top:${item.y}%" aria-label="${item.label}"><span>${item.emoji}</span><small>${item.label}</small></button>`
}
function bunny(id: string, emoji: string, name: string, skill: string) {
  const portraits: Record<string, string> = { wake: 'sleep', eat: 'eat', bump: 'flop', stick: 'stick', listen: 'sleep', shine: 'handsome' }
  const portrait = portraits[id] ?? 'stick'
  return `<button class="bunny" data-skill="${id}" title="${skill}"><span class="bunny-art"><img src="./characters/${portrait}.png" alt="${name}" /></span><b>${name}</b><small>${skill}</small></button>`
}
function startLevel(next: Level) {
  level = next
  carrots = new Set(); clues = new Set(); cakeClues = new Set(); lunarClues = new Set(); gardenClues = new Set(); signalClues = new Set(); secretCombo = []; roleCombo = []
  chaos = 0
  if (next === 1) score = 0
  timeLeft = next === 1 ? 90 : next === 2 ? 105 : next === 3 ? 120 : next === 4 ? 135 : next === 5 ? 150 : next === 6 ? 165 : 180
  level2Solved = false; level3Solved = false; level4Solved = false; level5Solved = false; level6Solved = false; level7Solved = false; gameStarted = true
  el('#titleCard').classList.add('hidden'); el('#hud').classList.remove('hidden'); el('#scene').classList.remove('hidden'); el('#bottomPanel').classList.remove('hidden'); el('#finish').classList.add('hidden')
  clearInterval(timer)
  timer = window.setInterval(() => { if (!gameStarted) return; timeLeft--; el('#timeText').textContent = String(Math.max(0, timeLeft)); if (timeLeft <= 10) el('#timeText').classList.add('urgent'); if (timeLeft <= 0) funnyFail() }, 1000)
  renderLevel()
}
function renderLevel() {
  const scene = el('#scene'); const row = el('#characterRow')
  if (level === 1) {
    el('#levelTag').textContent = '第 1 關 · 室內'; el('#levelTitle').textContent = '胡蘿蔔不見了'; el('#objective').textContent = '找回房間裡失蹤的 5 根胡蘿蔔'; scene.className = 'scene room hidden-off'
    scene.innerHTML = `<div class="moon-window"><span>☾</span></div><div class="wall-note">兔兔房間<br><small>請勿餵食咪咪咪</small></div><div class="rug">✦　🧺　✦</div><div class="sofa">🛋️</div><div class="crate">📦</div><div class="plant">🪴</div>${sceneButton({id:'curtain',emoji:'🪟',label:'窗簾後',x:14,y:22,className:'curtain'})}${sceneButton({id:'crate',emoji:'📦',label:'神秘木箱',x:76,y:55,className:'crate-hit'})}${sceneButton({id:'sign',emoji:'🪧',label:'入口牌子',x:87,y:82,className:'sign'})}${sceneButton({id:'bunnybelly',emoji:'<img src="./characters/eat.png" alt="好吃兔" />',label:'好吃兔的肚子',x:39,y:68,className:'belly'})}${sceneButton({id:'mimi',emoji:'🟣',label:'橘色小球？',x:65,y:28,className:'mimi-item'})}`
    row.innerHTML = bunny('wake','😴','睡睡兔','叫醒找夢境') + bunny('eat','🐰','好吃兔','這個能吃嗎？') + bunny('bump','🐇','撲街兔','撞就對了') + bunny('stick','🐰','貼貼兔','黏在一起！')
    el('#hintBox').textContent = '提示：窗簾、木箱、牌子，還有一隻肚子鼓鼓的兔兔。'
  } else if (level === 2) {
    el('#levelTag').textContent = '第 2 關 · 夜間'; el('#levelTitle').textContent = '咪咪咪的惡作劇'; el('#objective').textContent = '找出 3 個異常線索，再抓住真正的咪咪咪'; scene.className = 'scene park hidden-off'
    scene.innerHTML = `<div class="stars">✦　⋆　✧　✦　⋆　✧　✦</div><div class="moon">🌕</div><div class="ferris">🎡</div><div class="carousel">🎠</div><div class="mirror">▧ ▧ ▧</div><div class="sand">✦　✦　✦　✦　✦</div><div class="cloud-stall">☁️<br><small>雲朵飲料攤</small></div>${sceneButton({id:'shadow',emoji:'🌑',label:'月光影子',x:20,y:34,className:'clue'})}${sceneButton({id:'footprints',emoji:'👣',label:'星星腳印',x:51,y:78,className:'clue'})}${sceneButton({id:'sound',emoji:'🎵',label:'音符箱',x:79,y:42,className:'clue'})}${sceneButton({id:'copies',emoji:'🟣🟣',label:'可疑分身',x:62,y:22,className:'mimi-cluster'})}${sceneButton({id:'bell',emoji:'🔔',label:'月亮鈴鐺',x:49,y:13,className:'bell'})}`
    row.innerHTML = bunny('listen','😴','睡睡兔','聽出真笑聲') + bunny('shine','😎','好帥兔','用帥氣吸引') + bunny('bump','🐇','撲街兔','彈跳撞氣球') + bunny('stick','🐰','貼貼兔','固定方向牌')
    el('#hintBox').textContent = '提示：影子、腳印、笑聲，咪咪咪有三個藏不住的破綻。'
  } else if (level === 3) {
    el('#levelTag').textContent = '第 3 關 · 廚房'; el('#levelTitle').textContent = '誰偷吃了蛋糕？'; el('#objective').textContent = '找齊 3 個蛋糕線索，抓出偷吃蛋糕的兔兔'; scene.className = 'scene kitchen hidden-off'
    scene.innerHTML = `<div class="kitchen-sign">兔兔廚房<br><small>禁止偷偷試吃（好吃兔除外？）</small></div><div class="kitchen-shelf">🍽️　🥣　🍓　🥕</div><div class="oven">♨️<br><small>烤箱</small></div><div class="cake-center">🎂</div><div class="crumb-trail">·　·　·　·　·</div>${sceneButton({id:'fridge',emoji:'🧊',label:'冰箱紙條',x:18,y:55,className:'fridge'})}${sceneButton({id:'crumbs',emoji:'🍰',label:'奶油腳印',x:54,y:78,className:'crumbs'})}${sceneButton({id:'plate',emoji:'🍽️',label:'空蛋糕盤',x:78,y:47,className:'plate'})}${sceneButton({id:'suspect',emoji:'<img src="./characters/eat.png" alt="可疑的好吃兔" />',label:'可疑好吃兔',x:76,y:76,className:'suspect'})}`
    row.innerHTML = bunny('eat','🐰','好吃兔','我只是路過蛋糕') + bunny('wake','😴','睡睡兔','夢到誰偷吃了') + bunny('bump','🐇','撲街兔','撞開冰箱') + bunny('stick','🐰','貼貼兔','黏住證物')
    el('#hintBox').textContent = '提示：檢查冰箱紙條、奶油腳印和空蛋糕盤，再質問嘴角有奶油的兔兔。'
  } else if (level === 4) {
    el('#levelTag').textContent = '第 4 關 · 月球'; el('#levelTitle').textContent = '兔兔月球漫步'; el('#objective').textContent = '收集 3 個月面異常，修好月球車並找回月兔旗'; scene.className = 'scene moonwalk hidden-off'
    scene.innerHTML = `<div class="earth-view">🌍<small>地球正在看你</small></div><div class="moon-stars">✦　·　✧　·　✦　·　✧</div><div class="moon-hills">⌒　⌒　⌒　⌒</div><div class="lunar-rover">🚙<small>月球車</small></div><div class="moon-crater crater-one">◯</div><div class="moon-crater crater-two">◯</div>${sceneButton({id:'bootprints',emoji:'👢',label:'重力靴腳印',x:20,y:70,className:'lunar-clue'})}${sceneButton({id:'battery',emoji:'🔋',label:'月球電池',x:53,y:57,className:'lunar-clue'})}${sceneButton({id:'reflection',emoji:'🌎',label:'地球倒影',x:80,y:28,className:'lunar-clue'})}${sceneButton({id:'flag',emoji:'🚩',label:'可疑月兔旗',x:70,y:70,className:'moon-flag'})}${sceneButton({id:'rover',emoji:'🛠️',label:'修理月球車',x:38,y:42,className:'rover-fix'})}`
    row.innerHTML = bunny('shine','😎','好帥兔','在月面擺無重力 pose') + bunny('bump','🐇','撲街兔','低重力彈跳') + bunny('stick','🐰','貼貼兔','黏住月兔旗') + bunny('wake','😴','睡睡兔','夢見月球秘密')
    el('#hintBox').textContent = '提示：先找重力靴腳印、月球電池和地球倒影，再修月球車辨認真正的月兔旗。'
  } else if (level === 5) {
    el('#levelTag').textContent = '第 5 關 · 溫室'; el('#levelTitle').textContent = '彩虹溫室大危機'; el('#objective').textContent = '找出 3 個植物異常，阻止失控的彩虹花'; scene.className = 'scene garden hidden-off'
    scene.innerHTML = `<div class="garden-sky">☀︎　✦　☁　✦　☀︎</div><div class="greenhouse">🌈<small>兔兔溫室</small></div><div class="rainbow-flower">🌸</div><div class="watering-can">🚿</div><div class="garden-bed">🌱　🌷　🌿　🌻</div>${sceneButton({id:'pollen',emoji:'✨',label:'發光花粉',x:18,y:31,className:'garden-clue'})}${sceneButton({id:'vine',emoji:'🌿',label:'會動藤蔓',x:55,y:67,className:'garden-clue'})}${sceneButton({id:'seed',emoji:'🌰',label:'反重力種子',x:79,y:30,className:'garden-clue'})}${sceneButton({id:'flower',emoji:'🌺',label:'彩虹花核心',x:68,y:72,className:'rainbow-core'})}${sceneButton({id:'sprinkle',emoji:'💧',label:'澆水開關',x:37,y:42,className:'sprinkle'})}`
    row.innerHTML = bunny('shine','😎','好帥兔','用閃光吸引花朵') + bunny('bump','🐇','撲街兔','撞斷失控藤蔓') + bunny('stick','🐰','貼貼兔','固定澆水開關') + bunny('wake','😴','睡睡兔','夢見種子方向')
    el('#hintBox').textContent = '提示：發光花粉、會動藤蔓、反重力種子，找到三個異常再處理彩虹花。'
  } else if (level === 6) {
    el('#levelTag').textContent = '第 6 關 · 廣播站'; el('#levelTitle').textContent = '兔兔廣播站'; el('#objective').textContent = '修復 3 個訊號零件，依序啟動廣播召回迷路的星星兔'; scene.className = 'scene broadcast hidden-off'
    scene.innerHTML = `<div class="radio-sky">✦　·　✧　·　✦　·　✧</div><div class="radio-tower">📡<small>兔兔廣播站</small></div><div class="signal-wave">〰　〰　〰</div><div class="star-bunny">🐰<small>星星兔失聯中</small></div><div class="radio-console">🎛️<small>廣播控制台</small></div>${sceneButton({id:'frequency',emoji:'📻',label:'失真的頻率',x:18,y:34,className:'signal-clue'})}${sceneButton({id:'battery',emoji:'🔋',label:'沒電的電池',x:54,y:70,className:'signal-clue'})}${sceneButton({id:'antenna',emoji:'📡',label:'歪掉的天線',x:81,y:29,className:'signal-clue'})}${sceneButton({id:'broadcast',emoji:'📣',label:'啟動廣播',x:38,y:42,className:'broadcast-switch'})}${sceneButton({id:'star',emoji:'🌟',label:'星星兔回來了',x:72,y:70,className:'star-portal'})}`
    row.innerHTML = bunny('wake','😴','睡睡兔','聽出正確頻率') + bunny('shine','😎','好帥兔','照亮天線方向') + bunny('bump','🐇','撲街兔','撞醒電池') + bunny('stick','🐰','貼貼兔','固定廣播旋鈕')
    el('#hintBox').textContent = '提示：找出頻率、電池與天線問題，再讓兔兔們合作啟動廣播。'
  } else {
    el('#levelTag').textContent = '第 7 關 · 月光舞台'; el('#levelTitle').textContent = '兔兔的秘密演唱會'; el('#objective').textContent = '修復舞台、找回月光唱片，觸發隱藏角色的合作彩蛋'; scene.className = 'scene moon-stage hidden-off'
    scene.innerHTML = `<div class="stage-stars">✦　·　✧　·　✦　·　✧　·　✦</div><div class="stage-moon">🌙<small>月光聚光燈</small></div><div class="stage-curtain">🎭</div><div class="stage-platform">🎤　🎶　🎵</div>${sceneButton({id:'spotlight',emoji:'🔦',label:'歪掉的聚光燈',x:18,y:32,className:'stage-clue'})}${sceneButton({id:'record',emoji:'💿',label:'月光唱片',x:52,y:70,className:'stage-clue'})}${sceneButton({id:'mic',emoji:'🎙️',label:'沒聲音的麥克風',x:82,y:36,className:'stage-clue'})}${sceneButton({id:'curtain',emoji:'🎭',label:'神秘幕簾',x:72,y:73,className:'secret-curtain'})}${sceneButton({id:'encore',emoji:'✨',label:'隱藏安可',x:38,y:42,className:'encore'})}`
    row.innerHTML = bunny('shine','😎','好帥兔','調整聚光燈') + bunny('wake','😴','睡睡兔','夢見唱片節拍') + bunny('stick','🐰','貼貼兔','黏好麥克風') + bunny('bump','🐇','撲街兔','撞開神秘幕簾')
    el('#hintBox').textContent = '提示：先修復三個舞台故障，再按照好帥兔 → 睡睡兔 → 貼貼兔 → 撲街兔的順序觸發隱藏彩蛋。'
  }
  updateHud()
  scene.querySelectorAll<HTMLButtonElement>('.scene-item').forEach(btn => btn.onclick = () => handleItem(btn.dataset.item!))
  document.querySelectorAll<HTMLButtonElement>('.bunny').forEach(btn => btn.onclick = () => useSkill(btn.dataset.skill!))
}
function updateHud() {
  const total = level === 1 ? 5 : level === 7 ? 4 : 3
  const current = level === 1 ? carrots.size : level === 2 ? clues.size : level === 3 ? cakeClues.size : level === 4 ? lunarClues.size : level === 5 ? gardenClues.size : level === 6 ? signalClues.size : secretCombo.length
  el('#progressText').textContent = level === 1 ? `胡蘿蔔 ${current}/5` : level === 2 ? `線索 ${current}/3` : level === 3 ? `蛋糕線索 ${current}/3` : level === 4 ? `月面異常 ${current}/3` : level === 5 ? `植物異常 ${current}/3` : level === 6 ? `訊號零件 ${current}/3` : `彩蛋步驟 ${current}/4`
  el('#progressFill').style.width = `${(current / total) * 100}%`; el('#chaosFill').style.width = `${chaos * 20}%`
}
function collectCarrot(id: string, message: string) { if (carrots.has(id)) return; carrots.add(id); score += 100; updateHud(); toast(message, 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected'); if (carrots.size >= 5) completeLevel() }
function handleItem(id: string) {
  if (!gameStarted) return
  if (level === 1) {
    if (id === 'curtain') { collectCarrot('curtain', '窗簾後找到胡蘿蔔！咪咪咪其實是襪子。'); bumpChaos() }
    else if (id === 'crate') { if (!carrots.has('crate')) { toast('木箱需要：貼貼兔 → 撲街兔 → 好吃兔。', 'funny'); el('#hintBox').textContent = '先點貼貼兔黏住木箱，再點撲街兔撞開，最後讓好吃兔吃掉封條。' } else toast('木箱裡只剩一張「好吃兔來過」的收據。') }
    else if (id === 'sign') { collectCarrot('sign', '牌子倒下了！第 3 根胡蘿蔔露出來。'); bumpChaos() }
    else if (id === 'bunnybelly') { if (!carrots.has('belly')) { toast('好吃兔打了個嗝：嗝……胡蘿蔔？', 'funny'); collectCarrot('belly', '好吃兔吐出第 4 根胡蘿蔔！') } }
    else if (id === 'mimi') { if (carrots.has('mimi')) return; if (carrots.size < 4) { toast('抓到了！……咦？這是橘色抱枕。先把其他胡蘿蔔找回來吧。'); bumpChaos(2); el('[data-item="mimi"]')?.classList.add('wiggle') } else collectCarrot('mimi', '抓到咪咪咪了！最後一根胡蘿蔔也被牠交出來。') }
    if (carrots.size === 4 && !carrots.has('mimi')) toast('最後一根被咪咪咪拿走了，快點擊紫色小球！', 'funny')
  } else if (level === 2) {
    if (id === 'shadow' || id === 'footprints' || id === 'sound') { if (!clues.has(id)) { clues.add(id); score += 150; updateHud(); toast(id === 'shadow' ? '影子慢半拍！這隻咪咪咪很可疑。' : id === 'footprints' ? '腳印是圓點，不是真咪咪咪的腳。' : '笑聲節奏是：咪、咪咪、咪！', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } if (clues.size === 3) { toast('三個線索都找齊了！點擊可疑分身找真身。', 'funny'); el('#hintBox').textContent = '現在點擊紫色分身群，辨識真正的咪咪咪。' } }
    else if (id === 'copies') { if (clues.size < 3) { toast('咪咪咪分身太多了，先找齊影子、腳印、笑聲。'); bumpChaos() } else if (!level2Solved) { level2Solved = true; score += 500; toast('抓到真的咪咪咪！但牠把鈴鐺綁在摩天輪上。', 'good'); el('#hintBox').textContent = '再點月亮鈴鐺把它取回來！' } }
    else if (id === 'bell') { if (!level2Solved) { toast('鈴鐺被彩帶綁住了，先拆穿真身。'); bumpChaos() } else completeLevel() }
  } else if (level === 3) {
    if (id === 'fridge') { if (!cakeClues.has('fridge')) { cakeClues.add('fridge'); score += 150; updateHud(); toast('冰箱紙條寫著：蛋糕不是我吃的！——一個嘴角有奶油的人', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } }
    else if (id === 'crumbs') { if (!cakeClues.has('crumbs')) { cakeClues.add('crumbs'); score += 150; updateHud(); toast('發現一串會發光的奶油腳印！', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } }
    else if (id === 'plate') { if (!cakeClues.has('plate')) { cakeClues.add('plate'); score += 150; updateHud(); toast('空蛋糕盤上留著一個兔兔牙印，還有三顆草莓不見了。', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } }
    else if (id === 'suspect') { if (cakeClues.size < 3) { toast('可疑好吃兔正在裝沒事，先收集冰箱、腳印和空盤線索。'); bumpChaos() } else if (!level3Solved) { level3Solved = true; score += 500; playCakeBiteSound(); document.querySelector('[data-item="suspect"]')?.classList.add('cake-bite'); toast('抓到了！好吃兔嘴角沾滿奶油，還問要不要再切一片！', 'good'); el('#hintBox').textContent = '好吃兔承認了：蛋糕很好吃。' } else { playCakeBiteSound(); toast('喀滋、喀滋！好吃兔把最後一口蛋糕也吃掉了。', 'funny') } }
  } else if (level === 4) {
    if (id === 'bootprints' || id === 'battery' || id === 'reflection') { if (!lunarClues.has(id)) { lunarClues.add(id); score += 180; updateHud(); const msg = id === 'bootprints' ? '腳印一深一淺，月兔好像偷偷在月面跳舞。' : id === 'battery' ? '撿到月球電池！上面貼著咪咪咪的惡作劇貼紙。' : '地球倒影裡有一面反方向的月兔旗。'; toast(msg, 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } if (lunarClues.size === 3) el('#hintBox').textContent = '三個月面異常都找到了！先修理月球車，再檢查可疑月兔旗。' }
    else if (id === 'rover') { if (lunarClues.size < 3) { toast('月球車拒絕發動：它需要三個月面異常當作維修線索。'); bumpChaos() } else { score += 300; document.querySelector('[data-item="rover"]')?.classList.add('rover-fixed'); toast('月球車修好了！它用低重力模式把你彈到月兔旗旁。', 'good'); el('#hintBox').textContent = '現在點擊可疑月兔旗，辨認真正的月兔。' } }
    else if (id === 'flag') { if (lunarClues.size < 3) { toast('這面旗子一直倒著飄，先找出三個月面異常。'); bumpChaos() } else if (!level4Solved) { level4Solved = true; score += 600; document.querySelector('[data-item="flag"]')?.classList.add('flag-found'); toast('找到真正的月兔旗！咪咪咪把它倒著插在月球上了。', 'good'); el('#hintBox').textContent = '任務完成！兔兔們正在低重力跳舞。再點月兔旗看特效。' } else { document.querySelector('[data-item="flag"]')?.classList.add('moon-bounce'); toast('兔兔月球漫步成功！大家一起跳到地球背面。', 'funny'); completeLevel() } }
  }
  else if (level === 5) {
    if (id === 'pollen' || id === 'vine' || id === 'seed') { if (!gardenClues.has(id)) { gardenClues.add(id); score += 180; updateHud(); toast(id === 'pollen' ? '花粉會排成箭頭，指向彩虹花的核心。' : id === 'vine' ? '藤蔓正在偷偷數兔子，這一定不正常。' : '種子飄在半空中，溫室的重力壞掉了！', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } if (gardenClues.size === 3) el('#hintBox').textContent = '三個植物異常都找到了！先打開澆水開關，再點彩虹花核心。' }
    else if (id === 'sprinkle') { if (gardenClues.size < 3) { toast('澆水開關卡住了，先調查三個植物異常。'); bumpChaos() } else { score += 300; document.querySelector('[data-item="sprinkle"]')?.classList.add('sprinkled'); toast('彩虹水灑滿溫室！失控的花朵暫時安靜了。', 'good'); el('#hintBox').textContent = '彩虹花露出核心了，點它完成最後任務！' } }
    else if (id === 'flower') { if (gardenClues.size < 3) { toast('彩虹花正在打噴嚏，先調查周圍的植物異常。'); bumpChaos() } else if (!level5Solved) { level5Solved = true; score += 700; playCakeBiteSound(); document.querySelector('[data-item="flower"]')?.classList.add('flower-calm'); toast('溫室危機解除！彩虹花變成了大家的舞台。', 'good'); el('#hintBox').textContent = '第五關完成！再點一次彩虹花，看看兔兔的慶祝舞。' } else completeLevel() }
  } else if (level === 6) {
    if (id === 'frequency' || id === 'battery' || id === 'antenna') { if (!signalClues.has(id)) { signalClues.add(id); score += 200; updateHud(); toast(id === 'frequency' ? '頻率歪了一格，星星兔的歌聲從雜訊裡傳出來了。' : id === 'battery' ? '電池還有一點點電，撲街兔可以把它撞醒。' : '天線指向棉花糖星，應該要轉向月亮。', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') } if (signalClues.size === 3) el('#hintBox').textContent = '三個訊號零件都找到了！先啟動廣播，再點星星兔確認訊號。' }
    else if (id === 'broadcast') { if (signalClues.size < 3) { toast('控制台缺少訊號零件，先調查頻率、電池和天線。'); bumpChaos() } else { score += 350; document.querySelector('[data-item="broadcast"]')?.classList.add('broadcast-on'); toast('廣播啟動！請照順序喊：咪、咪咪、咪！', 'good'); el('#hintBox').textContent = '訊號已發出，點擊星星兔把牠召回來。' } }
    else if (id === 'star') { if (signalClues.size < 3) { toast('星星兔聽不清楚你的位置，先修好廣播站。'); bumpChaos() } else if (!level6Solved) { level6Solved = true; score += 800; playCakeBiteSound(); document.querySelector('[data-item="star"]')?.classList.add('star-home'); toast('星星兔沿著廣播訊號回來了！第六關完成！', 'good'); el('#hintBox').textContent = '星星兔找到回家的路，兔兔廣播站也恢復正常了。再點一次看慶祝效果。' } else completeLevel() }
  } else {
    if (id === 'spotlight' || id === 'record' || id === 'mic') { if (!secretCombo.includes(id)) { secretCombo.push(id); score += 180; updateHud(); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected'); toast(id === 'spotlight' ? '聚光燈轉向月亮，舞台亮起銀色邊緣。' : id === 'record' ? '月光唱片開始轉動，裡面藏著一段熟悉的哼歌。' : '麥克風恢復聲音，傳出：咪、咪咪、咪！', 'good') } if (secretCombo.length === 3) el('#hintBox').textContent = '舞台修好了！現在依序使用四隻兔兔，神秘幕簾後有一位客人。' }
    else if (id === 'curtain') { if (secretCombo.length < 3) { toast('幕簾後的角色說：先把舞台修好，我才敢出場。'); bumpChaos() } else if (secretCombo.length < 4) { secretCombo.push('curtain'); score += 400; updateHud(); document.querySelector('[data-item="curtain"]')?.classList.add('curtain-open'); toast('幕簾掀開一角！裡面藏著戴星星帽的咪咪咪。', 'funny'); el('#hintBox').textContent = '彩蛋只差最後一步：四隻兔兔要按照提示合作。' } }
    else if (id === 'encore') { if (secretCombo.length < 4 || roleCombo.length < 4) { toast('隱藏安可還沒準備好，先完成四隻兔兔的合作順序。'); bumpChaos() } else if (!level7Solved) { level7Solved = true; score += 1000; playCakeBiteSound(); document.querySelector('[data-item="encore"]')?.classList.add('encore-live'); toast('隱藏彩蛋觸發！咪咪咪戴著星星帽登台，和兔兔們合唱了！', 'good'); el('#hintBox').textContent = '第七關完成！你找到了隱藏角色互動彩蛋，再點一次看安可。' } else completeLevel() }
  }
}
function useSkill(skill: string) {
  if (level === 1) { if (skill === 'wake') { toast('睡睡兔夢到：黃色的地方、藍色的東西……'); el('#hintBox').textContent = '夢境提示：木箱和窗簾附近都有線索。' } if (skill === 'eat') { if (!carrots.has('crate')) collectCarrot('crate', '好吃兔吃掉封條，木箱裡有胡蘿蔔！'); else toast('好吃兔：沒有東西吃，我要開始吃 UI 了。', 'funny') } if (skill === 'bump') { toast('撲街兔完成戰術翻滾，木箱被撞開！', 'funny'); if (!carrots.has('crate')) collectCarrot('crate', '木箱裡找到第 2 根胡蘿蔔！') } if (skill === 'stick') { toast('貼貼兔：我們和木箱成為朋友了！', 'funny'); el('[data-item="crate"]')?.classList.add('stuck'); el('#hintBox').textContent = '木箱已被黏住，現在讓撲街兔撞它。' } }
  else if (level === 2) { if (skill === 'listen') { toast('睡睡兔聽見：咪、咪咪、咪！真身在分身群裡。'); if (!clues.has('sound')) { clues.add('sound'); updateHud() } } if (skill === 'shine') { toast('好帥兔開始擺 pose，咪咪咪忍不住靠近了！', 'funny'); el('[data-item="copies"]')?.classList.add('attracted') } if (skill === 'bump') { toast('撲街兔飛上天，撞破星星氣球！', 'funny'); bumpChaos() } if (skill === 'stick') { toast('貼貼兔固定了方向牌：世界暫時不會轉錯。', 'good'); document.querySelector('.mirror')?.classList.add('fixed') } }
  else if (level === 3) { if (skill === 'eat') { playCakeBiteSound(); document.querySelector('[data-item="suspect"]')?.classList.add('cake-bite'); toast('好吃兔先偷咬一口蛋糕：喀滋！', 'funny') } if (skill === 'wake') { toast('睡睡兔夢到：一隻嘴角有奶油的兔子在說夢話。'); el('#hintBox').textContent = '夢境提示：好吃兔的嘴角，還有三個蛋糕線索。' } if (skill === 'bump') { toast('撲街兔撞開冰箱，紙條飛到天花板上！', 'funny'); handleItem('fridge') } if (skill === 'stick') { toast('貼貼兔把蛋糕盤黏在桌上，證物不會跑了！', 'good'); handleItem('plate') } }
  else if (level === 4) { if (skill === 'shine') { toast('好帥兔在月面擺出零重力 pose，整個人飄起來了！', 'funny'); document.querySelector('.moonwalk')?.classList.add('low-gravity') } if (skill === 'bump') { toast('撲街兔一蹬地面，跳了三秒才落地！', 'funny'); bumpChaos(); document.querySelector('.moonwalk')?.classList.add('low-gravity') } if (skill === 'stick') { toast('貼貼兔把月兔旗黏好，旗子終於不再倒著飄。', 'good'); handleItem('flag') } if (skill === 'wake') { toast('睡睡兔夢見：月球車的電池藏在星星旁邊。'); el('#hintBox').textContent = '月面夢境提示：三個異常線索可以讓月球車重新啟動。' } }
  else if (level === 5) { if (skill === 'shine') { toast('好帥兔閃到彩虹花睜不開眼！', 'funny'); document.querySelector('.rainbow-core')?.classList.add('dazzled') } if (skill === 'bump') { toast('撲街兔撞斷藤蔓，溫室響起啪的一聲！', 'funny'); bumpChaos(); handleItem('vine') } if (skill === 'stick') { toast('貼貼兔把澆水開關黏在正確位置。', 'good'); handleItem('sprinkle') } if (skill === 'wake') { toast('睡睡兔夢見：種子往上飄，就是重力壞掉的證據。'); el('#hintBox').textContent = '夢境提示：先調查三個異常，再打開澆水開關。' } }
  else if (level === 6) { if (skill === 'wake') { toast('睡睡兔閉上眼，聽見正確頻率：咪、咪咪、咪！', 'good'); handleItem('frequency') } if (skill === 'shine') { toast('好帥兔照亮天線，影子指向月亮！', 'funny'); handleItem('antenna') } if (skill === 'bump') { toast('撲街兔撞醒電池，廣播站亮起一盞燈！', 'funny'); handleItem('battery') } if (skill === 'stick') { toast('貼貼兔固定廣播旋鈕，雜訊終於不再亂跳。', 'good'); handleItem('broadcast') } }
  else { const expected = ['shine', 'wake', 'stick', 'bump']; if (!secretCombo.includes('curtain')) { toast('舞台彩蛋還沒開放，先修好聚光燈、唱片和麥克風。'); bumpChaos() } else if (roleCombo.length >= 4) { toast('四隻兔兔已經在台上合唱，安可按鈕閃閃發亮！', 'funny') } else if (skill !== expected[roleCombo.length]) { roleCombo = []; updateHud(); toast('順序不對！舞台提示是：好帥兔 → 睡睡兔 → 貼貼兔 → 撲街兔。', 'funny'); el('#hintBox').textContent = '合作順序重置，從好帥兔開始。' } else { roleCombo.push(skill); score += 250; updateHud(); toast(roleCombo.length === 4 ? '四兔和聲完成！隱藏安可已解鎖！' : `第 ${roleCombo.length}/4 個和聲完成。`, 'good'); el('#hintBox').textContent = roleCombo.length === 4 ? '安可已解鎖！點擊隱藏安可，看看幕簾後的咪咪咪。' : `合作節拍 ${roleCombo.length}/4，下一位是${expected[roleCombo.length] === 'wake' ? '睡睡兔' : expected[roleCombo.length] === 'stick' ? '貼貼兔' : '撲街兔'}。` } }
}
  function giveHint() { jokeIndex = (jokeIndex + 1) % jokes.length; toast(jokes[jokeIndex], 'funny'); if (level === 1) el('#hintBox').textContent = '提示：先處理木箱連鎖謎題，再注意好吃兔鼓起來的肚子。'; else if (level === 2) el('#hintBox').textContent = '提示：真的咪咪咪的影子、腳印、笑聲都有一點不對勁。'; else if (level === 3) el('#hintBox').textContent = '提示：冰箱紙條、奶油腳印、空蛋糕盤，最後質問好吃兔。'; else if (level === 4) el('#hintBox').textContent = '提示：重力靴腳印、月球電池、地球倒影，最後修好月球車找月兔旗。'; else if (level === 5) el('#hintBox').textContent = '提示：發光花粉、會動藤蔓、反重力種子，最後打開澆水開關。'; else if (level === 6) el('#hintBox').textContent = '提示：頻率、電池、天線都修好後，讓貼貼兔啟動廣播，再找星星兔。'; else el('#hintBox').textContent = '提示：修好舞台後，依序使用好帥兔、睡睡兔、貼貼兔、撲街兔，最後點隱藏安可。' }
  function completeLevel() { gameStarted = false; clearInterval(timer); addCoins(5); toast('獲得 5 枚胡蘿蔔幣！可以去兔兔道具店逛逛。', 'good'); if (level === 1) { toast('5 根胡蘿蔔全部找回來了！', 'good'); window.setTimeout(() => startLevel(2), 1200) } else if (level === 2) { toast('月亮鈴鐺找回來了！廚房傳來可疑香味。', 'good'); window.setTimeout(() => startLevel(3), 1200) } else if (level === 3) { toast('蛋糕案破案了！月球上傳來新的求救訊號。', 'good'); window.setTimeout(() => startLevel(4), 1200) } else if (level === 4) { toast('月兔旗找回來了！溫室傳來彩虹警報。', 'good'); window.setTimeout(() => startLevel(5), 1200) } else if (level === 5) { toast('彩虹花安靜下來了！廣播站傳來求救訊號。', 'good'); window.setTimeout(() => startLevel(6), 1200) } else if (level === 6) { toast('星星兔回家了！月光舞台正在準備秘密演出。', 'good'); window.setTimeout(() => startLevel(7), 1200) } else showFinish(true) }
function funnyFail() { gameStarted = false; clearInterval(timer); showFinish(false) }
function showFinish(won: boolean) { el('#scene').classList.add('hidden'); el('#bottomPanel').classList.add('hidden'); if (won && score > bestScore) { bestScore = score; localStorage.setItem('mimimimi-best-score', String(score)); el('#bestScoreText').textContent = String(score) } const finish = el('#finish'); finish.classList.remove('hidden'); finish.innerHTML = won ? `<div class="finish-card"><div class="celebrate">🐰 🥕 🐇 🔔 🎂 🌙 🌈 📡 🌟 🎤 ✨</div><span class="eyebrow">MISSION COMPLETE</span><h2>七關都破解了！</h2><p>七個兔兔任務全部完成，還找到了咪咪咪戴星星帽登台的隱藏互動彩蛋！</p><div class="score-card">本次得分 <strong>${score}</strong><small>最高紀錄：${bestScore} 分 · 兔兔評語：訊號滿格，蛋糕也還剩一口。</small></div><div class="finish-actions"><button class="big-btn" id="againBtn">再玩一次</button><button class="soft-btn" id="titleBtn">回到標題</button></div></div>` : `<div class="finish-card"><div class="celebrate">😴 🐰 💤 🍰</div><span class="eyebrow">RABBIT BREAK TIME</span><h2>大家決定先休息一下</h2><p>時間到了，但沒有關係。兔兔們正在夢裡繼續解謎。</p><div class="finish-actions"><button class="big-btn" id="againBtn">重新挑戰</button><button class="soft-btn" id="titleBtn">回到標題</button></div></div>`; el<HTMLButtonElement>('#againBtn').onclick = () => startLevel(1); el<HTMLButtonElement>('#titleBtn').onclick = () => { finish.classList.add('hidden'); el('#hud').classList.add('hidden'); el('#titleCard').classList.remove('hidden'); gameStarted = false } }

renderShell()
window.addEventListener('pointerdown', () => { if (musicOn && audio.paused) audio.play().catch(() => undefined) }, { once: false })
