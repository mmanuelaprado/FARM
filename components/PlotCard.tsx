
import React, { useState, useEffect } from 'react';
import { Plot, CropType, ToolType } from '../types';
import { CROPS } from '../constants';

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

  const getGrowthScale = () => {
    if (!plot.crop) return 'scale-0';
    if (isReady) return 'scale-125 sway';
    if (progress < 30) return 'scale-50 opacity-60';
    if (progress < 70) return 'scale-90 opacity-90';
    return 'scale-110 opacity-100';
  };

  return (
    <div 
      onClick={(e) => onAction(plot.id, e)}
      className={`relative w-full aspect-square rounded-[1.8rem] cursor-pointer transition-all duration-500 transform active:scale-90
        ${plot.watered 
          ? 'bg-[radial-gradient(circle_at_center,_#3e2723_0%,_#1b1210_100%)]' 
          : 'bg-[radial-gradient(circle_at_center,_#795548_0%,_#4e342e_100%)]'}
        border-4 border-[#064e3b]/30
        flex items-center justify-center overflow-hidden group 
        shadow-[0_8px_0_rgba(0,0,0,0.2),_inset_0_-4px_10px_rgba(0,0,0,0.6),_0_0_20px_rgba(0,0,0,0.1)]`}
    >
      {/* Detalhes de Textura de Terra */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-matter.png")' }} />
      
      {/* Brilho de Água */}
      <div className={`absolute inset-0 bg-blue-400/25 transition-opacity duration-1000 ${plot.watered ? 'opacity-100' : 'opacity-0'}`} />

      {!plot.crop ? (
        <div className="flex flex-col items-center opacity-0 group-hover:opacity-40 transition-opacity duration-300">
          <span className="text-xl filter brightness-0 invert">{selectedTool === ToolType.SEED ? '🌱' : '💧'}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center z-10 w-full h-full justify-center">
          <div className={`text-5xl transition-all duration-1000 ease-out drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)]
            ${isPlanting ? 'animate-[bounce_0.5s_ease-in-out] scale-150' : ''} 
            ${getGrowthScale()}
            ${isReady ? 'filter brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' : ''}`}
          >
            {isReady ? crop?.icon : (progress < 40 ? '🌱' : crop?.icon)}
          </div>
          
          {isPlanting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-900/40 animate-ping" />
            </div>
          )}
          
          {!isReady && (
            <div className="absolute bottom-3 left-3 right-3 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-linear ${plot.watered ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-green-400 to-green-600'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {isReady && (
            <div className="absolute top-2 right-2 bg-yellow-400 rounded-full w-7 h-7 flex items-center justify-center animate-bounce shadow-lg text-xs border-2 border-white z-20">
              ✨
            </div>
          )}

          {plot.watered && !isReady && (
            <div className="absolute top-2 left-2 text-sm animate-pulse drop-shadow-[0_1px_2px_black]">
              💧
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlotCard;
