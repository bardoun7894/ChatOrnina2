import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AIAdvancedButtonProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

// Magical spreading effect that covers the entire UI
const MagicalSpread: React.FC<{ 
  isActive: boolean; 
  buttonPosition: { x: number; y: number };
  onComplete: () => void;
}> = ({ isActive, buttonPosition, onComplete }) => {
  const controls = useAnimation();
  
  useEffect(() => {
    if (isActive) {
      controls.start({
        scale: [0, 1, 1.2, 1],
        opacity: [0, 0.7, 0.3, 0],
        transition: { duration: 2.5, ease: "easeOut" }
      }).then(() => {
        onComplete();
      });
    }
  }, [isActive, controls, onComplete]);

  if (!isActive) return null;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Main spreading circle with mirror effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: buttonPosition.x,
          top: buttonPosition.y,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(96,165,250,0.1) 40%, rgba(147,197,253,0.05) 70%, transparent 100%)',
          boxShadow: '0 0 80px 20px rgba(167,139,250,0.3), inset 0 0 40px 10px rgba(255,255,255,0.2)',
          width: '100vw',
          height: '100vw',
        }}
        animate={controls}
      />
      
      {/* Mirror-like light rays */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute top-0 left-1/2 origin-bottom"
          style={{
            width: '2px',
            height: '100vh',
            background: `linear-gradient(to bottom, transparent, rgba(167,139,250,0.2), transparent)`,
            transform: `translateX(-50%) rotate(${i * 30}deg)`,
            transformOrigin: `${buttonPosition.x}px ${buttonPosition.y}px`,
            left: 0,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ 
            scaleY: [0, 1, 0.8, 0],
            opacity: [0, 0.6, 0.3, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.05,
            ease: "easeOut"
          }}
        />
      ))}
      
      {/* Sparkle particles */}
      {[...Array(20)].map((_, i) => {
        const angle = (i * 18) * (Math.PI / 180);
        const distance = 200 + Math.random() * 300;
        const size = 2 + Math.random() * 4;
        
        return (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(167,139,250,0.6) 50%, transparent 70%)`,
              boxShadow: `0 0 ${size * 2}px rgba(167,139,250,0.5)`,
            }}
            initial={{ 
              scale: 0,
              opacity: 0,
              x: buttonPosition.x,
              y: buttonPosition.y,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              x: buttonPosition.x + Math.cos(angle) * distance,
              y: buttonPosition.y + Math.sin(angle) * distance,
            }}
            transition={{
              duration: 1.5 + Math.random() * 0.5,
              delay: Math.random() * 0.5,
              ease: "easeOut"
            }}
          />
        );
      })}
      
      {/* Mirror reflection effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
          mixBlendMode: 'overlay',
        }}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.3, 0],
        }}
        transition={{
          duration: 2,
          delay: 0.5,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};

// Enhanced particle component with mirror effect
const Particle: React.FC<{ 
  id: number; 
  x: number; 
  y: number; 
  angle: number; 
  delay: number;
}> = ({ id, x, y, angle, delay }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
      }}
      initial={{ 
        scale: 0, 
        opacity: 0,
        x: 0,
        y: 0
      }}
      animate={{
        scale: [0, 1.5, 0],
        opacity: [0, 0.8, 0],
        x: Math.cos(angle) * 150,
        y: Math.sin(angle) * 150,
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: "easeOut"
      }}
    >
      <motion.div
        className="relative"
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L14.09 8.26L20.18 8.27L15.54 12.14L17.64 18.4L12 14.54L6.36 18.4L8.46 12.14L3.82 8.27L9.91 8.26L12 2Z"
            fill="url(#gradient-${id})"
            stroke="url(#gradient-${id})"
            strokeWidth="0.5"
          />
          <defs>
            <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </motion.div>
  );
};

// Enhanced light burst effect with mirror properties
const LightBurst: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`light-${i}`}
              className="absolute top-1/2 left-1/2 w-1 h-8 bg-gradient-to-t from-transparent via-purple-300/40 to-transparent"
              style={{
                transformOrigin: "center bottom",
                transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
              }}
              initial={{ 
                scaleY: 0,
                opacity: 0,
              }}
              animate={{ 
                scaleY: [0, 1.5, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AIAdvancedButton: React.FC<AIAdvancedButtonProps> = ({ 
  isActive, 
  onToggle, 
  className 
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number; delay: number }>>([]);
  const [showBurst, setShowBurst] = useState(false);
  const [showMagicalSpread, setShowMagicalSpread] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });

  const handleClick = () => {
    if (!isActive && buttonRef.current) {
      // Get button position
      const rect = buttonRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      setButtonPosition({ x, y });
      
      // Create particles
      const newParticles = [...Array(12)].map((_, i) => ({
        id: Date.now() + i,
        x: 0,
        y: 0,
        angle: (i * 30) * (Math.PI / 180), // Convert to radians
        delay: i * 0.05
      }));
      
      setParticles(newParticles);
      setShowBurst(true);
      setShowMagicalSpread(true);
      
      // Clean up particles after animation
      setTimeout(() => {
        setParticles([]);
        setShowBurst(false);
      }, 2000);
    }
    
    onToggle();
  };

  const handleMagicalSpreadComplete = () => {
    setShowMagicalSpread(false);
  };

  return (
    <>
      {/* Magical spreading effect */}
      <AnimatePresence>
        {showMagicalSpread && (
          <MagicalSpread
            isActive={showMagicalSpread}
            buttonPosition={buttonPosition}
            onComplete={handleMagicalSpreadComplete}
          />
        )}
      </AnimatePresence>
      
      {/* Render particles in a portal at the button position */}
      {particles.length > 0 && (
        <div 
          className="fixed inset-0 pointer-events-none z-50"
          style={{ overflow: 'hidden' }}
        >
          <div 
            className="absolute"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {particles.map((particle) => (
              <Particle
                key={particle.id}
                id={particle.id}
                x={particle.x}
                y={particle.y}
                angle={particle.angle}
                delay={particle.delay}
              />
            ))}
          </div>
        </div>
      )}
      
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={cn(
          "fixed top-4 flex items-center justify-center transition-all duration-300 z-20 p-2 rounded-full",
          "galileo-glass border border-gray-200/60 backdrop-blur-sm",
          isActive 
            ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-400/40 shadow-lg shadow-purple-500/20" 
            : "bg-gray-100/60 border-gray-200/60 hover:bg-gray-200/60",
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        aria-label="Toggle AI Advanced Mode"
        title={isActive ? "Disable AI Advanced Mode" : "Enable AI Advanced Mode"}
      >
        <LightBurst isActive={showBurst} />
        
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          animate={{
            rotate: isActive ? 360 : 0,
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
            repeat: isActive ? Infinity : 0,
            repeatDelay: 3
          }}
          className={cn(
            "transition-colors duration-300",
            isActive ? "text-purple-600" : "text-gray-600"
          )}
        >
          {/* Magical wood/tree icon with sparkles */}
          <path
            d="M12 2L14.09 8.26L20.18 8.27L15.54 12.14L17.64 18.4L12 14.54L6.36 18.4L8.46 12.14L3.82 8.27L9.91 8.26L12 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isActive ? "currentColor" : "none"}
            fillOpacity={isActive ? 0.2 : 0}
          />
          
          {/* Magical sparkles */}
          {isActive && (
            <>
              <motion.circle
                cx="6"
                cy="6"
                r="1"
                fill="currentColor"
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0
                }}
              />
              <motion.circle
                cx="18"
                cy="6"
                r="1"
                fill="currentColor"
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5
                }}
              />
              <motion.circle
                cx="18"
                cy="18"
                r="1"
                fill="currentColor"
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 1
                }}
              />
              <motion.circle
                cx="6"
                cy="18"
                r="1"
                fill="currentColor"
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 1.5
                }}
              />
            </>
          )}
          
          {/* Wood texture lines */}
          <path
            d="M12 2V8M12 16V22M8 10L16 14M16 10L8 14"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinecap="round"
            opacity={isActive ? 0.6 : 0.3}
          />
        </motion.svg>
      </motion.button>
    </>
  );
};

export default AIAdvancedButton;
