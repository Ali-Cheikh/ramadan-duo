'use client';

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

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-emerald-900">
          {progress}
          <span className="text-3xl text-gray-400">/{total}</span>
        </div>
        <div className="text-sm font-medium text-gray-500 mt-1">{percentage}% Complete</div>
      </div>
    </div>
  );
}
