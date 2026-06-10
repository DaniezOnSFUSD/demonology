// Visual Effects System
class EffectsEngine {
    constructor() {
        this.witherEffect = 0;
        this.huntIntensity = 0;
        this.screenNoise = 0;
    }

    updateWithering(sanity) {
        this.witherEffect = Math.max(0, (100 - sanity) / 100);
        const witherCanvas = document.getElementById('witherEffect');
        const gameCanvas = document.querySelector('canvas');

        if (this.witherEffect > 0) {
            witherCanvas.style.opacity = this.witherEffect * 0.6;
            witherCanvas.style.backgroundColor = `rgba(0, 0, 0, ${this.witherEffect * 0.4})`;
            gameCanvas.style.filter = 
                `blur(${this.witherEffect * 8}px) brightness(${1 - this.witherEffect * 0.4}) contrast(${0.8 + this.witherEffect * 0.3})`;
        } else {
            witherCanvas.style.opacity = 0;
            gameCanvas.style.filter = 'blur(0px) brightness(1) contrast(1)';
        }
    }

    updateHuntVignette(hunting) {
        const vignette = document.getElementById('huntVignette');
        if (hunting) {
            this.huntIntensity = Math.min(1, this.huntIntensity + 0.05);
        } else {
            this.huntIntensity = Math.max(0, this.huntIntensity - 0.03);
        }

        const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        const intensity = this.huntIntensity * pulse;
        vignette.style.boxShadow = 
            `inset 0 0 150px rgba(255, 0, 0, ${intensity * 0.6}), inset 0 0 50px rgba(255, 0, 0, ${intensity * 0.3})`;
    }

    addNotification(text, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = text;
        notification.style.animation = 'slideIn 0.3s';

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    drawInfraredCamera(ctx, ghostPos, playerPos, rooms) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Thermal noise
        ctx.fillStyle = 'rgba(0, 100, 255, 0.1)';
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * ctx.canvas.width;
            const y = Math.random() * ctx.canvas.height;
            ctx.fillRect(x, y, Math.random() * 6 + 2, Math.random() * 6 + 2);
        }

        // Player heat (warmer)
        const pX = (playerPos.x / 60) * ctx.canvas.width + ctx.canvas.width / 2;
        const pY = (playerPos.z / 60) * ctx.canvas.height + ctx.canvas.height / 2;

        const playerGrad = ctx.createRadialGradient(pX, pY, 0, pX, pY, 35);
        playerGrad.addColorStop(0, 'rgba(255, 150, 0, 0.9)');
        playerGrad.addColorStop(0.6, 'rgba(255, 80, 0, 0.5)');
        playerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = playerGrad;
        ctx.fillRect(pX - 35, pY - 35, 70, 70);

        // Ghost signature
        if (ghostPos.distanceTo(playerPos) < 40) {
            const gX = (ghostPos.x / 60) * ctx.canvas.width + ctx.canvas.width / 2;
            const gY = (ghostPos.z / 60) * ctx.canvas.height + ctx.canvas.height / 2;

            const ghostGrad = ctx.createRadialGradient(gX, gY, 0, gX, gY, 50);
            ghostGrad.addColorStop(0, 'rgba(0, 200, 255, 0.95)');
            ghostGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.6)');
            ghostGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = ghostGrad;
            ctx.fillRect(gX - 50, gY - 50, 100, 100);

            // Thermal rings
            for (let i = 0; i < 4; i++) {
                ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 - i * 0.1})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(gX, gY, 20 + i * 15, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Scanline effect
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.08)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < ctx.canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, ctx.canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < ctx.canvas.height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(ctx.canvas.width, i);
            ctx.stroke();
        }

        // Grid text
        ctx.fillStyle = 'rgba(0, 200, 255, 0.2)';
        ctx.font = '9px monospace';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.fillText('█', 10 + i * 90, 20 + j * 70);
            }
        }
    }

    drawMinimap(ctx, playerPos, ghostPos, rooms, ghostRoom, hunting) {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const scale = ctx.canvas.width / 120;
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;

        // Draw rooms relative to player
        rooms.forEach(room => {
            const relX = room.position.x - playerPos.x;
            const relZ = room.position.z - playerPos.z;

            if (room.name === ghostRoom) {
                ctx.fillStyle = 'rgba(255, 100, 100, 0.25)';
            } else {
                ctx.fillStyle = 'rgba(100, 100, 150, 0.2)';
            }

            const x = centerX + relX * scale;
            const z = centerY + relZ * scale;
            const size = 12 * scale;

            if (x > -20 && x < ctx.canvas.width + 20 && z > -20 && z < ctx.canvas.height + 20) {
                ctx.fillRect(x - size / 2, z - size / 2, size, size);
                ctx.strokeStyle = room.name === ghostRoom ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 255, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - size / 2, z - size / 2, size, size);
            }
        });

        // Draw player (center)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw player direction indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - 12);
        ctx.stroke();

        // Draw ghost
        if (ghostPos) {
            const relGX = ghostPos.x - playerPos.x;
            const relGZ = ghostPos.z - playerPos.z;
            const gX = centerX + relGX * scale;
            const gZ = centerY + relGZ * scale;

            if (gX > -30 && gX < ctx.canvas.width + 30 && gZ > -30 && gZ < ctx.canvas.height + 30) {
                ctx.fillStyle = hunting ? '#ff0000' : '#ff6600';
                ctx.beginPath();
                ctx.arc(gX, gZ, 6, 0, Math.PI * 2);
                ctx.fill();

                // Ghost detection radius
                ctx.strokeStyle = hunting ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 100, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(gX, gZ, 20 * scale, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Border
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, ctx.canvas.width - 2, ctx.canvas.height - 2);
    }

    drawEMFDetector(emfLevel) {
        const bars = document.querySelectorAll('.detector-bar');
        const activeCount = Math.ceil((emfLevel / 5) * bars.length);

        bars.forEach((bar, index) => {
            if (index < activeCount) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });

        const hz = emfLevel * 50 + Math.random() * 20;
        document.getElementById('detector-reading').textContent = hz.toFixed(1) + ' Hz';
    }

    screenFlash(color = 'rgba(255, 0, 0, 0.3)', duration = 200) {
        const overlay = document.getElementById('screenOverlay');
        const originalBg = overlay.style.backgroundColor;
        overlay.style.backgroundColor = color;
        setTimeout(() => {
            overlay.style.backgroundColor = originalBg;
        }, duration);
    }

    createScreenGlitch() {
        const canvas = document.querySelector('canvas');
        const originalFilter = canvas.style.filter;
        canvas.style.filter = originalFilter + ' hue-rotate(90deg)';
        setTimeout(() => {
            canvas.style.filter = originalFilter;
        }, 100);
    }
}

window.EffectsEngine = EffectsEngine;
