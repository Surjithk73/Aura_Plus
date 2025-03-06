import React, { useRef, useEffect } from 'react';

interface ModelViewerProps {
  isListening: boolean;
  isProcessing: boolean;
  hasResponse: boolean;
}

// Particle class for animation
class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  alpha: number;
  
  constructor(x: number, y: number, size: number, speedX: number, speedY: number, color: string) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speedX = speedX;
    this.speedY = speedY;
    this.color = color;
    this.alpha = Math.random() * 0.5 + 0.5;
  }
  
  update(canvas: HTMLCanvasElement, listeningFactor: number, processingFactor: number, responseFactor: number) {
    // Movement
    this.x += this.speedX;
    this.y += this.speedY;
    
    // Boundary check with wrapping
    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
    
    // Center coordinates
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = centerX - this.x;
    const dy = centerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Blend behaviors based on transition factors
    
    // Listening behavior (move toward center)
    if (listeningFactor > 0) {
      if (dist > 50) {
        this.speedX += dx / dist * 0.02 * listeningFactor;
        this.speedY += dy / dist * 0.02 * listeningFactor;
      }
      
      // Add some random movement
      this.speedX += (Math.random() - 0.5) * 0.1 * listeningFactor;
      this.speedY += (Math.random() - 0.5) * 0.1 * listeningFactor;
    }
    
    // Processing behavior (orbit around center)
    if (processingFactor > 0) {
      if (dist > 20 && dist < 150) {
        // Perpendicular force for orbit
        this.speedX += dy / dist * 0.05 * processingFactor;
        this.speedY -= dx / dist * 0.05 * processingFactor;
      }
    }
    
    // Response behavior (move outward in waves)
    if (responseFactor > 0) {
      if (dist < 150) {
        this.speedX += dx / dist * (Math.sin(Date.now() * 0.003) * 0.5 + 1) * 0.5 * -1 * responseFactor;
        this.speedY += dy / dist * (Math.sin(Date.now() * 0.003) * 0.5 + 1) * 0.5 * -1 * responseFactor;
      }
    }
    
    // Speed limit
    const maxSpeed = 1.5;
    const speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
    if (speed > maxSpeed) {
      this.speedX = (this.speedX / speed) * maxSpeed;
      this.speedY = (this.speedY / speed) * maxSpeed;
    }
    
    // Add friction
    this.speedX *= 0.98;
    this.speedY *= 0.98;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function ModelViewer({ isListening, isProcessing, hasResponse }: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Initialize particles
    const particles: Particle[] = [];
    const particleCount = 60;
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',  // Blue
      'rgba(147, 197, 253, 0.8)', // Light blue
      'rgba(96, 165, 250, 0.8)',  // Medium blue
      'rgba(37, 99, 235, 0.7)',   // Dark blue
      'rgba(219, 234, 254, 0.7)'  // Very light blue
    ];
    
    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 2 + 0.8;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const speedX = (Math.random() - 0.5) * 0.8;
      const speedY = (Math.random() - 0.5) * 0.8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      particles.push(new Particle(x, y, size, speedX, speedY, color));
    }
    
    let animationFrameId: number;
    let rotation = 0;
    let scale = 1;
    let targetScale = 1;
    let wavePhase = 0;
    
    // State transition values (0 to 1)
    let listeningFactor = isListening ? 0 : 0;
    let processingFactor = isProcessing ? 0 : 0;
    let responseFactor = hasResponse ? 0 : 0;
    
    // Target transition values
    let targetListeningFactor = isListening ? 1 : 0;
    let targetProcessingFactor = isProcessing ? 1 : 0;
    let targetResponseFactor = hasResponse && !isListening && !isProcessing ? 1 : 0;
    
    // Transition speed (lower = smoother but slower)
    const transitionSpeed = 0.05;
    
    // Function to draw connections between nearby particles
    const drawConnections = (particles: Particle[], maxDistance: number) => {
      const connectionDensity = 0.4;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          if (Math.random() > connectionDensity) continue;
          
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `rgba(147, 197, 253, ${opacity * 0.25})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };
    
    // Main render function
    const render = () => {
      // Update transition factors with smooth easing
      listeningFactor += (targetListeningFactor - listeningFactor) * transitionSpeed;
      processingFactor += (targetProcessingFactor - processingFactor) * transitionSpeed;
      responseFactor += (targetResponseFactor - responseFactor) * transitionSpeed;
      
      // Clear canvas with transparent background for better blending
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Create gradient background that matches the page gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, 'rgba(17, 24, 39, 0.2)');
      bgGradient.addColorStop(1, 'rgba(31, 41, 55, 0.2)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Update wave phase
      wavePhase += 0.03;
      
      // Handle specific state behaviors based on direct state props
      
      // If ready (no active states), keep it static
      if (!isListening && !isProcessing && !hasResponse) {
        rotation = 0; // No rotation
        targetScale = 1; // Normal scale
      }
      // If listening, shrink it
      else if (isListening) {
        targetScale = 0.9; // Shrink to 90%
        
        // Gradually slow down any existing rotation
        rotation *= 0.9;
      }
      // If processing/thinking, rotate it
      else if (isProcessing) {
        targetScale = 1; // Normal scale
        rotation += 0.02; // Add rotation
      }
      // If talking/responding, animate it
      else if (hasResponse) {
        targetScale = 1; // Normal scale
        rotation += 0.005; // Slight rotation
      }
      
      // Apply scale smoothly
      scale = scale + (targetScale - scale) * 0.1;
      
      // Draw circular backdrop
      const backdropGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, canvas.width * 0.4
      );
      backdropGradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
      backdropGradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, canvas.width * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = backdropGradient;
      ctx.fill();
      
      // Update and draw all particles
      particles.forEach(particle => {
        particle.update(canvas, listeningFactor, processingFactor, responseFactor);
        particle.draw(ctx);
      });
      
      // Draw connections between nearby particles
      drawConnections(particles, 55);
      
      // Draw central element
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      
      // Response animation (gentle bounce) - smooth transition
      if (hasResponse) {
        const bounceY = Math.sin(wavePhase * 2) * 3;
        ctx.translate(0, bounceY);
      }
      
      // Central orb
      const orbGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
      orbGradient.addColorStop(0, 'rgba(96, 165, 250, 0.9)');
      orbGradient.addColorStop(1, 'rgba(37, 99, 235, 0.2)');
      
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fill();
      
      // Processing rings animation with smooth transition
      if (isProcessing) {
        // Multiple rings with different speeds
        for (let i = 0; i < 3; i++) {
          const ringRadius = 24 + i * 6;
          const startAngle = (rotation * (i + 1) * 2) % (Math.PI * 2);
          const endAngle = startAngle + Math.PI * 1.6;
          
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, startAngle, endAngle);
          ctx.strokeStyle = `rgba(147, 197, 253, ${0.7 - i * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      
      // Listening animation (pulsing outline) with smooth transition
      if (isListening) {
        const pulseSize = Math.sin(wavePhase) * 3 + 20;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Audio visualization bars with smooth transition
        const barCount = 6;
        const barWidth = 1.5;
        const barHeight = 8;
        const barSpacing = 4;
        const totalWidth = barCount * (barWidth + barSpacing) - barSpacing;
        
        ctx.save();
        ctx.translate(-totalWidth / 2, 0);
        
        for (let i = 0; i < barCount; i++) {
          const height = barHeight * (0.3 + Math.sin(wavePhase + i * 0.4) * 0.7);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(i * (barWidth + barSpacing), -height / 2, barWidth, height);
        }
        
        ctx.restore();
      }
      
      // Response/talking animation (audio wave visualization)
      if (hasResponse) {
        // Sound wave effect
        const waveCount = 12;
        const waveRadius = 30;
        
        ctx.beginPath();
        for (let i = 0; i <= waveCount; i++) {
          const angle = (i / waveCount) * Math.PI * 2;
          const amplitude = 5 * (0.5 + Math.sin(wavePhase * 4 + i * 0.5) * 0.5);
          const x = Math.cos(angle) * (waveRadius + amplitude);
          const y = Math.sin(angle) * (waveRadius + amplitude);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Continue animation loop
      animationFrameId = window.requestAnimationFrame(render);
    };
    
    // Start animation
    render();
    
    // Update transition targets when props change
    targetListeningFactor = isListening ? 1 : 0;
    targetProcessingFactor = isProcessing ? 1 : 0;
    targetResponseFactor = hasResponse && !isListening && !isProcessing ? 1 : 0;
    
    // Cleanup
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isProcessing, hasResponse]);
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="rounded-full overflow-hidden" style={{ width: '100%', height: '100%', aspectRatio: '1/1' }}>
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={300}
          className="w-full h-full"
        />
      </div>
    </div>
  );
} 