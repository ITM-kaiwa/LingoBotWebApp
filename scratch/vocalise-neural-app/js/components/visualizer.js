// Audio visualizer canvas component

export class AudioVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isAnimating = false;
    this.volume = 0;
    this.animFrame = null;
    this.phase = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
  }

  setVolume(normalizedVol) {
    this.volume = normalizedVol;
  }

  start() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this._loop();
  }

  stop() {
    this.isAnimating = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  _loop() {
    if (!this.isAnimating) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.phase += 0.08;

    const centerY = this.height / 2;
    const amplitude = Math.max(10, this.volume * (this.height / 2 - 15));

    // Draw glowing multi-wave line
    this.ctx.save();
    
    // Wave 1: Cyan
    this._drawSineWave(centerY, amplitude, 0.02, this.phase, 'rgba(0, 242, 254, 0.8)', 3);
    
    // Wave 2: Purple
    this._drawSineWave(centerY, amplitude * 0.7, 0.03, -this.phase * 0.8, 'rgba(168, 85, 247, 0.6)', 2);

    // Wave 3: Pink Accent
    this._drawSineWave(centerY, amplitude * 0.4, 0.015, this.phase * 1.2, 'rgba(236, 72, 153, 0.5)', 2);

    this.ctx.restore();

    this.animFrame = requestAnimationFrame(() => this._loop());
  }

  _drawSineWave(centerY, amplitude, frequency, phase, color, lineWidth) {
    this.ctx.beginPath();
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = color;
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = color;

    for (let x = 0; x < this.width; x++) {
      // Fade edges
      const edgeFactor = Math.sin((x / this.width) * Math.PI);
      const y = centerY + Math.sin(x * frequency + phase) * amplitude * edgeFactor;

      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }
}
