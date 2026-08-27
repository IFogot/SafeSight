// Procedural animated industrial CCTV stream generator
export class CCTVStreamSimulator {
  private animationFrames: Record<string, number> = {};

  public startStream(
    canvas: HTMLCanvasElement,
    feedType: 'petrochemical' | 'stamping' | 'welding' | 'logistics',
    violationType: 'none' | 'no_helmet' | 'no_vest' | 'zone_breach' | 'slip_fall' = 'none'
  ): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    let frame = 0;
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      frame++;

      const w = canvas.width;
      const h = canvas.height;

      // Dark industrial floor backdrop
      ctx.fillStyle = '#0B1120';
      ctx.fillRect(0, 0, w, h);

      // Floor perspective grid
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      for (let y = h * 0.4; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.4);
        ctx.lineTo((x - w / 2) * 2 + w / 2, h);
        ctx.stroke();
      }

      // Zone specific industrial machinery
      if (feedType === 'petrochemical') {
        this.renderPetrochemicalScene(ctx, w, h, frame, violationType);
      } else if (feedType === 'stamping') {
        this.renderStampingScene(ctx, w, h, frame, violationType);
      } else if (feedType === 'welding') {
        this.renderWeldingScene(ctx, w, h, frame, violationType);
      } else {
        this.renderLogisticsScene(ctx, w, h, frame, violationType);
      }

      // CCTV Camera metadata watermark overlay
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(`REC ● [CAM-0${feedType === 'petrochemical' ? 1 : feedType === 'stamping' ? 2 : feedType === 'welding' ? 3 : 4}]`, 12, 20);
      const timeStr = new Date().toTimeString().split(' ')[0] + `.${Math.floor((frame % 60) * 1.6)}`;
      ctx.fillText(timeStr, w - 85, 20);

      const animId = requestAnimationFrame(render);
      this.animationFrames[canvas.id || 'default'] = animId;
    };

    render();

    return () => {
      isRunning = false;
      if (this.animationFrames[canvas.id || 'default']) {
        cancelAnimationFrame(this.animationFrames[canvas.id || 'default']);
      }
    };
  }

  // Petrochemical reactor & catalytic column scene
  private renderPetrochemicalScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    frame: number,
    violation: string
  ) {
    // Reactor Column 1 & 2
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(w * 0.1, h * 0.15, w * 0.2, h * 0.65);
    ctx.fillRect(w * 0.7, h * 0.15, w * 0.2, h * 0.65);

    // Pipes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.3);
    ctx.lineTo(w * 0.7, h * 0.3);
    ctx.stroke();

    // Pressure Gauges & status LEDs
    const ledGlow = Math.sin(frame * 0.1) > 0 ? '#10B981' : '#059669';
    ctx.fillStyle = ledGlow;
    ctx.beginPath();
    ctx.arc(w * 0.2, h * 0.25, 6, 0, Math.PI * 2);
    ctx.fill();

    // Steam vents
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 4; i++) {
      const steamY = ((frame * 2 + i * 30) % 80);
      ctx.beginPath();
      ctx.arc(w * 0.5 + Math.sin(frame * 0.05 + i) * 10, h * 0.3 - steamY, 8 + i * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Walking Worker Figure
    const workerX = w * 0.45 + Math.sin(frame * 0.02) * 40;
    const workerY = h * 0.55;
    this.drawWorker(ctx, workerX, workerY, violation);
  }

  // Heavy metal stamping press scene
  private renderStampingScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    frame: number,
    violation: string
  ) {
    // Press Frame
    ctx.fillStyle = '#334155';
    ctx.fillRect(w * 0.2, h * 0.1, w * 0.6, h * 0.15);
    ctx.fillRect(w * 0.2, h * 0.25, w * 0.08, h * 0.55);
    ctx.fillRect(w * 0.72, h * 0.25, w * 0.08, h * 0.55);

    // Stamping Piston Motion
    const pistonDrop = Math.abs(Math.sin(frame * 0.04)) * (h * 0.25);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(w * 0.35, h * 0.25 + pistonDrop, w * 0.3, h * 0.12);

    // Conveyor belt
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(w * 0.1, h * 0.7, w * 0.8, h * 0.08);

    // Hazard zone boundary stripe on floor
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(w * 0.28, h * 0.5, w * 0.44, h * 0.35);
    ctx.setLineDash([]);

    // Operator Worker Figure
    const workerX = w * 0.5;
    const workerY = h * 0.55;
    this.drawWorker(ctx, workerX, workerY, violation);
  }

  // Robotic welding enclosure scene
  private renderWeldingScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    frame: number,
    violation: string
  ) {
    // Robotic Arm Pedestal
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(w * 0.4, h * 0.6, w * 0.2, h * 0.2);

    // Robotic Articulated Arm
    const armAngle = Math.sin(frame * 0.05) * 0.3;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.6);
    ctx.rotate(armAngle);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-12, -80, 24, 80);

    ctx.translate(0, -80);
    ctx.rotate(-armAngle * 1.5);
    ctx.fillRect(-8, -60, 16, 60);

    // Welding Torch & Spark Flashes
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, -65, 5, 0, Math.PI * 2);
    ctx.fill();

    if (frame % 3 === 0) {
      ctx.fillStyle = '#FFFFFF';
      for (let s = 0; s < 6; s++) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkDist = Math.random() * 25 + 5;
        ctx.fillRect(
          Math.cos(sparkAngle) * sparkDist,
          -65 + Math.sin(sparkAngle) * sparkDist,
          2,
          2
        );
      }
    }
    ctx.restore();

    // Inspection Technician
    const workerX = w * 0.25;
    const workerY = h * 0.55;
    this.drawWorker(ctx, workerX, workerY, violation);
  }

  // High-bay warehouse & forklift logistics scene
  private renderLogisticsScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    frame: number,
    violation: string
  ) {
    // High-bay Pallet Racks
    ctx.fillStyle = '#334155';
    for (let r = 0; r < 3; r++) {
      ctx.fillRect(w * 0.05, h * 0.15 + r * 50, w * 0.25, 8);
      ctx.fillStyle = r % 2 === 0 ? '#F97316' : '#3B82F6';
      ctx.fillRect(w * 0.08, h * 0.15 + r * 50 - 25, w * 0.18, 25);
      ctx.fillStyle = '#334155';
    }

    // Moving Forklift Vehicle
    const forkliftX = (w * 0.4 + ((frame * 1.2) % (w * 0.5)));
    const forkliftY = h * 0.65;

    // Forklift Body
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(forkliftX, forkliftY - 30, 60, 30);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(forkliftX + 10, forkliftY - 45, 30, 18);
    // Wheels
    ctx.beginPath();
    ctx.arc(forkliftX + 12, forkliftY + 5, 8, 0, Math.PI * 2);
    ctx.arc(forkliftX + 48, forkliftY + 5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pedestrian Worker
    const workerX = w * 0.75;
    const workerY = h * 0.55;
    this.drawWorker(ctx, workerX, workerY, violation);
  }

  // Helper to draw realistic humanoid worker figure with PPE
  private drawWorker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    violation: string
  ) {
    ctx.save();
    const isManDown = violation === 'slip_fall';

    if (isManDown) {
      ctx.translate(x, y + 40);
      ctx.rotate(-Math.PI / 2);
    } else {
      ctx.translate(x, y);
    }

    // Legs & Steel-toe boots
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-10, 30, 8, 30);
    ctx.fillRect(2, 30, 8, 30);
    // Boots
    ctx.fillStyle = '#475569';
    ctx.fillRect(-12, 55, 10, 8);
    ctx.fillRect(2, 55, 10, 8);

    // Torso (Hi-vis vest or plain shirt)
    const isNoVest = violation === 'no_vest';
    ctx.fillStyle = isNoVest ? '#475569' : '#10B981';
    ctx.fillRect(-14, 0, 28, 32);

    // Silver reflective vest stripes
    if (!isNoVest) {
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(-14, 10, 28, 4);
      ctx.fillRect(-14, 20, 28, 4);
      ctx.fillRect(-8, 0, 4, 32);
      ctx.fillRect(4, 0, 4, 32);
    }

    // Arms
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-18, 0, 4, 26);
    ctx.fillRect(14, 0, 4, 26);

    // Head
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(0, -10, 9, 0, Math.PI * 2);
    ctx.fill();

    // Helmet or Hair
    const isNoHelmet = violation === 'no_helmet';
    if (isNoHelmet) {
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(0, -13, 9, Math.PI, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#F59E0B'; // Safety Yellow Helmet
      ctx.beginPath();
      ctx.arc(0, -12, 11, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      ctx.fillRect(-12, -12, 24, 3);
    }

    ctx.restore();
  }
}

export const cctvSimulator = new CCTVStreamSimulator();
