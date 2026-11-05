import './styles/main.css'

type Level = 1 | 2
type Item = { id: string; emoji: string; label: string; x: number; y: number; className?: string }

const root = document.getElementById('ui')!
const audio = new Audio('./bgm-bunny.mp3')
audio.loop = true
audio.volume = 0.32
let musicOn = false
let level: Level = 1
let carrots = new Set<string>()
let clues = new Set<string>()
let chaos = 0
let score = 0
let timeLeft = 90
let timer: number | undefined
let jokeIndex = 0
let gameStarted = false
let level2Solved = false

const jokes = [
  '撲街兔表示：這是戰術，不是跌倒！',
  '好吃兔正在確認這個按鈕能不能吃。',
  '貼貼兔和木箱成為了永遠的朋友。',
  '睡睡兔說：我剛剛在夢裡已經解完了。',
  '咪咪咪：抓不到我吧！其實我也不知道我在哪。',
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
function setMusic(on: boolean) {
  musicOn = on
  el<HTMLButtonElement>('#musicToggle').textContent = on ? '♫ 音樂 ON' : '♫ 音樂 OFF'
  if (on) audio.play().catch(() => toast('點一下畫面就可以解鎖配樂喔！'))
  else audio.pause()
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
      <header class="topbar">
        <div class="brand"><span class="brand-mark">🥕</span><div><strong>咪咪咪大作戰</strong><small>兔兔村今天也很不安分</small></div></div>
        <div class="top-actions"><button class="pill" id="musicToggle">♫ 音樂 OFF</button><button class="pill" id="helpBtn">？提示</button></div>
      </header>
      <section class="title-card" id="titleCard">
        <div class="title-bunnies"><img src="./characters/stick.png" alt="貼貼兔" /><img src="./characters/sleep.png" alt="睡睡兔" /><img src="./characters/mimi.png" alt="咪咪咪" /></div>
        <p class="eyebrow">BUNNY MAYHEM · 兔兔解謎小遊戲</p>
        <h1>咪咪咪大作戰</h1>
        <p>找回胡蘿蔔、拆穿惡作劇，還要阻止好吃兔把任務吃掉。</p>
        <div class="title-actions"><button class="big-btn" id="startBtn">開始大作戰 <span>→</span></button><button class="soft-btn" id="howBtn">玩法說明</button></div>
      </section>
      <section class="hud hidden" id="hud">
        <div><span class="level-tag" id="levelTag">第 1 關</span><h2 id="levelTitle">胡蘿蔔不見了</h2><p id="objective">找回房間裡失蹤的 5 根胡蘿蔔</p></div>
        <div class="stats"><div><b id="progressText">胡蘿蔔 0/5</b><div class="mini-progress"><i id="progressFill"></i></div></div><div><b>混亂值</b><div class="chaos"><i id="chaosFill"></i></div></div><div class="time">⏱ <b id="timeText">90</b></div></div>
      </section>
      <section class="scene hidden" id="scene"></section>
      <section class="bottom-panel hidden" id="bottomPanel"><div class="character-row" id="characterRow"></div><div class="hint-box" id="hintBox">點擊場景中的物件，兔兔會自己想辦法。</div></section>
      <section class="finish hidden" id="finish"></section>
      <div id="toasts" aria-live="polite"></div>
    </main>`
  el<HTMLButtonElement>('#musicToggle').onclick = () => setMusic(!musicOn)
  el<HTMLButtonElement>('#startBtn').onclick = () => startLevel(1)
  el<HTMLButtonElement>('#howBtn').onclick = () => toast('第一關找 5 根胡蘿蔔；第二關收集 3 個線索後抓真的咪咪咪。', 'funny')
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
  carrots = new Set()
  clues = new Set()
  chaos = 0
  score = 0
  timeLeft = next === 1 ? 90 : 105
  level2Solved = false
  gameStarted = true
  el('#titleCard').classList.add('hidden')
  el('#hud').classList.remove('hidden')
  el('#scene').classList.remove('hidden')
  el('#bottomPanel').classList.remove('hidden')
  el('#finish').classList.add('hidden')
  clearInterval(timer)
  timer = window.setInterval(() => {
    if (!gameStarted) return
    timeLeft--
    el('#timeText').textContent = String(Math.max(0, timeLeft))
    if (timeLeft <= 10) el('#timeText').classList.add('urgent')
    if (timeLeft <= 0) funnyFail()
  }, 1000)
  renderLevel()
}
function renderLevel() {
  const scene = el('#scene')
  const row = el('#characterRow')
  if (level === 1) {
    el('#levelTag').textContent = '第 1 關 · 室內'
    el('#levelTitle').textContent = '胡蘿蔔不見了'
    el('#objective').textContent = '找回房間裡失蹤的 5 根胡蘿蔔'
    scene.className = 'scene room hidden-off'
    scene.innerHTML = `<div class="moon-window"><span>☾</span></div><div class="wall-note">兔兔房間<br><small>請勿餵食咪咪咪</small></div><div class="rug">✦　🧺　✦</div><div class="sofa">🛋️</div><div class="crate">📦</div><div class="plant">🪴</div>${sceneButton({id:'curtain',emoji:'🪟',label:'窗簾後',x:14,y:22,className:'curtain'})}${sceneButton({id:'crate',emoji:'📦',label:'神秘木箱',x:76,y:55,className:'crate-hit'})}${sceneButton({id:'sign',emoji:'🪧',label:'入口牌子',x:87,y:82,className:'sign'})}${sceneButton({id:'bunnybelly',emoji:'🐰',label:'好吃兔的肚子',x:39,y:68,className:'belly'})}${sceneButton({id:'mimi',emoji:'🟣',label:'橘色小球？',x:65,y:28,className:'mimi-item'})}`
    row.innerHTML = bunny('wake','😴','睡睡兔','叫醒找夢境') + bunny('eat','🐰','好吃兔','這個能吃嗎？') + bunny('bump','🐇','撲街兔','撞就對了') + bunny('stick','🐰','貼貼兔','黏在一起！')
    el('#hintBox').textContent = '提示：窗簾、木箱、牌子，還有一隻肚子鼓鼓的兔兔。'
  } else {
    el('#levelTag').textContent = '第 2 關 · 夜間'
    el('#levelTitle').textContent = '咪咪咪的惡作劇'
    el('#objective').textContent = '找出 3 個異常線索，再抓住真正的咪咪咪'
    scene.className = 'scene park hidden-off'
    scene.innerHTML = `<div class="stars">✦　⋆　✧　✦　⋆　✧　✦</div><div class="moon">🌕</div><div class="ferris">🎡</div><div class="carousel">🎠</div><div class="mirror">▧ ▧ ▧</div><div class="sand">✦　✦　✦　✦　✦</div><div class="cloud-stall">☁️<br><small>雲朵飲料攤</small></div>${sceneButton({id:'shadow',emoji:'🌑',label:'月光影子',x:20,y:34,className:'clue'})}${sceneButton({id:'footprints',emoji:'👣',label:'星星腳印',x:51,y:78,className:'clue'})}${sceneButton({id:'sound',emoji:'🎵',label:'音符箱',x:79,y:42,className:'clue'})}${sceneButton({id:'copies',emoji:'🟣🟣',label:'可疑分身',x:62,y:22,className:'mimi-cluster'})}${sceneButton({id:'bell',emoji:'🔔',label:'月亮鈴鐺',x:49,y:13,className:'bell'})}`
    row.innerHTML = bunny('listen','😴','睡睡兔','聽出真笑聲') + bunny('shine','😎','好帥兔','用帥氣吸引') + bunny('bump','🐇','撲街兔','彈跳撞氣球') + bunny('stick','🐰','貼貼兔','固定方向牌')
    el('#hintBox').textContent = '提示：影子、腳印、笑聲，咪咪咪有三個藏不住的破綻。'
  }
  updateHud()
  scene.querySelectorAll<HTMLButtonElement>('.scene-item').forEach(btn => btn.onclick = () => handleItem(btn.dataset.item!))
  document.querySelectorAll<HTMLButtonElement>('.bunny').forEach(btn => btn.onclick = () => useSkill(btn.dataset.skill!))
}
function updateHud() {
  const total = level === 1 ? 5 : 3
  const current = level === 1 ? carrots.size : clues.size
  el('#progressText').textContent = level === 1 ? `胡蘿蔔 ${current}/5` : `線索 ${current}/3`
  el('#progressFill').style.width = `${(current / total) * 100}%`
  el('#chaosFill').style.width = `${chaos * 20}%`
}
function collectCarrot(id: string, message: string) {
  if (carrots.has(id)) return
  carrots.add(id); score += 100
  updateHud(); toast(message, 'good')
  const item = document.querySelector(`[data-item="${id}"]`)
  item?.classList.add('collected')
  if (carrots.size >= 5) completeLevel()
}
function handleItem(id: string) {
  if (!gameStarted) return
  if (level === 1) {
    if (id === 'curtain') { collectCarrot('curtain', '窗簾後找到胡蘿蔔！咪咪咪其實是襪子。'); bumpChaos() }
    else if (id === 'crate') { if (!carrots.has('crate')) { toast('木箱需要：貼貼兔 → 撲街兔 → 好吃兔。', 'funny'); el('#hintBox').textContent = '先點貼貼兔黏住木箱，再點撲街兔撞開，最後讓好吃兔吃掉封條。' } else toast('木箱裡只剩一張「好吃兔來過」的收據。') }
    else if (id === 'sign') { collectCarrot('sign', '牌子倒下了！第 3 根胡蘿蔔露出來。'); bumpChaos() }
    else if (id === 'bunnybelly') { if (!carrots.has('belly')) { toast('好吃兔打了個嗝：嗝……胡蘿蔔？', 'funny'); collectCarrot('belly', '好吃兔吐出第 4 根胡蘿蔔！') } }
    else if (id === 'mimi') {
      if (carrots.has('mimi')) return
      if (carrots.size < 4) {
        toast('抓到了！……咦？這是橘色抱枕。先把其他胡蘿蔔找回來吧。')
        bumpChaos(2)
        el('[data-item="mimi"]')?.classList.add('wiggle')
      } else {
        collectCarrot('mimi', '抓到咪咪咪了！最後一根胡蘿蔔也被牠交出來。')
      }
    }
    if (carrots.size === 4 && !carrots.has('mimi')) toast('最後一根被咪咪咪拿走了，快點擊紫色小球！', 'funny')
  } else {
    if (id === 'shadow' || id === 'footprints' || id === 'sound') {
      if (!clues.has(id)) { clues.add(id); score += 150; updateHud(); toast(id === 'shadow' ? '影子慢半拍！這隻咪咪咪很可疑。' : id === 'footprints' ? '腳印是圓點，不是真咪咪咪的腳。' : '笑聲節奏是：咪、咪咪、咪！', 'good'); document.querySelector(`[data-item="${id}"]`)?.classList.add('collected') }
      if (clues.size === 3) { toast('三個線索都找齊了！點擊可疑分身找真身。', 'funny'); el('#hintBox').textContent = '現在點擊紫色分身群，辨識真正的咪咪咪。' }
    } else if (id === 'copies') {
      if (clues.size < 3) { toast('咪咪咪分身太多了，先找齊影子、腳印、笑聲。'); bumpChaos() }
      else if (!level2Solved) { level2Solved = true; score += 500; toast('抓到真的咪咪咪！但牠把鈴鐺綁在摩天輪上。', 'good'); el('#hintBox').textContent = '再點月亮鈴鐺把它取回來！' }
    } else if (id === 'bell') {
      if (!level2Solved) { toast('鈴鐺被彩帶綁住了，先拆穿真身。'); bumpChaos() }
      else completeLevel()
    }
  }
}
function useSkill(skill: string) {
  if (level === 1) {
    if (skill === 'wake') { toast('睡睡兔夢到：黃色的地方、藍色的東西……'); el('#hintBox').textContent = '夢境提示：木箱和窗簾附近都有線索。' }
    if (skill === 'eat') { if (!carrots.has('crate')) { collectCarrot('crate', '好吃兔吃掉封條，木箱裡有胡蘿蔔！') } else toast('好吃兔：沒有東西吃，我要開始吃 UI 了。', 'funny') }
    if (skill === 'bump') { toast('撲街兔完成戰術翻滾，木箱被撞開！', 'funny'); if (!carrots.has('crate')) collectCarrot('crate', '木箱裡找到第 2 根胡蘿蔔！') }
    if (skill === 'stick') { toast('貼貼兔：我們和木箱成為朋友了！', 'funny'); el('[data-item="crate"]')?.classList.add('stuck'); el('#hintBox').textContent = '木箱已被黏住，現在讓撲街兔撞它。' }
  } else {
    if (skill === 'listen') { toast('睡睡兔聽見：咪、咪咪、咪！真身在分身群裡。'); if (!clues.has('sound')) { clues.add('sound'); updateHud() } }
    if (skill === 'shine') { toast('好帥兔開始擺 pose，咪咪咪忍不住靠近了！', 'funny'); el('[data-item="copies"]')?.classList.add('attracted') }
    if (skill === 'bump') { toast('撲街兔飛上天，撞破星星氣球！', 'funny'); bumpChaos() }
    if (skill === 'stick') { toast('貼貼兔固定了方向牌：世界暫時不會轉錯。', 'good'); document.querySelector('.mirror')?.classList.add('fixed') }
  }
}
function giveHint() {
  jokeIndex = (jokeIndex + 1) % jokes.length
  toast(jokes[jokeIndex], 'funny')
  if (level === 1) el('#hintBox').textContent = '提示：先處理木箱連鎖謎題，再注意好吃兔鼓起來的肚子。'
  else el('#hintBox').textContent = '提示：真的咪咪咪的影子、腳印、笑聲都有一點不對勁。'
}
function completeLevel() {
  gameStarted = false
  clearInterval(timer)
  if (level === 1) {
    toast('5 根胡蘿蔔全部找回來了！', 'good')
    window.setTimeout(() => startLevel(2), 1200)
  } else {
    showFinish(true)
  }
}
function funnyFail() {
  gameStarted = false
  clearInterval(timer)
  showFinish(false)
}
function showFinish(won: boolean) {
  el('#scene').classList.add('hidden')
  el('#bottomPanel').classList.add('hidden')
  const finish = el('#finish')
  finish.classList.remove('hidden')
  finish.innerHTML = won ? `<div class="finish-card"><div class="celebrate">🐰 🥕 🐇 🔔 🐰</div><span class="eyebrow">MISSION COMPLETE</span><h2>咪咪咪被抓到了！</h2><p>月亮鈴鐺找回來了，但咪咪咪好像正在計畫交換大家的耳朵。</p><div class="score-card">本次得分 <strong>${score}</strong><small>兔兔評語：成功，但過程非常不必要。</small></div><div class="finish-actions"><button class="big-btn" id="againBtn">再玩一次</button><button class="soft-btn" id="titleBtn">回到標題</button></div></div>` : `<div class="finish-card"><div class="celebrate">😴 🐰 💤 🟣</div><span class="eyebrow">RABBIT BREAK TIME</span><h2>大家決定先休息一下</h2><p>時間到了，但沒有關係。兔兔們正在夢裡繼續解謎。</p><div class="finish-actions"><button class="big-btn" id="againBtn">重新挑戰</button><button class="soft-btn" id="titleBtn">回到標題</button></div></div>`
  el<HTMLButtonElement>('#againBtn').onclick = () => startLevel(1)
  el<HTMLButtonElement>('#titleBtn').onclick = () => { finish.classList.add('hidden'); el('#hud').classList.add('hidden'); el('#titleCard').classList.remove('hidden'); gameStarted = false }
}

renderShell()
window.addEventListener('pointerdown', () => { if (musicOn && audio.paused) audio.play().catch(() => undefined) }, { once: false })
