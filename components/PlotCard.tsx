
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
  const crop = plot.crop ? CROPS[plot.crop] : null;

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

  return (
    <div 
      onClick={(e) => onAction(plot.id, e)}
      className={`relative w-full aspect-square rounded-xl cursor-pointer transition-all duration-200 transform active:scale-95
        ${plot.watered ? 'bg-amber-900/60 shadow-inner' : 'bg-amber-800/40'}
        border-2 ${plot.watered ? 'border-blue-400' : 'border-amber-950/20'} 
        flex items-center justify-center overflow-hidden`}
    >
      {!plot.crop ? (
        <div className="flex flex-col items-center opacity-30">
          <span className="text-xl">{selectedTool === ToolType.SEED ? '🌱' : '💧'}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center z-10 w-full h-full justify-center">
          <div className={`text-3xl transition-all duration-500 ${isReady ? 'sway scale-110' : 'scale-75 opacity-80'}`}>
            {crop?.icon}
          </div>
          
          {!isReady && (
            <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 bg-black/30 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${plot.watered ? 'bg-blue-400' : 'bg-green-400'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {isReady && (
            <div className="absolute top-1 right-1 bg-yellow-400 rounded-full w-4 h-4 flex items-center justify-center animate-bounce shadow-md text-[8px]">
              ✨
            </div>
          )}

          {plot.watered && !isReady && (
            <div className="absolute top-1 left-1 text-[10px] animate-pulse">
              💧
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlotCard;
