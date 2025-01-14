'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { FileText, Upload, ArrowRight, ChevronLeft, Settings, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import GeminiChat from '@/components/GeminiChat';


// Reuse the NeuralBackground component from HomePage
const NeuralBackground = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const controls = useAnimationControls();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const particles = [];
    const numParticles = 50;
    const connectionDistance = 150;
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();

    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 3 + 1;
        this.pulseSize = this.size;
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulseOffset = Math.random() * Math.PI * 2;
      }

      update(time) {
        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Pulsing effect
        this.pulseSize = this.size + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.5;
      }

      draw(ctx, time) {
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.pulseSize * 2
        );
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.pulseSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }

    // Draw connections between particles
    const drawConnections = (particles, time) => {
      particles.forEach((particle, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - particle.x;
          const dy = particles[j].y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            
            // Create curved lines
            const midX = (particle.x + particles[j].x) / 2;
            const midY = (particle.y + particles[j].y) / 2;
            const offset = Math.sin(time * 0.001) * 20;
            
            ctx.quadraticCurveTo(
              midX + offset, midY + offset,
              particles[j].x, particles[j].y
            );

            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });
    };

    let time = 0;
    const animate = () => {
      time += 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(30, 27, 75, 0.2)');
      gradient.addColorStop(0.5, 'rgba(88, 28, 135, 0.2)');
      gradient.addColorStop(1, 'rgba(30, 27, 75, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(time);
        particle.draw(ctx, time);
      });

      // Draw connections
      drawConnections(particles, time);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute min-w-full min-h-full"
        style={{ 
          background: 'linear-gradient(to bottom right, #1e1b4b, #4c1d95, #1e1b4b)',
          width: '100%',
          height: '100%'
        }}
      />
      <div className="absolute inset-0 backdrop-blur-sm" />
    </div>
  );
};



const ChatPage = () => {
    const router = useRouter();
 
  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <NeuralBackground />
      
      <motion.div 
        className="container mx-auto px-4 py-8 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="mb-8 flex items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            className="text-gray-300"
            onClick={() => router.push('/')}
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Button>
        </motion.div>

        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 inline-block text-transparent bg-clip-text">
            AI Chat
          </h1>
          <p className="text-gray-300 max-w-2xl">
            Our system will analyze and provide intelligent interactions.
          </p>
        </motion.div>
        <GeminiChat/>
      </motion.div>
    </div>
  );
};

export default ChatPage;