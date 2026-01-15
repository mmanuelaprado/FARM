
import React, { useState, useEffect } from 'react';
import { Plot, CropType, ToolType } from '../types';
import { CROPS, PLOT_UNLOCK_COST } from '../constants';

interface PlotCardProps {
  plot: Plot;
  selectedTool: ToolType;
  selectedSeed: CropType;
  onAction: (id: number, e: React.MouseEvent) => void;
}

const PlotCard: React.FC<PlotCardProps> = ({ plot, selectedTool, selectedSeed, onAction }) => {
  const [progress, setProgress] = useState(0);
  const [isPlanting, setIsPlanting] = useState(false);
  const crop = plot.crop ? CROPS[plot.crop] : null;

  useEffect(() => {
    if (plot.crop && !isPlanting && progress === 0) {
      setIsPlanting(true);
      const timer = setTimeout(() => setIsPlanting(false), 600);
      return () => clearTimeout(timer);
    }
  }, [plot.crop]);

  useEffect(() => {
    let interval: any;
    if (plot.plantedAt && crop) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - plot.plantedAt!;
        const effectiveGrowthTime = plot.watered ? crop.growthTime / 2 : crop.growthTime;
        const p = Math.min(100, (elapsedMs / (effectiveGrowthTime * 1000)) * 100);
        
        setProgress(p);
        if (p >= 100) clearInterval(interval);
      }, 300);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [plot.plantedAt, plot.watered, crop]);

  const isReady = progress >= 100;

  if (!plot.unlocked) {
    return (
      <div 
        onClick={(e) => onAction(plot.id, e)}
        className="relative w-full aspect-square rounded-2xl md:rounded-[1.5rem] cursor-pointer transition-all duration-300 transform active:scale-95
          bg-[#3d2b1f] border-2 border-dashed border-white/20
          flex flex-col items-center justify-center overflow-hidden group shadow-md"
      >
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20" />
        <span className="text-xl md:text-2xl mb-1 grayscale z-10 opacity-60">🔒</span>
        <span className="font-game text-[9px] md:text-xs text-white z-10 tracking-widest bg-black/20 px-2 py-0.5 rounded-full">${PLOT_UNLOCK_COST}</span>
      </div>
    );
  }

  const getGrowthScale = () => {
    if (!plot.crop) return 'scale-0';
    if (isReady) return 'scale-110';
    if (progress < 30) return 'scale-50 opacity-60';
    if (progress < 70) return 'scale-80 opacity-90';
    return 'scale-95 opacity-100';
  };

  return (
    <div 
      onClick={(e) => onAction(plot.id, e)}
      className={`relative w-full aspect-square rounded-2xl md:rounded-[1.5rem] cursor-pointer transition-all duration-300 transform active:scale-90
        ${plot.watered 
          ? 'bg-[radial-gradient(circle_at_center,_#3e2723_0%,_#1b1210_100%)]' 
          : 'bg-[radial-gradient(circle_at_center,_#795548_0%,_#4e342e_100%)]'}
        border-b-4 border-[#064e3b]/40
        flex items-center justify-center overflow-hidden group 
        shadow-[0_4px_10px_rgba(0,0,0,0.3),_inset_0_-4px_8px_rgba(0,0,0,0.4)]`}
    >
      <div className={`absolute inset-0 bg-blue-400/30 transition-opacity duration-1000 ${plot.watered ? 'opacity-100' : 'opacity-0'}`} />

      {!plot.crop ? (
        <div className="opacity-0 group-hover:opacity-40 transition-opacity flex items-center justify-center">
          <span className="text-2xl filter brightness-0 invert">{selectedTool === ToolType.SEED ? '🌱' : '💧'}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center z-10 w-full h-full justify-center p-2">
          <div className={`text-4xl md:text-5xl transition-all duration-700 ease-out drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]
            ${isPlanting ? 'animate-bounce' : ''} 
            ${getGrowthScale()}
            ${isReady ? 'animate-pulse' : ''}`}
          >
            {isReady ? crop?.icon : (progress < 40 ? '🌱' : (progress < 80 ? '🌿' : crop?.icon))}
          </div>
          
          {!isReady && (
            <div className="absolute bottom-2 left-2 right-2 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-linear ${plot.watered ? 'bg-blue-400' : 'bg-green-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {isReady && (
            <div className="absolute top-1.5 right-1.5 bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center animate-bounce shadow-lg text-[10px] border-2 border-white z-20">
              ✨
            </div>
          )}

          {plot.watered && !isReady && (
            <div className="absolute top-1.5 left-1.5 text-xs animate-pulse drop-shadow-md">
              💧
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlotCard;
