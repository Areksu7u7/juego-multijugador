export class Player {
  constructor(id, x, y, color) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.gravityDir = 1; // 1 = abajo, -1 = arriba
    this.speed = 300; // pixeles por segundo
    this.jumpForce = 600; 
    this.onGround = false;
    this.score = 0;
  }

  // Se ejecuta SOLO en el HOST
  applyInput(input, dt) {
    if (!input) return;

    // Movimiento horizontal
    if (input.left) {
      this.vx = -this.speed;
    } else if (input.right) {
      this.vx = this.speed;
    } else {
      this.vx = 0;
    }

    // Gravedad
    if (input.gravity && this.onGround) {
      this.gravityDir *= -1; // Invertir gravedad
      input.gravity = false; // Consumir el input para no spamear
      this.onGround = false;
    }

    // Salto
    if (input.jump && this.onGround) {
      this.vy = -this.jumpForce * this.gravityDir;
      this.onGround = false;
      input.jump = false;
    }
  }

  // Se ejecuta SOLO en el HOST
  updatePhysics(dt, width, height) {
    const GRAVITY = 1500;
    
    // Aplicar fuerza de gravedad
    this.vy += GRAVITY * this.gravityDir * dt;

    // Actualizar posición
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Colisiones con los bordes (Suelo y Techo)
    this.onGround = false;
    
    // Suelo
    if (this.y + this.height >= height) {
      this.y = height - this.height;
      this.vy = 0;
      if (this.gravityDir === 1) this.onGround = true;
    }
    // Techo
    if (this.y <= 0) {
      this.y = 0;
      this.vy = 0;
      if (this.gravityDir === -1) this.onGround = true;
    }

    // Paredes (Izquierda y Derecha)
    if (this.x <= 0) {
      this.x = 0;
    }
    if (this.x + this.width >= width) {
      this.x = width - this.width;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Dibujar un pequeño indicador para saber hacia dónde cae
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    if (this.gravityDir === 1) {
      // Indicador abajo
      ctx.fillRect(this.x, this.y + this.height - 10, this.width, 10);
    } else {
      // Indicador arriba
      ctx.fillRect(this.x, this.y, this.width, 10);
    }
    
    // Nombre/ID
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.id.substring(0, 4), this.x + this.width/2, this.y - 5);
  }
}
