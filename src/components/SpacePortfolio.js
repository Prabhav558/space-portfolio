import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, VolumeX, HelpCircle } from 'lucide-react';

// Main App Component
const SpacePortfolio = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [isSpaceshipDocked, setIsSpaceshipDocked] = useState(false);
  const [sound, setSound] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [manualControl, setManualControl] = useState(false);
  const [spaceshipPosition, setSpaceshipPosition] = useState({ x: 50, y: 50 });
  const [spaceshipVelocity, setSpaceshipVelocity] = useState({ x: 0, y: 0 });
  const [spaceshipRotation, setSpaceshipRotation] = useState(0);
  const [keysPressed, setKeysPressed] = useState({});
  const [showMinimap, setShowMinimap] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  const spaceshipRef = useRef(null);
  const universeRef = useRef(null);
  const planetsRef = useRef([]);
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const requestRef = useRef(null);
  const previousTimeRef = useRef(0);
  const contentTimerRef = useRef(null);
  
  // Section data - planets now smaller and farther apart
  const sections = [
    { id: 'home', name: 'Home', color: 'from-cyan-400 to-blue-800', planetSize: 'w-24 h-24', position: { x: 50, y: 15 }, details: { rings: false, moons: 1, craters: true, atmosphere: true } },
    { id: 'about', name: 'About', color: 'from-orange-400 to-yellow-400', planetSize: 'w-32 h-32', position: { x: 15, y: 30 }, details: { rings: false, moons: 0, craters: true, atmosphere: false } },
    { id: 'projects', name: 'Projects', color: 'from-purple-600 to-red-600', planetSize: 'w-36 h-36', position: { x: 85, y: 25 }, details: { rings: true, moons: 2, craters: false, atmosphere: true } },
    { id: 'skills', name: 'Skills', color: 'from-green-400 to-lime-500', planetSize: 'w-28 h-28', position: { x: 25, y: 70 }, details: { rings: false, moons: 1, craters: true, atmosphere: true } },
    { id: 'experience', name: 'Experience', color: 'from-cyan-500 to-blue-400', planetSize: 'w-30 h-30', position: { x: 75, y: 45 }, details: { rings: true, moons: 0, craters: false, atmosphere: false } },
    { id: 'education', name: 'Education', color: 'from-pink-500 to-rose-500', planetSize: 'w-26 h-26', position: { x: 10, y: 55 }, details: { rings: false, moons: 1, craters: true, atmosphere: false } },
    { id: 'blog', name: 'Blog', color: 'from-green-500 to-emerald-500', planetSize: 'w-28 h-28', position: { x: 60, y: 85 }, details: { rings: false, moons: 0, craters: false, atmosphere: true } },
    { id: 'contact', name: 'Contact', color: 'from-indigo-500 to-purple-600', planetSize: 'w-20 h-20', position: { x: 40, y: 90 }, details: { rings: true, moons: 1, craters: true, atmosphere: true } }
  ];
  
  // Optimized animation loop with time delta
  const animate = time => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    const deltaTime = time - previousTimeRef.current;
    previousTimeRef.current = time;
    
    // Only update physics if in manual control and not loading
    if (manualControl && !loading) {
      updateSpaceshipPhysics(deltaTime);
    }
    
    requestRef.current = requestAnimationFrame(animate);
  };
  
  // Setup animation loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [manualControl, loading]);
  
  // Separate function for spaceship physics updates
  const updateSpaceshipPhysics = (deltaTime) => {
    // Scale deltaTime to make physics frame-rate independent
    const timeScale = deltaTime / 16; // Normalized to 60fps
    
    // Calculate acceleration based on keys pressed
    let acceleration = { x: 0, y: 0 };
    let rotationChange = 0;
    
    if (keysPressed['ArrowLeft']) {
      rotationChange = -3 * timeScale;
    }
    if (keysPressed['ArrowRight']) {
      rotationChange = 3 * timeScale;
    }
    
    // Update rotation
    setSpaceshipRotation(prev => {
      let newRotation = prev + rotationChange;
      // Keep rotation between 0 and 360
      if (newRotation < 0) newRotation += 360;
      if (newRotation >= 360) newRotation -= 360;
      return newRotation;
    });
    
    // Convert rotation to radians and calculate thrust vector
    const radians = spaceshipRotation * Math.PI / 180;
    if (keysPressed['ArrowUp']) {
      acceleration = {
        x: Math.sin(radians) * 0.05 * timeScale,
        y: -Math.cos(radians) * 0.05 * timeScale
      };
    } else if (keysPressed['ArrowDown']) {
      acceleration = {
        x: -Math.sin(radians) * 0.03 * timeScale,
        y: Math.cos(radians) * 0.03 * timeScale
      };
    }
    
    // Update velocity with acceleration and damping
    setSpaceshipVelocity(prev => ({
      x: (prev.x + acceleration.x) * (0.98 ** timeScale), // Damping factor
      y: (prev.y + acceleration.y) * (0.98 ** timeScale)
    }));
    
    // Update position with velocity
    setSpaceshipPosition(prev => {
      // Calculate new position
      const newPos = {
        x: prev.x + spaceshipVelocity.x,
        y: prev.y + spaceshipVelocity.y
      };
      
      // Keep spaceship within bounds
      if (newPos.x < 0) newPos.x = 0;
      if (newPos.x > 100) newPos.x = 100;
      if (newPos.y < 0) newPos.y = 0;
      if (newPos.y > 100) newPos.y = 100;
      
      // Check for planet docking
      checkPlanetDocking(newPos);
      
      return newPos;
    });
  };
  
  // Separate function to check for planet docking
  const checkPlanetDocking = (position) => {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const dx = position.x - section.position.x;
      const dy = position.y - section.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If very close to a planet and moving slowly, dock
      const speed = Math.sqrt(spaceshipVelocity.x * spaceshipVelocity.x + spaceshipVelocity.y * spaceshipVelocity.y);
      if (distance < 7 && speed < 0.3) {
        setManualControl(false);
        setActiveSection(i);
        setIsSpaceshipDocked(true);
        
        // Clear any previous timer to prevent issues
        if (contentTimerRef.current) {
          clearTimeout(contentTimerRef.current);
        }
        
        // Show content after docking (delayed)
        contentTimerRef.current = setTimeout(() => {
          setShowContent(true);
        }, 1000);
        
        break; // Stop checking once we dock
      }
    }
  };
  
  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent arrow keys from scrolling the page
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      
      setKeysPressed(prev => ({ ...prev, [e.key]: true }));
      
      // Enable manual control when any arrow key is pressed
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isTransitioning) {
        if (!manualControl) {
          setManualControl(true);
          setIsSpaceshipDocked(false);
          setShowContent(false);
        }
      }
      
      // Space key toggles minimap
      if (e.key === ' ') {
        setShowMinimap(prev => !prev);
      }
      
      // Numbers 1-8 for quick navigation to planets
      if (!isTransitioning && e.key >= '1' && e.key <= '8') {
        const planetIndex = parseInt(e.key) - 1;
        if (planetIndex >= 0 && planetIndex < sections.length) {
          navigateToPlanet(planetIndex);
        }
      }
    };
    
    const handleKeyUp = (e) => {
      setKeysPressed(prev => {
        const newState = { ...prev };
        delete newState[e.key];
        return newState;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTransitioning, manualControl]);
  
  // Simulate loading
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setLoading(false);
              // Start at the home planet
              setTimeout(() => {
                navigateToPlanet(0);
              }, 300);
            }, 500);
            return 100;
          }
          return newProgress;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [loading]);
  
  // Handle mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Clean up all timers, animation frames, and audio on unmount
  useEffect(() => {
    return () => {
      // Clean up all timers
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
      }
      
      // Clean up animation frames
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Clean up audio
      if (audioContextRef.current) {
        oscillatorsRef.current.forEach(osc => {
          try {
            osc.stop();
          } catch (e) {
            // Ignore any errors during cleanup
          }
        });
        
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      }
    };
  }, []);
  
  // Handle sound toggle
  const toggleSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        if (oscillatorsRef.current.length === 0) {
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 0.1;
          gainNode.connect(audioContextRef.current.destination);
          
          const lfo = audioContextRef.current.createOscillator();
          lfo.frequency.value = 0.1;
          const lfoGain = audioContextRef.current.createGain();
          lfoGain.gain.value = 0.05;
          lfo.connect(lfoGain);
          lfoGain.connect(gainNode.gain);
          lfo.start();
          
          const frequencies = [60, 67, 74];
          const types = ['sine', 'sine', 'triangle'];
          
          frequencies.forEach((freq, i) => {
            const osc = audioContextRef.current.createOscillator();
            osc.frequency.value = freq;
            osc.type = types[i];
            osc.connect(gainNode);
            oscillatorsRef.current.push(osc);
          });
        }
      }
      
      if (!sound) {
        oscillatorsRef.current.forEach(osc => {
          try {
            osc.start();
          } catch (e) {
            // Already started, ignore
          }
        });
      } else {
        oscillatorsRef.current.forEach(osc => {
          try {
            osc.stop();
            const newOsc = audioContextRef.current.createOscillator();
            newOsc.frequency.value = osc.frequency.value;
            newOsc.type = osc.type;
            newOsc.connect(osc.connect);
            oscillatorsRef.current[oscillatorsRef.current.indexOf(osc)] = newOsc;
          } catch (e) {
            // Already stopped, ignore
          }
        });
      }
      
      setSound(!sound);
    } catch (error) {
      console.error("Error managing audio:", error);
    }
  };
  
  // Navigate to a planet and show its content
  const navigateToPlanet = (index) => {
    if (isTransitioning || index === activeSection) return;
    
    // Clear any existing content timer
    if (contentTimerRef.current) {
      clearTimeout(contentTimerRef.current);
    }
    
    setIsTransitioning(true);
    setShowContent(false);
    setManualControl(false);
    setIsSpaceshipDocked(false);
    
    // First undock from current planet
    setTimeout(() => {
      setActiveSection(index);
      
      // Position the spaceship for auto-navigation
      const targetSection = sections[index];
      setSpaceshipPosition({
        x: targetSection.position.x,
        y: targetSection.position.y - 7 // Position above the planet for docking
      });
      
      // Reset velocity
      setSpaceshipVelocity({ x: 0, y: 0 });
      
      // Dock with new planet
      setTimeout(() => {
        setIsSpaceshipDocked(true);
        
        // Show content after docking
        contentTimerRef.current = setTimeout(() => {
          setShowContent(true);
          setIsTransitioning(false);
        }, 1000);
      }, 1200);
    }, 600);
  };
  
  // Generate stars - memoized
  const generateStars = (count, size) => {
    return Array(count)
      .fill()
      .map((_, i) => ({
        id: i,
        size: Math.random() * size,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 4
      }));
  };
  
  // Stars for each layer - memoized
  const starLayers = useMemo(() => [
    generateStars(80, 3),  // Reduced count for performance
    generateStars(120, 2.5),
    generateStars(160, 2)
  ], []);
  
  // Generate dust particles around planets - memoized
  const generateDustParticles = (count) => {
    return Array(count)
      .fill()
      .map((_, i) => ({
        id: i,
        size: 1 + Math.random() * 2,
        angle: Math.random() * Math.PI * 2,
        distance: 40 + Math.random() * 30,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.3 + Math.random() * 0.7
      }));
  };
  
  // Generate craters for planets - memoized
  const generateCraters = (count) => {
    return Array(count)
      .fill()
      .map((_, i) => ({
        id: i,
        size: 3 + Math.random() * 8,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        opacity: 0.1 + Math.random() * 0.2
      }));
  };
  
  // Dust particles for animation - memoized
  const dustParticles = useMemo(() => generateDustParticles(15), []);
  
  // Craters for planets - memoized
  const craters = useMemo(() => generateCraters(6), []);
  
  // Generate parallax effect for stars based on mouse position
  const getStarStyles = (layer, index) => {
    const depth = (index + 1) * 5;
    const translateX = mousePosition.x * depth;
    const translateY = mousePosition.y * depth;
    
    return {
      transform: `translate(${translateX}px, ${translateY}px)`
    };
  };
  
  // Get spaceship position styles
  const getSpaceshipStyles = () => {
    if (manualControl) {
      return {
        left: `${spaceshipPosition.x}%`,
        top: `${spaceshipPosition.y}%`,
        transform: `translate(-50%, -50%) rotate(${spaceshipRotation}deg)`,
        transition: 'none'
      };
    }
    
    const activePlanet = sections[activeSection];
    const baseX = activePlanet.position.x;
    const baseY = activePlanet.position.y;
    
    // When docked, position right at the planet
    if (isSpaceshipDocked) {
      let dockingX = baseX;
      let dockingY = baseY - 6; // Position slightly above the planet
      
      return {
        left: `${dockingX}%`,
        top: `${dockingY}%`,
        transform: `translate(-50%, -50%) rotate(0deg)`,
        transition: 'all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
      };
    }
    
    // When not docked, position at a distance from the planet
    // Add some wobble with sine for a floating effect
    const time = Date.now() * 0.001;
    const wobbleX = Math.sin(time * 1.5) * 2;
    const wobbleY = Math.cos(time * 1.2) * 1.5;
    
    let positionX = baseX + wobbleX;
    let positionY = baseY - 10 + wobbleY; // Hover above the planet
    
    return {
      left: `${positionX}%`,
      top: `${positionY}%`,
      transform: `translate(-50%, -50%) rotate(0deg)`,
      transition: 'all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
    };
  };
  
  // Get styles for dust particles orbiting planets
  const getDustStyles = (particle, planetIndex) => {
    if (planetIndex !== activeSection) return { opacity: 0 };
    
    const time = Date.now() * 0.001;
    const speed = particle.speed;
    const angle = particle.angle + time * speed;
    const distance = particle.distance;
    
    return {
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      left: `calc(50% + ${Math.cos(angle) * distance}px)`,
      top: `calc(50% + ${Math.sin(angle) * distance}px)`,
      opacity: isSpaceshipDocked ? particle.opacity : 0,
      transition: 'opacity 0.5s ease-in-out'
    };
  };
  
  // Get planet activation status
  const getPlanetActiveClass = (index) => {
    if (index === activeSection) {
      return 'scale-110 z-30';
    }
    return 'opacity-60 hover:opacity-80 hover:scale-105';
  };
  
  // Toggle controls visibility
  const toggleControls = () => {
    setShowControls(prev => !prev);
  };
  
  // Create thruster effect based on key presses
  const getThrusterStyles = () => {
    if (!manualControl) return {};
    
    // Forward thruster
    if (keysPressed['ArrowUp']) {
      return {
        height: '8px',
        boxShadow: '0 0 15px #ef4444',
        animation: 'none'
      };
    }
    
    // Reverse thruster (smaller)
    if (keysPressed['ArrowDown']) {
      return {
        height: '4px',
        boxShadow: '0 0 10px #ef4444',
        animation: 'none',
        top: '-3px',
        borderRadius: '4px 4px 0 0'
      };
    }
    
    return {};
  };
  
  // Create side thruster effects based on key presses
  const getLeftThrusterStyles = () => {
    if (!manualControl || !keysPressed['ArrowRight']) return {};
    
    return {
      width: '6px',
      height: '4px',
      backgroundColor: '#ef4444',
      boxShadow: '0 0 10px #ef4444',
      position: 'absolute',
      right: '-5px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRadius: '0 4px 4px 0'
    };
  };
  
  const getRightThrusterStyles = () => {
    if (!manualControl || !keysPressed['ArrowLeft']) return {};
    
    return {
      width: '6px',
      height: '4px',
      backgroundColor: '#ef4444',
      boxShadow: '0 0 10px #ef4444',
      position: 'absolute',
      left: '-5px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRadius: '4px 0 0 4px'
    };
  };
  
  // If still loading, show the loading screen
  if (loading) {
    return (
      <div className="fixed w-full h-full bg-black flex justify-center items-center z-50">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 relative animate-pulse">
            <div className="absolute w-16 h-10 bg-gradient-to-r from-blue-500 to-indigo-800 rounded-full shadow-lg shadow-blue-500/50"></div>
            <div className="absolute w-6 h-4 bg-cyan-300 rounded-full left-5 top-3 shadow-lg shadow-cyan-300/50"></div>
          </div>
          <h1 className="mt-6 text-2xl font-bold bg-gradient-to-r from-cyan-400 to-yellow-400 text-transparent bg-clip-text">
            Initiating Cosmic Journey
          </h1>
          <div className="w-64 h-1 bg-gray-800 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-yellow-400"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Stars Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {starLayers.map((stars, layerIndex) => (
          <div 
            key={layerIndex}
            className="absolute inset-0"
            style={getStarStyles(stars, layerIndex)}
          >
            {stars.map(star => (
              <div
                key={star.id}
                className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  animationDelay: `${star.delay}s`
                }}
              />
            ))}
          </div>
        ))}
        
        {/* Nebulas - reduced in number for performance */}
        <div className="absolute w-96 h-96 top-[20%] left-[15%] rounded-full bg-purple-500/30 filter blur-3xl opacity-20"></div>
        <div className="absolute w-[500px] h-[500px] top-[40%] left-[60%] rounded-full bg-cyan-400/15 filter blur-3xl opacity-15"></div>
      </div>
      
      {/* Planets */}
      <div className="fixed inset-0 z-10">
        {sections.map((section, index) => (
          <div
            key={index}
            ref={el => planetsRef.current[index] = el}
            className={`absolute ${section.planetSize} rounded-full bg-gradient-to-br ${section.color} cursor-pointer transition-all duration-700 transform ${getPlanetActiveClass(index)}`}
            style={{
              left: `${section.position.x}%`,
              top: `${section.position.y}%`,
              transform: `translate(-50%, -50%) ${index === activeSection && isSpaceshipDocked ? 'scale(1.1)' : 'scale(1)'}`,
              boxShadow: index === activeSection && isSpaceshipDocked ? '0 0 30px rgba(255, 255, 255, 0.4)' : '0 0 15px rgba(255, 255, 255, 0.15)'
            }}
            onClick={() => navigateToPlanet(index)}
            title={section.name}
          >
            {/* Surface pattern - simplified for performance */}
            <div className="absolute inset-0 rounded-full overflow-hidden opacity-70">
              <div className="absolute inset-0" 
                style={{ 
                  backgroundImage: index % 3 === 0 
                    ? `radial-gradient(circle at 30% 30%, transparent 0%, transparent 10%, rgba(255,255,255,0.2) 10%, transparent 20%)`
                    : index % 3 === 1
                    ? `linear-gradient(45deg, transparent 0%, transparent 40%, rgba(255,255,255,0.15) 40%, transparent 60%)`
                    : `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 20%)`
                }}
              />
            </div>
            
            {/* Craters for rocky planets - conditional rendering for performance */}
            {section.details.craters && index === activeSection && craters.map(crater => (
              <div 
                key={crater.id}
                className="absolute rounded-full bg-white/10"
                style={{
                  width: `${crater.size}px`,
                  height: `${crater.size}px`,
                  left: `${crater.x}%`,
                  top: `${crater.y}%`,
                  opacity: crater.opacity,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
            
            {/* Planet Atmosphere - only render for active planets */}
            {section.details.atmosphere && (index === activeSection || index === activeSection + 1 || index === activeSection - 1) && (
              <div className="absolute inset-[-10%] rounded-full opacity-30 blur-sm"
                style={{
                  background: `radial-gradient(circle, transparent 60%, ${getComputedStyle(document.documentElement).getPropertyValue('--color-' + section.color.split('-')[1])} 100%)`
                }}
              />
            )}
            
            {/* Planet rings - conditional rendering for performance */}
            {section.details.rings && (index === activeSection || index === activeSection + 1 || index === activeSection - 1) && (
              <div className="absolute w-[140%] h-[8px] bg-white/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: 'translate(-50%, -50%) rotateX(75deg) rotate(30deg)',
                  borderRadius: '50%'
                }}
              >
                <div className="absolute inset-0 opacity-50"
                  style={{
                    background: `linear-gradient(90deg, transparent 20%, ${getComputedStyle(document.documentElement).getPropertyValue('--color-' + section.color.split('-')[1])} 50%, transparent 80%)`
                  }}
                />
              </div>
            )}
            
            {/* Planet name label */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded text-[10px] opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap text-white/70">
              {section.name}
            </div>
            
            {/* Orbiting moons - conditional rendering for performance */}
            {section.details.moons > 0 && (index === activeSection || index === activeSection + 1 || index === activeSection - 1) && 
              Array.from({ length: section.details.moons }).map((_, moonIndex) => (
                <div 
                  key={moonIndex}
                  className="absolute w-[6px] h-[6px] rounded-full bg-gray-200 animate-orbit"
                  style={{ 
                    animationDuration: `${20 + moonIndex * 5}s`, 
                    animationDelay: `${moonIndex * 2}s`
                  }}
                />
              ))
            }
            
            {/* Orbiting dust particles - only for active planet */}
            {index === activeSection && dustParticles.map((particle) => (
              <div
                key={particle.id}
                className="absolute rounded-full bg-white"
                style={getDustStyles(particle, index)}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Spaceship */}
      <div 
        ref={spaceshipRef}
        className="fixed w-16 h-10 z-30"
        style={getSpaceshipStyles()}
      >
        <div className="relative w-full h-full">
          <div className="absolute w-16 h-8 bg-gradient-to-br from-blue-400 to-indigo-800 rounded-full shadow-lg shadow-blue-500/50"></div>
          <div className="absolute w-6 h-4 bg-cyan-300 rounded-full left-5 top-2 shadow-lg shadow-cyan-300/50"></div>
          <div 
            className="absolute w-3 h-3 bg-red-500 rounded-b-lg bottom-[-3px] left-[6.5px] animate-thruster shadow-lg shadow-red-500/50"
            style={getThrusterStyles()}
          ></div>
          <div className="absolute w-6 h-3 bg-gradient-to-r from-blue-400 to-indigo-800 top-3 left-[-3px] transform skew-x-[-20deg] rounded-l-lg"></div>
          <div className="absolute w-6 h-3 bg-gradient-to-l from-blue-400 to-indigo-800 top-3 right-[-3px] transform skew-x-[20deg] rounded-r-lg"></div>
          <div className="absolute w-1 h-3 bg-gray-300 top-[-3px] left-[48%]"></div>
          
          {/* Side thrusters */}
          <div style={getLeftThrusterStyles()}></div>
          <div style={getRightThrusterStyles()}></div>
          
          {/* Connection beam when docked */}
          {isSpaceshipDocked && !manualControl && (
            <div className="absolute w-1 h-14 bg-gradient-to-b from-cyan-400/80 to-transparent bottom-[-14px] left-[48%] animate-pulse-beam"></div>
          )}
        </div>
      </div>
      
      {/* Content Cards */}
      <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center">
        <div 
          className={`w-full max-w-2xl transition-all duration-1000 ease-in-out transform ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
          style={{ 
            transitionDelay: showContent ? '0.5s' : '0s',
            pointerEvents: showContent ? 'auto' : 'none'
          }}
        >
          {/* Home Content */}
          {activeSection === 0 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-yellow-400 text-transparent bg-clip-text">
                Welcome to My Cosmic Portfolio
              </h2>
              <p className="leading-relaxed mb-4">
                Hello! I'm [Your Name], a creative developer exploring the digital universe. Join me on this interstellar journey through my work, skills, and experiences.
              </p>
              <p className="leading-relaxed mb-4">
                Click on any planet to navigate to that section of my portfolio, or control your spacecraft using the arrow keys to explore at your own pace.
              </p>
              <div className="mt-8 p-4 bg-white/5 rounded-lg">
                <h3 className="text-cyan-400 font-semibold mb-2">Navigation Controls:</h3>
                <ul className="text-sm text-white/80 space-y-2">
                  <li><span className="text-yellow-400">↑</span> - Accelerate forward</li>
                  <li><span className="text-yellow-400">↓</span> - Reverse thrusters</li>
                  <li><span className="text-yellow-400">←</span> / <span className="text-yellow-400">→</span> - Rotate spacecraft</li>
                  <li><span className="text-yellow-400">Space</span> - Toggle minimap</li>
                  <li><span className="text-yellow-400">1-8</span> - Quick jump to planets</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* About Content */}
          {activeSection === 1 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-yellow-400 text-transparent bg-clip-text">
                About Me
              </h2>
              <p className="leading-relaxed mb-4">
                Greetings, cosmic traveler! I'm a passionate [Your Profession] with [X] years of experience creating digital experiences that inspire and engage.
              </p>
              <p className="leading-relaxed mb-6">
                My journey began [brief background]. I'm driven by [what motivates you] and constantly exploring new technologies and creative approaches.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-xl font-semibold text-yellow-400 mb-3">My Mission</h3>
                  <p className="text-white/80">
                    To create digital experiences that are not only visually stunning but also intuitive and accessible to all users.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-xl font-semibold text-orange-400 mb-3">My Vision</h3>
                  <p className="text-white/80">
                    To push the boundaries of web development and create innovative solutions that make a positive impact in the digital world.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Projects Content */}
          {activeSection === 2 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-red-600 text-transparent bg-clip-text">
                My Cosmic Projects
              </h2>
              <p className="leading-relaxed mb-8">
                Here are some of the stellar projects I've launched into the digital universe:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Nebula Dashboard",
                    description: "An interactive analytics dashboard with real-time data visualization.",
                    techBadges: ["#61DAFB", "#764ABC", "#38B2AC"],
                  },
                  {
                    title: "Orbit Commerce",
                    description: "A full-stack e-commerce platform with seamless payment integration.",
                    techBadges: ["#68A063", "#F0DB4F", "#DD3A0A"],
                  },
                  {
                    title: "Stellar Motion",
                    description: "A WebGL-based 3D animation library for immersive web experiences.",
                    techBadges: ["#FF7C00", "#F0DB4F", "#3C873A"],
                  },
                  {
                    title: "Pulsar CMS",
                    description: "A headless CMS solution built for speed and developer flexibility.",
                    techBadges: ["#FF4081", "#2196F3", "#8BC34A"],
                  }
                ].map((project, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 rounded-xl p-5 transition-all duration-300 hover:-translate-y-2 hover:bg-white/10 hover:shadow-lg group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-yellow-400 mb-2">{project.title}</h3>
                      <p className="text-white/80 text-sm">{project.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex gap-1">
                        {project.techBadges.map((color, i) => (
                          <div 
                            key={i} 
                            className="w-5 h-5 rounded-full" 
                            style={{ backgroundColor: color }}
                          ></div>
                        ))}
                      </div>
                      <a href="#" className="text-cyan-400 text-sm hover:text-white transition-colors">View →</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Skills Content */}
          {activeSection === 3 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-green-400 to-lime-500 text-transparent bg-clip-text">
                Skills & Technologies
              </h2>
              <p className="leading-relaxed mb-8">
                My toolkit for navigating the digital cosmos:
              </p>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">Frontend Development</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Vue.js", "Next.js"].map((skill, index) => (
                      <div 
                        key={index}
                        className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-md cursor-pointer"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">Backend Development</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Node.js", "Express", "Python", "Django", "MongoDB", "PostgreSQL"].map((skill, index) => (
                      <div 
                        key={index}
                        className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-md cursor-pointer"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">Creative Development</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Three.js", "WebGL", "Canvas API", "GSAP", "Shader Programming"].map((skill, index) => (
                      <div 
                        key={index}
                        className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-md cursor-pointer"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Experience Content */}
          {activeSection === 4 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-500 to-blue-400 text-transparent bg-clip-text">
                Professional Journey
              </h2>
              <p className="leading-relaxed mb-8">
                My trajectory through the professional cosmos:
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    title: "Senior Frontend Developer",
                    company: "Galaxy Tech",
                    period: "2023 - Present",
                    description: "Leading frontend development for innovative web applications."
                  },
                  {
                    title: "Full Stack Developer",
                    company: "Orbit Systems",
                    period: "2020 - 2023",
                    description: "Developed and maintained full-stack applications."
                  },
                  {
                    title: "Web Developer",
                    company: "Stellar Digital",
                    period: "2018 - 2020",
                    description: "Created responsive websites and interactive user interfaces."
                  }
                ].map((exp, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 p-5 rounded-lg border border-white/10 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/10"
                  >
                    <h3 className="text-xl font-semibold text-yellow-400">{exp.title}</h3>
                    <p className="text-cyan-400 text-sm mb-2">{exp.period}</p>
                    <p className="text-white/80">{exp.company}</p>
                    <p className="text-sm mt-2">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Education Content */}
          {activeSection === 5 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-rose-500 text-transparent bg-clip-text">
                Educational Background
              </h2>
              <p className="leading-relaxed mb-8">
                My academic foundations in the universe of technology:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    degree: "M.S. Computer Science",
                    institution: "University of Technology",
                    period: "2015 - 2017",
                    description: "Specialized in Interactive Media and Web Technologies"
                  },
                  {
                    degree: "B.S. Computer Science",
                    institution: "Digital Arts Academy",
                    period: "2011 - 2015",
                    description: "Focus on Software Development and Creative Computing"
                  },
                  {
                    degree: "Advanced Web Development",
                    institution: "Tech Institute Certificate",
                    period: "2018",
                    description: "Intensive course on modern web development techniques"
                  }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 p-6 rounded-xl border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:bg-white/10 hover:shadow-lg"
                  >
                    <h3 className="text-xl font-semibold text-pink-400 mb-2">{item.degree}</h3>
                    <p className="text-cyan-400 text-sm mb-2">{item.period}</p>
                    <p className="font-medium mb-2">{item.institution}</p>
                    <p className="text-white/80 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Blog Content */}
          {activeSection === 6 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-green-500 to-emerald-500 text-transparent bg-clip-text">
                Cosmic Thoughts
              </h2>
              <p className="leading-relaxed mb-8">
                Insights, tutorials, and reflections from my journey through the digital universe:
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    title: "The Future of Interactive Web Experiences",
                    date: "April 15, 2025",
                    excerpt: "Exploring how WebGL, Three.js, and other technologies are revolutionizing the web.",
                    color: "bg-blue-800" 
                  },
                  {
                    title: "Optimizing Performance in React Applications",
                    date: "March 22, 2025",
                    excerpt: "Practical techniques to improve the speed and responsiveness of your React apps.",
                    color: "bg-cyan-500"
                  },
                  {
                    title: "Creating Immersive Scrolling Experiences",
                    date: "February 8, 2025",
                    excerpt: "A deep dive into techniques for crafting engaging scroll-based interactions.",
                    color: "bg-orange-500"
                  }
                ].map((post, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:bg-white/10 hover:shadow-lg flex"
                  >
                    <div className={`w-4 ${post.color}`}></div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="text-cyan-400 text-xs mb-2">{post.date}</div>
                      <h3 className="text-lg font-semibold text-emerald-400 mb-2">{post.title}</h3>
                      <p className="text-white/80 text-sm flex-1">{post.excerpt}</p>
                      <a href="#" className="text-yellow-400 text-sm self-end mt-4 hover:text-white transition-colors">Read More →</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Contact Content */}
          {activeSection === 7 && (
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-8 mx-4">
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
                Make Contact
              </h2>
              <p className="leading-relaxed mb-6">
                Ready to communicate across the cosmos? Reach out through any of these interstellar channels:
              </p>
              
              <form className="space-y-4 mb-8">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                />
                <input 
                  type="email" 
                  placeholder="Your Email" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                />
                <textarea 
                  rows={4} 
                  placeholder="Your Message" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                />
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-lg text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-1 transition-all overflow-hidden relative"
                >
                  <span className="relative z-10">Send Message</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </form>
              
              <div className="flex justify-center gap-5">
                <a href="#" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/15 hover:-translate-y-1 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="#" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/15 hover:-translate-y-1 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="#" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/15 hover:-translate-y-1 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.104 10-8.104v11.817h-20z"/>
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Minimap - only render when visible for performance */}
      {showMinimap && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-black/70 border border-white/20 rounded-lg p-4 w-64 h-64">
          <div className="relative w-full h-full">
            {/* Minimap planets */}
            {sections.map((section, index) => (
              <div
                key={index}
                className={`absolute rounded-full bg-gradient-to-br ${section.color} w-3 h-3 transform -translate-x-1/2 -translate-y-1/2 ${index === activeSection ? 'ring-2 ring-white' : ''}`}
                style={{
                  left: `${section.position.x / 100 * 100}%`,
                  top: `${section.position.y / 100 * 100}%`,
                }}
              />
            ))}
            
            {}
            <div
              className="absolute w-2 h-2 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${spaceshipPosition.x / 100 * 100}%`,
                top: `${spaceshipPosition.y / 100 * 100}%`,
                boxShadow: '0 0 5px rgba(34, 211, 238, 0.7)'
              }}
            />
          </div>
          <span className="absolute bottom-1 left-0 right-0 text-center text-xs text-white/50">SPACE to close</span>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="fixed right-8 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-40">
        {sections.map((section, index) => (
          <button
            key={index}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              activeSection === index 
                ? 'bg-white shadow-lg shadow-white/50 scale-125' 
                : 'bg-white/20 hover:bg-white/40'
            }`}
            onClick={() => navigateToPlanet(index)}
            title={section.name}
            disabled={isTransitioning}
          />
        ))}
      </nav>
      
      {/* Controls */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end z-40">
        {/* Sound control */}
        <button 
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:bg-white/20"
          onClick={toggleSound}
        >
          {sound ? <Volume2 className="text-white" size={16} /> : <VolumeX className="text-white" size={16} />}
        </button>
        
        {/* Help button */}
        <button 
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:bg-white/20"
          onClick={toggleControls}
        >
          <HelpCircle className="text-white" size={16} />
        </button>
      </div>
      
      {/* Controls modal */}
      {showControls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-black/90 backdrop-blur-md rounded-xl border border-white/10 p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-cyan-400">Spacecraft Controls</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-white/5 rounded-lg">
                <h4 className="text-yellow-400 mb-2 font-medium">Movement</h4>
                <ul className="text-sm space-y-1">
                  <li><span className="text-white/70">↑</span> - Forward thrusters</li>
                  <li><span className="text-white/70">↓</span> - Reverse thrusters</li>
                  <li><span className="text-white/70">←/→</span> - Rotate spacecraft</li>
                </ul>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <h4 className="text-yellow-400 mb-2 font-medium">Navigation</h4>
                <ul className="text-sm space-y-1">
                  <li><span className="text-white/70">Space</span> - Toggle minimap</li>
                  <li><span className="text-white/70">1-8</span> - Jump to planets</li>
                  <li><span className="text-white/70">Click</span> - Auto-navigate</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Approach a planet slowly to dock with it and reveal content. Press any arrow key to take manual control of your spacecraft.
            </p>
            <button 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-2 rounded-lg text-white text-sm font-medium hover:from-cyan-600 hover:to-blue-600 transition-all"
              onClick={toggleControls}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* Add animation keyframes for various effects */
const globalStyles = `
  :root {
    --color-cyan-400: rgb(34, 211, 238);
    --color-blue-800: rgb(30, 64, 175);
    --color-yellow-400: rgb(250, 204, 21);
    --color-orange-400: rgb(251, 146, 60);
    --color-purple-600: rgb(147, 51, 234);
    --color-red-600: rgb(220, 38, 38);
    --color-green-400: rgb(74, 222, 128);
    --color-lime-500: rgb(132, 204, 22);
    --color-pink-500: rgb(236, 72, 153);
    --color-rose-500: rgb(244, 63, 94);
    --color-emerald-500: rgb(16, 185, 129);
    --color-indigo-500: rgb(99, 102, 241);
    --color-purple-600: rgb(147, 51, 234);
  }

  @keyframes twinkle {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }
  
  @keyframes thruster {
    from { box-shadow: 0 0 8px #ef4444; height: 3px; }
    to { box-shadow: 0 0 12px #ef4444; height: 5px; }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px currentColor; }
    50% { box-shadow: 0 0 40px currentColor; }
  }
  
  @keyframes pulse-beam {
    0%, 100% { opacity: 0.5; height: 14px; }
    50% { opacity: 0.8; height: 20px; }
  }
  
  @keyframes orbit {
    0% { transform: rotate(0deg) translateX(25px) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(25px) rotate(-360deg); }
  }
  
  .animate-twinkle {
    animation: twinkle 4s infinite;
  }
  
  .animate-thruster {
    animation: thruster 0.5s infinite alternate;
  }
  
  .animate-pulse-beam {
    animation: pulse-beam 1.5s infinite;
  }
  
  .animation-delay-100 {
    animation-delay: 0.1s;
  }
`;

export default () => (
  <>
    <style>{globalStyles}</style>
    <SpacePortfolio />
  </>
);