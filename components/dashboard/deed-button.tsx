'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface DeedButtonProps {
  label: string;
  emoji: string;
  completed: boolean;
  onClick: () => void;
  category: 'prayer' | 'iman' | 'tummy' | 'social';
}

const categoryColors = {
  prayer: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900',
  iman: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900',
  tummy: 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900',
  social: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-900',
};

const categoryActiveColors = {
  prayer: 'bg-emerald-500 border-emerald-600 text-white',
  iman: 'bg-blue-500 border-blue-600 text-white',
  tummy: 'bg-amber-500 border-amber-600 text-white',
  social: 'bg-purple-500 border-purple-600 text-white',
};

export function DeedButton({ label, emoji, completed, onClick, category }: DeedButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md',
        completed ? categoryActiveColors[category] : categoryColors[category]
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="text-2xl">{emoji}</div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-xs">{label}</div>
        </div>
        {completed && (
          <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </button>
  );
}
