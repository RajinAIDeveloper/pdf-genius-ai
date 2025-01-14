'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { FileText, Upload, ArrowRight, ChevronLeft, Settings, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import EmbeddingConverter from '@/components/ui/EmbeddingConverter';


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
    <div className="fixed inset-0 w-screen h-screen -z-10 overflow-hidden touch-none">
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full object-cover"
      style={{ 
        background: 'linear-gradient(to bottom right, #1e1b4b, #4c1d95, #1e1b4b)',
      }}
    />
    <div className="absolute inset-0 backdrop-blur-[1px] sm:backdrop-blur-sm" />
  </div>
  );
};

const UploadArea = ({ onFileSelect }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full px-2 sm:px-0"
    >
      <Card className="bg-white/5 border-purple-500/20 backdrop-blur-lg">
        <CardContent className="p-3 sm:p-6">
          <motion.div
            className={`relative mt-2 sm:mt-4 h-48 sm:h-64 rounded-lg border-2 border-dashed
              ${isDragging ? 'border-purple-400' : 'border-gray-600'}
              transition-colors duration-300`}
            onDragOver={(e) => {
              handleDrag(e);
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              handleDrag(e);
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            whileHover={{ scale: 1.01 }}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf"
              onChange={(e) => onFileSelect(e.target.files[0])}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="p-3 sm:p-4 rounded-full bg-purple-500/10 mb-3 sm:mb-4"
              >
                <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
              </motion.div>
              <p className="text-gray-300 text-base sm:text-lg mb-1 sm:mb-2">
                {window.innerWidth < 640 ? 'Upload your PDF' : 'Drag & drop your PDF here'}
              </p>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                or
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-sm sm:text-base py-1.5 px-3 sm:px-4 h-auto"
              >
                Browse Files
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TrainingStatus = ({ file, progress }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="w-full px-2 sm:px-0"
  >
    <Card className="bg-white/5 border-purple-500/20 backdrop-blur-lg">
      <CardHeader className="p-4 sm:p-6 space-y-1 sm:space-y-2">
        <CardTitle className="text-lg sm:text-xl text-white">Training Progress</CardTitle>
        <CardDescription className="text-sm sm:text-base text-gray-300 truncate">
          Processing: {file?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="space-y-3 sm:space-y-4">
          <Progress value={progress} className="h-1.5 sm:h-2 bg-purple-500/20" />
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-300">
            <span>Processing PDF</span>
            <span>{progress}%</span>
          </div>
          <Alert className="bg-purple-500/10 border-purple-500/20 p-3 sm:p-4">
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-purple-400" />
            <AlertTitle className="text-sm sm:text-base font-medium">Training in Progress</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
              Your document is being processed. This may take a few minutes.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const SettingsPanel = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    className="w-full px-2 sm:px-0"
  >
    <Card className="bg-white/5 border-purple-500/20 backdrop-blur-lg h-full">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-white flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          Training Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
        <div className="space-y-3 sm:space-y-4">
          {/* Add your settings controls here */}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const TrainingPage = () => {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);

  // Simulate progress
  React.useEffect(() => {
    if (selectedFile && progress < 100) {
      const timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 100));
      }, 100);
      return () => clearInterval(timer);
    }
  }, [selectedFile, progress]);

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <NeuralBackground />
      
      <motion.div 
        className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="mb-4 sm:mb-8 flex items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            className="text-gray-300 h-8 sm:h-10 px-2 sm:px-4 text-sm sm:text-base"
            onClick={() => router.push('/')}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </motion.div>

        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-purple-400 to-pink-400 inline-block text-transparent bg-clip-text">
            AI Embeddings
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl">
            Upload your AI Embedding Merger for AI processing. Our system will analyze and train on your content,
            making it searchable and ready for intelligent interactions.
          </p>
        </motion.div>

        <EmbeddingConverter/>
      </motion.div>
    </div>
  );
};

export default TrainingPage;