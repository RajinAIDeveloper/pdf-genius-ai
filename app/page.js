'use client'
import React, { useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Brain, FileText, Database, MessageSquare, Combine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const NeuralBackground = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const controls = useAnimationControls();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const particles = [];
    // Reduce number of particles on mobile for better performance
    const numParticles = window.innerWidth < 768 ? 30 : 50;
    // Adjust connection distance based on screen size
    const connectionDistance = window.innerWidth < 768 ? 100 : 150;
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();

    // Particle class remains the same
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
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
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

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(30, 27, 75, 0.2)');
      gradient.addColorStop(0.5, 'rgba(88, 28, 135, 0.2)');
      gradient.addColorStop(1, 'rgba(30, 27, 75, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update(time);
        particle.draw(ctx, time);
      });

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
    <div className="fixed inset-0 w-full h-full -z-10">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          background: 'linear-gradient(to bottom right, #1e1b4b, #4c1d95, #1e1b4b)',
          position: 'fixed',
          top: 0,
          left: 0
        }}
      />
      <div className="fixed inset-0 backdrop-blur-sm" />
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, route }) => {
  const router = useRouter();
  const controls = useAnimationControls();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(route)}
      className="h-full"
    >
      <Card className="relative overflow-hidden h-full bg-white/5 border-purple-500/20 backdrop-blur-lg hover:bg-white/10 transition-all duration-300 cursor-pointer group">
        <motion.div
          className="absolute -right-8 -top-8 h-24 w-24 md:h-32 md:w-32 rounded-full bg-purple-500/10"
          whileHover={{ scale: 1.2 }}
        />
        <CardHeader className="p-4 md:p-6">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center md:justify-start"
          >
            <Icon className="h-8 w-8 md:h-12 md:w-12 text-purple-400 mb-2 md:mb-4 group-hover:text-purple-300" />
          </motion.div>
          <CardTitle className="text-white text-lg md:text-xl text-center md:text-left">{title}</CardTitle>
          <CardDescription className="text-gray-300 text-sm md:text-base text-center md:text-left">{description}</CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
};

const HomePage = () => {
  const features = [
    {
      icon: FileText,
      title: "PDF Training",
      description: "Upload and process your PDF documents with advanced AI training capabilities",
      route: "/training"
    },
    {
      icon: Database,
      title: "Vector AI Embeddings",
      description: "Generate powerful vector embeddings from your documents for enhanced search and analysis",
      route: "/embeddings"
    },
    {
      icon: Combine,
      title: "Embeddings Merger",
      description: "Combine and optimize multiple embeddings for comprehensive knowledge integration",
      route: "/merger"
    },
    {
      icon: MessageSquare,
      title: "AI Chat Interface",
      description: "Interact with your processed documents through an intelligent chat interface",
      route: "/chat"
    }
  ];

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden text-white">
      <NeuralBackground />
      
      <motion.div 
        className="container mx-auto px-4 py-8 md:py-16 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="text-center mb-8 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-purple-400 to-pink-400 inline-block text-transparent bg-clip-text"
            whileHover={{ scale: 1.05 }}
          >
            PDF Genius AI
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto px-4"
          >
            Transform your documents into intelligent, searchable knowledge bases with cutting-edge AI technology
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * (index + 3), duration: 0.8 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HomePage;