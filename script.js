/**
 * RUNNER v1.1 — terminal endless runner
 * — Aguarda tecla/tap para iniciar (estado idle)
 * — Espaço ou P pausam/retomam
 * — Game over exibe top 10 inline
 * — Ranking via JSONBin.io
 */

(() => {
  "use strict";

  // ─── JSONBin ─────────────────────────────────────────────
  const JSONBIN = {
    BIN_ID:     "6a50fcc2f5f4af5e297d002e",
    ACCESS_KEY: "$2a$10$HfJ4vU09iPKKfcRBEGQsp.XDvkfZhagK/QAhuUh1QPtfsUrg.7I62",
    get URL()  { return `https://api.jsonbin.io/v3/b/${this.BIN_ID}`; },
  };

  const PLAYER_KEY  = "runner:player";
  const MAX_RANKING = 10;

  // ─── canvas ──────────────────────────────────────────────
  const canvas = document.getElementById("board");
  const ctx    = canvas.getContext("2d");

  const CANVAS_H = 160;
  let   CANVAS_W = 860;

  function resizeCanvas() {
    CANVAS_W = canvas.parentElement.clientWidth || 860;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    if (state !== "running") drawScene();
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // ─── paleta ──────────────────────────────────────────────
  const C = {
    bg: "#0a0d0a", ground: "#2a3a2a",
    phosphor: "#5fff8f", bright: "#aaffc4", dim: "#2a9956",
    amber: "#ffb238", danger: "#ff4d4d", gold: "#ffd700",
    sky1: "#0d110c", sky2: "#0a0d0a",
  };

  // ─── constantes ──────────────────────────────────────────
  const GROUND_Y = CANVAS_H - 28;
  const GRAVITY  = 0.55;
  const JUMP_VEL = -11;
  const DUCK_H   = 18;
  const STAND_H  = 30;
  const PLAYER_W = 20;
  const PLAYER_X = 60;

  // ─── estado ──────────────────────────────────────────────
  // "idle" | "running" | "paused" | "gameover"
  let state      = "idle";
  let score      = 0;
  let hiScore    = 0;
  let gameLevel  = 1;
  let speed      = 4.5;
  let frameCount = 0;
  let animFrame  = null;
  let currentPlayer = "";
  let statsOpen  = false;
  let nextObstacleIn = 80;

  let player = {}, obstacles = [], stars = [], particles = [], groundDeco = [];

  // ─── DOM ─────────────────────────────────────────────────
  const scoreEl            = document.getElementById("score");
  const hiScoreEl          = document.getElementById("high-score");
  const levelEl            = document.getElementById("level-display");
  const statusEl           = document.getElementById("status-line");
  const playerNameEl       = document.getElementById("player-name");
  const changePlayerBtn    = document.getElementById("change-player-btn");
  const playerOverlay      = document.getElementById("player-overlay");
  const playerInput        = document.getElementById("player-input");
  const playerError        = document.getElementById("player-input-error");
  const playerConfirm      = document.getElementById("player-confirm-btn");
  const gameoverOverlay    = document.getElementById("gameover-overlay");
  const gameoverMsg        = document.getElementById("gameover-message");
  const gameoverDetail     = document.getElementById("gameover-detail");
  const winRecord          = document.getElementById("win-record");
  const gameoverRankingEl  = document.getElementById("gameover-ranking-content");
  const gameoverRefreshBtn = document.getElementById("gameover-refresh-btn");
  const restartBtn         = document.getElementById("restart-btn");
  const btnJump            = document.getElementById("btn-jump");
  const btnDuck            = document.getElementById("btn-duck");
  const statsToggleBtn     = document.getElementById("stats-toggle-btn");
  const statsPanel         = document.getElementById("stats-panel");
  const statsContent       = document.getElementById("stats-content");
  const statsRefreshBtn    = document.getElementById("stats-refresh-btn");
  const pauseBanner        = document.getElementById("pause-banner");

  // ─── init ────────────────────────────────────────────────

  function initStars() {
    stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * (GROUND_Y - 20),
      r: Math.random() < 0.3 ? 1.2 : 0.6,
      alpha: 0.1 + Math.random() * 0.35,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function initGroundDeco() {
    groundDeco = [];
    for (let x = 0; x < CANVAS_W + 80; x += 18 + Math.random() * 30) {
      groundDeco.push({ x, h: 2 + Math.random() * 4 });
    }
  }

  function resetGame() {
    score = 0; gameLevel = 1; speed = 4.5;
    frameCount = 0; obstacles = []; particles = []; nextObstacleIn = 80;

    player = {
      x: PLAYER_X, y: GROUND_Y - STAND_H,
      w: PLAYER_W, h: STAND_H,
      vy: 0, onGround: true, ducking: false,
      jumpCount: 0, frame: 0, frameTimer: 0,
    };

    scoreEl.textContent = "00000";
    levelEl.textContent = "01";
    gameoverOverlay.classList.remove("is-visible");
    pauseBanner.hidden = true;
    initStars();
    initGroundDeco();
  }

  // ─── máquina de estados ──────────────────────────────────

  function goIdle() {
    state = "idle";
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    pauseBanner.hidden = true;
    resetGame();
    drawScene();
    statusEl.textContent = "pressione qualquer tecla ou toque para começar";
  }

  function goRunning() {
    if (state === "gameover") return;
    state = "running";
    pauseBanner.hidden = true;
    statusEl.textContent = "espaço · P para pausar";
    if (!animFrame) animFrame = requestAnimationFrame(loop);
  }

  function goPaused() {
    if (state !== "running") return;
    state = "paused";
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    pauseBanner.hidden = false;
    statusEl.textContent = "pausado · espaço · P para continuar";
    drawScene();
  }

  function togglePause() {
    if (state === "running") goPaused();
    else if (state === "paused") goRunning();
  }

  // ─── loop ────────────────────────────────────────────────

  function loop() {
    if (state !== "running") return;
    update();
    drawScene();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    frameCount++;
    score++;

    const newLevel = Math.floor(score / 500) + 1;
    if (newLevel !== gameLevel) {
      gameLevel = newLevel;
      speed = 4.5 + (gameLevel - 1) * 0.7;
      levelEl.textContent = String(gameLevel).padStart(2, "0");
    }

    if (frameCount % 5 === 0) {
      const display = Math.min(Math.floor(score / 5), 99999);
      scoreEl.textContent = String(display).padStart(5, "0");
      if (display > hiScore) {
        hiScore = display;
        hiScoreEl.textContent = String(hiScore).padStart(5, "0");
      }
    }

    updatePlayer();

    for (const obs of obstacles) obs.x -= obs.speed || speed;
    obstacles = obstacles.filter(o => o.x + o.w > -10);

    nextObstacleIn--;
    if (nextObstacleIn <= 0) {
      spawnObstacle();
      nextObstacleIn = Math.max(40, 90 - gameLevel * 6) + Math.floor(Math.random() * 40);
    }

    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life -= p.decay; }
    particles = particles.filter(p => p.life > 0);
    for (const s of stars) s.twinkle += 0.03;

    for (const d of groundDeco) d.x -= speed * 0.3;
    groundDeco = groundDeco.filter(d => d.x > -20);
    while ((groundDeco[groundDeco.length - 1]?.x ?? 0) < CANVAS_W + 40) {
      const last = groundDeco[groundDeco.length - 1] || { x: 0 };
      groundDeco.push({ x: last.x + 18 + Math.random() * 30, h: 2 + Math.random() * 4 });
    }

    if (checkCollision()) triggerGameOver();
  }

  // ─── física ──────────────────────────────────────────────

  function updatePlayer() {
    player.vy += GRAVITY;
    player.y  += player.vy;
    const groundTop = GROUND_Y - player.h;
    if (player.y >= groundTop) {
      player.y = groundTop; player.vy = 0;
      player.onGround = true; player.jumpCount = 0;
    } else {
      player.onGround = false;
    }
    if (player.onGround && !player.ducking) {
      player.frameTimer++;
      if (player.frameTimer > Math.max(4, 10 - speed)) {
        player.frame = (player.frame + 1) % 2;
        player.frameTimer = 0;
        if (speed > 5) spawnDust(player.x, player.y);
      }
    }
  }

  function doJump() {
    if (state === "idle") { goRunning(); return; }
    if (state === "gameover") return;
    if (state === "paused")   { goRunning(); return; }
    if (player.jumpCount < 2) {
      player.vy = JUMP_VEL * (player.jumpCount === 1 ? 0.75 : 1);
      player.onGround = false; player.ducking = false;
      player.h = STAND_H; player.y = Math.min(player.y, GROUND_Y - STAND_H);
      player.jumpCount++;
      spawnDust(player.x, player.y + STAND_H);
    }
  }

  function doDuck(active) {
    if (state !== "running") return;
    if (active && player.onGround) {
      player.ducking = true; player.h = DUCK_H; player.y = GROUND_Y - DUCK_H;
    } else if (!active) {
      player.ducking = false; player.h = STAND_H; player.y = GROUND_Y - STAND_H;
    }
  }

  function spawnDust(x, y) {
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: x + Math.random() * PLAYER_W, y: y + STAND_H,
        vx: -1 - Math.random() * 2, vy: -Math.random() * 1.5,
        life: 1, decay: 0.06 + Math.random() * 0.04,
      });
    }
  }

  // ─── obstáculos ──────────────────────────────────────────

  const OBS_TYPES = [
    { key: "firewall",  w: 22, h: 30, ground: true,  label: "█▄█",  color: "#ff4d4d", minLevel: 1 },
    { key: "glitch",    w: 14, h: 46, ground: true,  label: "▓",    color: "#c45fff", minLevel: 1 },
    { key: "packet",    w: 30, h: 22, ground: true,  label: "■■",   color: "#ff8f5f", minLevel: 2 },
    { key: "drone",     w: 28, h: 16, ground: false, label: "▶◀",  color: "#5fa8ff", minLevel: 2, airY: 0.45 },
    { key: "satellite", w: 20, h: 20, ground: false, label: "✦⊛✦", color: "#5ffff0", minLevel: 3, airY: 0.35 },
  ];

  function spawnObstacle() {
    const available = OBS_TYPES.filter(t => t.minLevel <= gameLevel);
    const type = available[Math.floor(Math.random() * available.length)];
    const y = type.ground
      ? GROUND_Y - type.h
      : GROUND_Y - STAND_H * 1.1 - type.h - (type.airY * GROUND_Y * 0.3);
    obstacles.push({
      x: CANVAS_W + 20, y, w: type.w, h: type.h,
      label: type.label, color: type.color,
      key: type.key, ground: type.ground,
      speed: speed + (Math.random() * 0.8 - 0.4),
    });
  }

  function checkCollision() {
    const m = 3;
    return obstacles.some(obs =>
      player.x + m         < obs.x + obs.w &&
      player.x + player.w - m > obs.x      &&
      player.y + m         < obs.y + obs.h &&
      player.y + player.h - m > obs.y
    );
  }

  // ─── renderização ────────────────────────────────────────

  function drawScene() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, C.sky2); grad.addColorStop(1, C.sky1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawStars(); drawGroundDeco(); drawGround();
    drawParticles(); drawObstacles(); drawPlayer();

    // texto de idle sobre o canvas
    if (state === "idle") {
      ctx.save();
      ctx.fillStyle = "rgba(10,13,10,.55)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = C.bright;
      ctx.font = `bold ${Math.min(14, CANVAS_W * 0.025)}px "Courier New"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = C.phosphor; ctx.shadowBlur = 10;
      ctx.fillText("[ pressione qualquer tecla ou toque para começar ]", CANVAS_W / 2, CANVAS_H / 2);
      ctx.restore();
    }
  }

  function drawStars() {
    for (const s of stars) {
      ctx.fillStyle = `rgba(170,255,196,${s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle))})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawGround() {
    ctx.strokeStyle = C.ground; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke();
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
    g.addColorStop(0, "rgba(42,57,42,.4)"); g.addColorStop(1, "rgba(10,13,10,0)");
    ctx.fillStyle = g; ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  }

  function drawGroundDeco() {
    ctx.fillStyle = "rgba(42,153,86,.15)";
    for (const d of groundDeco) ctx.fillRect(d.x, GROUND_Y - d.h, 2, d.h);
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.fillStyle = `rgba(95,255,143,${p.life * 0.5})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  function drawPlayer() {
    const { x, y, w, h, ducking, onGround, frame } = player;
    const cx = x + w / 2;
    ctx.save();
    ctx.shadowColor = C.bright; ctx.shadowBlur = 8;

    if (ducking) {
      ctx.fillStyle = C.bright; ctx.fillRect(x + 2, y + 4, w - 4, h - 8);
      ctx.fillStyle = C.amber;  ctx.fillRect(x + w - 7, y + 5, 5, 5);
      ctx.fillStyle = C.phosphor;
      ctx.fillRect(x + 3,     y + h - 5, 5, 5);
      ctx.fillRect(x + w - 8, y + h - 5, 5, 5);
    } else {
      ctx.fillStyle = C.bright; ctx.fillRect(x + 4, y + 2, w - 8, h - 10);
      ctx.fillStyle = C.phosphor; ctx.fillRect(x + 3, y, w - 6, 8);
      ctx.fillStyle = (!onGround && frameCount % 6 < 3) ? C.amber : "#ffb23888";
      ctx.fillRect(x + w - 9, y + 2, 6, 5);
      ctx.fillStyle = C.phosphor;
      ctx.fillRect(x,         y + 8, 4, 10);
      ctx.fillRect(x + w - 4, y + 8, 4, 10);
      ctx.fillStyle = C.bright;
      if (onGround) {
        if (frame === 0) {
          ctx.fillRect(x + 4,      y + h - 10, 5, 10);
          ctx.fillRect(x + w - 9,  y + h - 6,  5, 6);
          ctx.fillRect(x + w - 11, y + h - 2,  8, 2);
        } else {
          ctx.fillRect(x + 4,     y + h - 6,  5, 6);
          ctx.fillRect(x + w - 9, y + h - 10, 5, 10);
          ctx.fillRect(x + 3,     y + h - 2,  8, 2);
        }
      } else {
        ctx.fillRect(x + 4,     y + h - 10, 5, 8);
        ctx.fillRect(x + w - 9, y + h - 10, 5, 8);
      }
    }

    ctx.fillStyle = C.amber;
    ctx.fillRect(cx - 1, y - 6, 2, 6);
    ctx.beginPath(); ctx.arc(cx, y - 7, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawObstacles() {
    for (const obs of obstacles) {
      ctx.save();
      ctx.shadowColor = obs.color; ctx.shadowBlur = 10;
      ctx.fillStyle = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.fillStyle = "rgba(0,0,0,.4)";
      for (let iy = obs.y + 4; iy < obs.y + obs.h - 2; iy += 6)
        ctx.fillRect(obs.x + 3, iy, obs.w - 6, 2);
      ctx.fillStyle = obs.color; ctx.shadowBlur = 0;
      ctx.font = `bold ${Math.min(10, obs.h * 0.4)}px "Courier New"`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(obs.label, obs.x + obs.w / 2, obs.y + obs.h / 2);
      if (!obs.ground) {
        ctx.strokeStyle = obs.color; ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.w, obs.y + obs.h / 2);
        ctx.lineTo(obs.x + obs.w + 20, obs.y + obs.h / 2);
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  // ─── fim de jogo ─────────────────────────────────────────

  async function triggerGameOver() {
    state = "gameover";
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    pauseBanner.hidden = true;

    ctx.fillStyle = "rgba(255,77,77,.15)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    statusEl.textContent = "colisão detectada";
    gameoverMsg.textContent  = "GAME OVER";
    gameoverDetail.textContent = currentPlayer;

    const finalScore = Math.floor(score / 5);
    winRecord.innerHTML = `
      <p><span>pontuação</span> <span>${finalScore.toLocaleString("pt-BR")} pts</span></p>
      <p><span>nível</span>     <span>${gameLevel}</span></p>
      <p><span>posição</span>   <span style="color:var(--phosphor-dim)">salvando...</span></p>
    `;
    gameoverRankingEl.innerHTML = `<p class="stats-empty">carregando...</p>`;
    gameoverOverlay.classList.add("is-visible");

    const entry = {
      player: currentPlayer,
      score:  finalScore,
      level:  gameLevel,
      date:   new Date().toLocaleDateString("pt-BR"),
    };

    try {
      const { position, isRecord } = await addToRanking(entry);
      winRecord.innerHTML = `
        <p><span>pontuação</span> <span class="${isRecord ? "is-record" : ""}">${finalScore.toLocaleString("pt-BR")} pts${isRecord ? " ✦" : ""}</span></p>
        <p><span>nível</span>     <span>${gameLevel}</span></p>
        <p><span>posição</span>   <span class="${position <= 3 ? "is-record" : ""}">${position}º no ranking</span></p>
        ${isRecord ? `<p><span></span><span class="is-record">novo recorde!</span></p>` : ""}
      `;
      await renderRankingIn(gameoverRankingEl);
      if (!statsPanel.hidden) renderRankingIn(statsContent);
    } catch (err) {
      console.error("[ranking]", err);
      winRecord.innerHTML = `
        <p><span>pontuação</span> <span>${finalScore.toLocaleString("pt-BR")} pts</span></p>
        <p><span>nível</span>     <span>${gameLevel}</span></p>
        <p><span>posição</span>   <span style="color:#ff4d4d">erro ao salvar</span></p>
      `;
      gameoverRankingEl.innerHTML = `<p class="stats-empty">erro ao carregar ranking</p>`;
    }
  }

  // ─── JSONBin ─────────────────────────────────────────────

  const EMPTY_RANKING = () => ({ scores: [] });

  async function loadRanking() {
    const res = await fetch(JSONBIN.URL, { headers: { "X-Access-Key": JSONBIN.ACCESS_KEY } });
    if (!res.ok) throw new Error(`GET ${res.status}`);
    return (await res.json()).record || EMPTY_RANKING();
  }

  async function saveRanking(ranking) {
    const res = await fetch(JSONBIN.URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Access-Key": JSONBIN.ACCESS_KEY },
      body: JSON.stringify(ranking),
    });
    if (!res.ok) throw new Error(`PUT ${res.status}`);
  }

  async function addToRanking(entry) {
    const ranking  = await loadRanking();
    const list     = ranking.scores || [];
    const prevBest = list.length > 0 ? list[0].score : -Infinity;
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const trimmed  = list.slice(0, MAX_RANKING);
    const position = trimmed.findIndex(
      e => e.player === entry.player && e.score === entry.score && e.date === entry.date
    ) + 1;
    const isRecord = entry.score > prevBest;
    ranking.scores = trimmed;
    await saveRanking(ranking);
    return { position, isRecord };
  }

  function buildTable(list) {
    if (!list || list.length === 0)
      return `<p class="stats-empty">nenhuma partida registrada</p>`;
    const medals = ["🥇","🥈","🥉"];
    return `<table class="ranking-table">
      <thead><tr><th>#</th><th>jogador</th><th>pontos</th><th>nível</th><th>data</th></tr></thead>
      <tbody>${list.map((e, i) => `
        <tr class="${e.player === currentPlayer ? "is-current" : ""}">
          <td>${medals[i] || i + 1}</td>
          <td>${esc(e.player)}</td>
          <td>${(e.score || 0).toLocaleString("pt-BR")}</td>
          <td>${e.level || 1}</td>
          <td>${e.date}</td>
        </tr>`).join("")}
      </tbody></table>`;
  }

  async function renderRankingIn(container) {
    container.innerHTML = `<p class="stats-empty">carregando...</p>`;
    try {
      const r = await loadRanking();
      container.innerHTML = buildTable(r.scores);
    } catch {
      container.innerHTML = `<p class="stats-empty">erro — tente novamente</p>`;
    }
  }

  function esc(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ─── ranking UI ──────────────────────────────────────────

  function toggleStats() {
    statsOpen = !statsOpen;
    statsPanel.hidden = !statsOpen;
    statsToggleBtn.textContent = statsOpen ? "▾ ranking" : "▸ ranking";
    if (statsOpen) renderRankingIn(statsContent);
  }

  async function doRefresh(btn, container) {
    btn.classList.remove("is-spinning");
    void btn.offsetWidth;
    btn.classList.add("is-spinning");
    btn.disabled = true;
    await renderRankingIn(container);
    btn.disabled = false;
    setTimeout(() => btn.classList.remove("is-spinning"), 600);
  }

  // ─── jogador ─────────────────────────────────────────────

  function loadPlayer() { return localStorage.getItem(PLAYER_KEY) || ""; }
  function savePlayer(n) { localStorage.setItem(PLAYER_KEY, n); }

  function showPlayerModal() {
    playerInput.value = currentPlayer || "";
    playerError.textContent = "";
    playerOverlay.classList.add("is-visible");
    setTimeout(() => playerInput.focus(), 150);
  }
  function hidePlayerModal() { playerOverlay.classList.remove("is-visible"); }

  function confirmPlayer() {
    const name = playerInput.value.trim();
    if (!name)           { playerError.textContent = "nome obrigatório";    playerInput.focus(); return; }
    if (name.length < 2) { playerError.textContent = "mínimo 2 caracteres"; playerInput.focus(); return; }
    currentPlayer = name;
    savePlayer(name);
    playerNameEl.textContent = name;
    hidePlayerModal();
    goIdle();
  }

  // ─── controles ───────────────────────────────────────────

  document.addEventListener("keydown", e => {
    // não interfere com inputs
    if (playerOverlay.classList.contains("is-visible")) return;

    // Enter no game over reinicia
    if (e.key === "Enter" && state === "gameover") {
      gameoverOverlay.classList.remove("is-visible");
      goIdle(); return;
    }
    if (state === "gameover") return;

    // pausa / retoma / inicia
    if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (state === "idle")   { goRunning(); return; }
      togglePause(); return;
    }

    // pulo / inicia
    if (["ArrowUp","w","W"].includes(e.key)) {
      e.preventDefault(); doJump(); return;
    }

    // qualquer outra tecla inicia se idle
    if (state === "idle") { goRunning(); return; }

    // agachar
    if (["ArrowDown","s","S"].includes(e.key)) {
      e.preventDefault(); doDuck(true);
    }
  });

  document.addEventListener("keyup", e => {
    if (["ArrowDown","s","S"].includes(e.key)) doDuck(false);
  });

  // botões mobile
  btnJump.addEventListener("touchstart", e => { e.preventDefault(); doJump(); }, { passive: false });
  btnJump.addEventListener("click", doJump);
  btnDuck.addEventListener("touchstart", e => { e.preventDefault(); doDuck(true); },  { passive: false });
  btnDuck.addEventListener("touchend",   e => { e.preventDefault(); doDuck(false); }, { passive: false });
  btnDuck.addEventListener("mousedown",  () => doDuck(true));
  btnDuck.addEventListener("mouseup",    () => doDuck(false));
  btnDuck.addEventListener("mouseleave", () => doDuck(false));

  // swipe / tap no canvas
  let tX = 0, tY = 0;
  canvas.addEventListener("touchstart", e => {
    tX = e.changedTouches[0].clientX; tY = e.changedTouches[0].clientY;
  }, { passive: true });
  canvas.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - tX;
    const dy = e.changedTouches[0].clientY - tY;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < -15) doJump();
      else if (dy > 15) { doDuck(true); setTimeout(() => doDuck(false), 400); }
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (state === "idle") goRunning();
      else doJump();
    }
  }, { passive: true });

  restartBtn.addEventListener("click", () => {
    gameoverOverlay.classList.remove("is-visible"); goIdle();
  });
  changePlayerBtn.addEventListener("click", () => {
    if (state === "running") goPaused(); showPlayerModal();
  });
  playerConfirm.addEventListener("click", confirmPlayer);
  playerInput.addEventListener("keydown", e => { if (e.key === "Enter") confirmPlayer(); });

  statsToggleBtn.addEventListener("click", toggleStats);
  statsRefreshBtn.addEventListener("click",    () => doRefresh(statsRefreshBtn,    statsContent));
  gameoverRefreshBtn.addEventListener("click", () => doRefresh(gameoverRefreshBtn, gameoverRankingEl));

  // ─── boot ────────────────────────────────────────────────

  const saved = loadPlayer();
  if (saved) {
    currentPlayer = saved;
    playerNameEl.textContent = saved;
    goIdle();
  } else {
    resetGame(); drawScene(); showPlayerModal();
  }

})();
