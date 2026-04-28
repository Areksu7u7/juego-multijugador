import Peer from 'peerjs';

export const NetworkRole = {
  HOST: 'host',
  CLIENT: 'client',
  NONE: 'none'
};

export let peer = null;
export let connections = []; // Para el host
export let hostConnection = null; // Para el cliente
export let role = NetworkRole.NONE;
export let myId = null;

// Callbacks que se registrarán desde main.js / game.js
export let callbacks = {
  onReady: null,
  onPlayerJoined: null,
  onGameStateReceived: null,
  onInputReceived: null
};

export function generateId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function initHost() {
  const id = generateId();
  role = NetworkRole.HOST;
  
  peer = new Peer(id);
  
  peer.on('open', (id) => {
    myId = id;
    if(callbacks.onReady) callbacks.onReady(id);
  });

  peer.on('connection', (conn) => {
    connections.push(conn);
    
    conn.on('open', () => {
      console.log('Nuevo cliente conectado:', conn.peer);
      if(callbacks.onPlayerJoined) callbacks.onPlayerJoined(conn.peer);
    });

    conn.on('data', (data) => {
      if(data.type === 'input') {
        if(callbacks.onInputReceived) callbacks.onInputReceived(conn.peer, data.input);
      }
    });

    conn.on('close', () => {
      connections = connections.filter(c => c !== conn);
      console.log('Cliente desconectado:', conn.peer);
    });
  });
}

export function initClient(hostId) {
  role = NetworkRole.CLIENT;
  peer = new Peer();
  
  peer.on('open', (id) => {
    myId = id;
    hostConnection = peer.connect(hostId);
    
    hostConnection.on('open', () => {
      console.log('Conectado al Host!');
      if(callbacks.onReady) callbacks.onReady(id);
    });

    hostConnection.on('data', (data) => {
      if(data.type === 'gameState') {
        if(callbacks.onGameStateReceived) callbacks.onGameStateReceived(data.state);
      }
    });
    
    hostConnection.on('error', (err) => {
      console.error('Error de conexión:', err);
      alert("Error al conectar con la sala.");
    });
  });
}

export function sendGameState(state) {
  if (role !== NetworkRole.HOST) return;
  // Enviar el estado a todos los clientes
  for (let conn of connections) {
    conn.send({ type: 'gameState', state });
  }
}

export function sendInput(input) {
  if (role !== NetworkRole.CLIENT) return;
  if (hostConnection && hostConnection.open) {
    hostConnection.send({ type: 'input', input });
  }
}
