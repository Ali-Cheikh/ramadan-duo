'use client';

import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface ProgressRingProps {
  progress: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ progress, total, size = 200, strokeWidth = 16 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / total) * circumference;
  const percentage = Math.round((progress / total) * 100);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevProgress, setPrevProgress] = useState(progress);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Trigger confetti when reaching 8+ deeds
  useEffect(() => {
    if (progress >= 8 && progress > prevProgress) {
      setShowConfetti(true);
      
      // Stop confetti after 3 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 15000);
      
      return () => clearTimeout(timer);
    }
    setPrevProgress(progress);
  }, [progress, prevProgress]);

  return (
    <>
      {/* Confetti celebration when >= 8 deeds */}
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={progress === total ? 200 : 100}
          recycle={false}
          gravity={0.15}
          colors={['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c']}
        />
      )}
      <div className="relative inline-flex items-center justify-center">
      
      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <div className="text-4xl font-bold text-emerald-900">
          {progress}
          <span className="text-2xl text-gray-400">/{total}</span>
        </div>
        <div className="text-xs font-medium text-gray-500 mt-1">{percentage}% Complete</div>
      </div>
    </div>
    </>
  );
}
