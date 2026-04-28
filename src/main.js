import * as Network from './network.js';
import { initGame } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnHost = document.getElementById('btn-host');
  const btnJoin = document.getElementById('btn-join');
  const btnStart = document.getElementById('btn-start');
  const inputPeerId = document.getElementById('input-peer-id');
  
  const uiMenu = document.getElementById('menu');
  const uiLobby = document.getElementById('lobby');
  const uiGame = document.getElementById('game-container');
  
  const displayMyId = document.getElementById('my-peer-id');

  // Configurar Callbacks de Red
  Network.callbacks.onReady = (id) => {
    // Cuando el PeerJS está listo y tenemos nuestro ID
    if (Network.role === Network.NetworkRole.HOST) {
      uiMenu.classList.add('hidden');
      uiLobby.classList.remove('hidden');
      displayMyId.innerText = id;
      btnStart.classList.remove('hidden'); // Solo el host puede iniciar
    } else {
      // Es un cliente, si está listo es que se conectó al Host
      uiMenu.classList.add('hidden');
      uiLobby.classList.remove('hidden');
      displayMyId.innerText = id;
      document.querySelector('#lobby p').innerText = "Esperando que el Host inicie la partida...";
    }
  };

  btnHost.addEventListener('click', () => {
    btnHost.disabled = true;
    btnHost.innerText = "Creando...";
    Network.initHost();
  });

  btnJoin.addEventListener('click', () => {
    const hostId = inputPeerId.value.trim().toUpperCase();
    if (!hostId) {
      alert("Por favor ingresa un ID válido.");
      return;
    }
    btnJoin.disabled = true;
    btnJoin.innerText = "Conectando...";
    Network.initClient(hostId);
  });

  btnStart.addEventListener('click', () => {
    // Solo el Host tiene este botón, envía una señal a todos para empezar
    // Por simplicidad, el cliente podría empezar a renderizar al recibir el primer GameState,
    // pero aquí lo forzamos.
    
    // Ocultar UI, mostrar Juego
    document.getElementById('ui-container').classList.add('hidden');
    uiGame.classList.remove('hidden');
    
    // Iniciar juego localmente
    initGame();
  });

  // Si somos cliente, en cuanto recibimos el primer estado y aún estamos en el lobby, pasamos al juego
  const originalGameStateCallback = Network.callbacks.onGameStateReceived;
  Network.callbacks.onGameStateReceived = (state) => {
    if(!uiGame.classList.contains('hidden')) {
      // Ya estamos en el juego
      if(originalGameStateCallback) originalGameStateCallback(state);
    } else {
      // Primera vez que recibimos estado, transicionar a la pantalla de juego
      document.getElementById('ui-container').classList.add('hidden');
      uiGame.classList.remove('hidden');
      initGame();
      // Aplicar el estado inicial
      if(originalGameStateCallback) originalGameStateCallback(state);
    }
  };
});
