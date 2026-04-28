import { Player } from './player.js';
import * as Network from './network.js';

let canvas, ctx;
let players = {};
let myInput = { left: false, right: false, jump: false, gravity: false };
let lastTime = performance.now();
let isRunning = false;

// Colores para asignar a nuevos jugadores
const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
let colorIndex = 0;

export function initGame() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  document.getElementById('hud-player-id').innerText = Network.myId;

  // Añadir mi propio jugador al diccionario de jugadores
  addPlayer(Network.myId);

  // Configurar listeners de teclado
  setupInput();

  // Configurar callbacks de red
  Network.callbacks.onPlayerJoined = (peerId) => {
    if (Network.role === Network.NetworkRole.HOST) {
      addPlayer(peerId);
    }
  };

  Network.callbacks.onInputReceived = (peerId, input) => {
    if (Network.role === Network.NetworkRole.HOST) {
      if(players[peerId]) {
        // En lugar de aplicar directamente, podríamos tener un buffer,
        // pero para simplificar, lo guardamos y en el update lo aplicamos.
        players[peerId].currentInput = input;
      }
    }
  };

  Network.callbacks.onGameStateReceived = (state) => {
    if (Network.role === Network.NetworkRole.CLIENT) {
      // Actualizar estado local basado en el Host
      syncState(state);
    }
  };

  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function addPlayer(id) {
  const color = colors[colorIndex % colors.length];
  colorIndex++;
  
  // Posiciones iniciales aleatorias (solo host decide)
  let startX = 100 + Math.random() * (canvas.width - 200);
  let startY = canvas.height / 2;

  players[id] = new Player(id, startX, startY, color);
  // Propiedad temporal para inputs de red en el host
  players[id].currentInput = { left: false, right: false, jump: false, gravity: false }; 
  
  updatePlayerCountUI();
}

function updatePlayerCountUI() {
  const countSpan = document.getElementById('player-count');
  if(countSpan) countSpan.innerText = Object.keys(players).length;
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') myInput.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') myInput.right = true;
    if (e.code === 'KeyW' || e.code === 'Space' || e.code === 'ArrowUp') myInput.jump = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') myInput.gravity = true;
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') myInput.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') myInput.right = false;
    if (e.code === 'KeyW' || e.code === 'Space' || e.code === 'ArrowUp') myInput.jump = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') myInput.gravity = false;
  });
}

function gameLoop(timestamp) {
  if(!isRunning) return;

  const dt = (timestamp - lastTime) / 1000; // segundos
  lastTime = timestamp;

  // Limitar dt para evitar saltos locos si la pestaña pierde foco
  const safeDt = Math.min(dt, 0.1); 

  if (Network.role === Network.NetworkRole.HOST) {
    updateHost(safeDt);
  } else if (Network.role === Network.NetworkRole.CLIENT) {
    updateClient(safeDt);
  }

  draw();

  requestAnimationFrame(gameLoop);
}

function updateHost(dt) {
  // Aplicar mi propio input
  if(players[Network.myId]) {
      players[Network.myId].applyInput(myInput, dt);
  }

  // Actualizar físicas de todos los jugadores
  for (let id in players) {
    let p = players[id];
    
    // Aplicar input de red
    if (id !== Network.myId && p.currentInput) {
      p.applyInput(p.currentInput, dt);
    }
    
    p.updatePhysics(dt, canvas.width, canvas.height);
    
    // Aquí podríamos agregar colisiones entre jugadores (Push)
    checkPlayerCollisions();
  }

  // Preparar estado y enviarlo
  const stateData = Object.values(players).map(p => ({
    id: p.id,
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
    color: p.color,
    gravityDir: p.gravityDir
  }));

  Network.sendGameState(stateData);
}

function updateClient(dt) {
  // El cliente solo envía sus inputs al host
  Network.sendInput(myInput);

  // Podríamos hacer interpolación (client-side prediction) aquí,
  // pero para empezar, simplemente dejaremos que el estado recibido del host mande.
}

function syncState(stateData) {
  // El cliente recibe la posición absoluta de todos
  for (let data of stateData) {
    if (!players[data.id]) {
      // Nuevo jugador que el cliente no conocía
      players[data.id] = new Player(data.id, data.x, data.y, data.color);
    }
    
    let p = players[data.id];
    p.x = data.x;
    p.y = data.y;
    p.vx = data.vx;
    p.vy = data.vy;
    p.gravityDir = data.gravityDir;
    p.color = data.color;
  }
}

function checkPlayerCollisions() {
  const pList = Object.values(players);
  for(let i = 0; i < pList.length; i++){
    for(let j = i+1; j < pList.length; j++){
      const p1 = pList[i];
      const p2 = pList[j];
      
      // AABB Collision básica
      if (p1.x < p2.x + p2.width &&
          p1.x + p1.width > p2.x &&
          p1.y < p2.y + p2.height &&
          p1.height + p1.y > p2.y) {
          
          // Resolución de colisión muy básica (empujarse)
          // Solo si están en la misma línea "x" más o menos
          if(p1.x < p2.x) {
            p1.x -= 2;
            p2.x += 2;
          } else {
            p1.x += 2;
            p2.x -= 2;
          }
      }
    }
  }
}

function draw() {
  // Limpiar fondo
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar decoración central (arena)
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, canvas.height/2 - 10, canvas.width, 20);

  // Dibujar jugadores
  for (let id in players) {
    players[id].draw(ctx);
  }
}
