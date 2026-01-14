
import React, { useState, useEffect, useRef } from 'react';
import { CropType, GameState, Plot, ToolType, AnimalType, AnimalSlot } from './types';
import { CROPS, ANIMALS, INITIAL_COINS, INITIAL_PLOT_COUNT, XP_PER_LEVEL, PLOT_UNLOCK_COST, MAX_PLOT_COUNT } from './constants';
import PlotCard from './components/PlotCard';
import { getFarmAdvice } from './services/geminiService';
import { audioService } from './services/audioService';
import { notificationService } from './services/notificationService';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  icon?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'crops' | 'ranch'>('crops');
  const [isLoaded, setIsLoaded] = useState(false);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const notifiedPlots = useRef<Set<number>>(new Set());

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultSeeds = { 
      [CropType.WHEAT]: 5, [CropType.CORN]: 0, [CropType.CARROT]: 0, [CropType.TOMATO]: 0, [CropType.PUMPKIN]: 0, [CropType.DRAGON_FRUIT]: 0 
    };

    try {
      const saved = localStorage.getItem('gemini_harvest_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          coins: isNaN(Number(parsed.coins)) ? INITIAL_COINS : Number(parsed.coins),
          xp: isNaN(Number(parsed.xp)) ? 0 : Number(parsed.xp),
          level: isNaN(Number(parsed.level)) ? 1 : Number(parsed.level),
          inventory: parsed.inventory || {},
          seedInventory: { ...defaultSeeds, ...parsed.seedInventory },
          animals: Array.isArray(parsed.animals) ? parsed.animals : []
        };
      }
    } catch (e) {}
    return { coins: INITIAL_COINS, xp: 0, level: 1, inventory: {}, seedInventory: defaultSeeds, animals: [] };
  });

  const [plots, setPlots] = useState<Plot[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_harvest_plots');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return Array.from({ length: INITIAL_PLOT_COUNT }, (_, i) => ({
      id: i, crop: null, plantedAt: null, watered: false,
    }));
  });

  const [selectedTool, setSelectedTool] = useState<ToolType>(ToolType.SEED);
  const [selectedSeed, setSelectedSeed] = useState<CropType>(CropType.WHEAT);
  const [advice, setAdvice] = useState<string>("Sua fazenda está carregando...");
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'buy' | 'animals' | 'sell'>('buy');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    plots.forEach(plot => {
      if (plot.crop && plot.plantedAt) {
        const cropData = CROPS[plot.crop];
        const effectiveGrowth = plot.watered ? cropData.growthTime / 2 : cropData.growthTime;
        const isReady = (currentTime - plot.plantedAt) / 1000 >= effectiveGrowth;

        if (isReady && !notifiedPlots.current.has(plot.id)) {
          notifiedPlots.current.add(plot.id);
          notificationService.sendHarvestReady(cropData.name, cropData.icon);
        }
      } else if (!plot.crop) {
        notifiedPlots.current.delete(plot.id);
      }
    });
  }, [currentTime, plots, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('gemini_harvest_state', JSON.stringify(gameState));
      localStorage.setItem('gemini_harvest_plots', JSON.stringify(plots));
    }
  }, [gameState, plots, isLoaded]);

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        const text = await getFarmAdvice(gameState.coins, gameState.level, gameState.inventory);
        setAdvice(text);
      } catch (err) {
        setAdvice("O tempo está ótimo para colher!");
      }
    };
    if (isLoaded) fetchAdvice();
  }, [gameState.level, isLoaded]);

  const toggleNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setNotificationsEnabled(granted);
    if (granted) audioService.playPop();
  };

  if (!isLoaded) return null;

  const triggerCoinAnimation = () => {
    setCoinAnimating(true);
    setTimeout(() => setCoinAnimating(false), 300);
  };

  const addFloatingText = (x: number, y: number, text: string, icon?: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text, icon }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1200);
  };

  const handlePlotAction = (id: number, e: React.MouseEvent) => {
    const plot = plots.find(p => p.id === id);
    if (!plot) return;
    const cropData = plot.crop ? CROPS[plot.crop] : null;
    const now = Date.now();
    const effectiveGrowth = plot.watered ? (cropData?.growthTime || 0) / 2 : (cropData?.growthTime || 0);
    const isReady = plot.plantedAt && (now - plot.plantedAt) / 1000 >= effectiveGrowth;

    if (plot.crop && isReady) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const fruitIcon = cropData?.icon || '✨';
      
      audioService.playHarvest();
      const xpGain = plot.crop === CropType.DRAGON_FRUIT ? 100 : 15;
      addFloatingText(rect.left + rect.width / 2, rect.top, `+${xpGain} XP`, fruitIcon);
      
      setGameState(prev => {
        const newXp = prev.xp + xpGain;
        const cropName = cropData?.name || plot.crop!;
        return {
          ...prev,
          xp: newXp,
          level: Math.floor(newXp / XP_PER_LEVEL) + 1,
          inventory: { ...prev.inventory, [cropName]: (Number(prev.inventory[cropName]) || 0) + 1 }
        };
      });
      setPlots(prev => prev.map(p => p.id === id ? { ...p, crop: null, plantedAt: null, watered: false } : p));
      return;
    }
    
    if (selectedTool === ToolType.SEED && !plot.crop) {
      if ((gameState.seedInventory[selectedSeed] || 0) > 0) {
        audioService.playPop();
        setGameState(prev => ({ 
          ...prev, 
          seedInventory: { ...prev.seedInventory, [selectedSeed]: (prev.seedInventory[selectedSeed] || 0) - 1 } 
        }));
        setPlots(prev => prev.map(p => p.id === id ? { ...p, crop: selectedSeed, plantedAt: Date.now(), watered: false } : p));
      }
    } else if (selectedTool === ToolType.WATER && plot.crop && !plot.watered) {
      audioService.playPop();
      setPlots(prev => prev.map(p => p.id === id ? { ...p, watered: true } : p));
    }
  };

  const buyAnimal = (type: AnimalType) => {
    const data = ANIMALS[type];
    if (gameState.coins >= data.cost) {
      audioService.playPop();
      const newAnimal: AnimalSlot = {
        id: Date.now(),
        type: type,
        lastProducedAt: Date.now()
      };
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - data.cost,
        animals: [...prev.animals, newAnimal]
      }));
      addFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+1 ${data.icon}`);
    }
  };

  const collectAnimal = (animalId: number, e: React.MouseEvent) => {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal) return;
    const data = ANIMALS[animal.type];
    const isReady = (currentTime - animal.lastProducedAt) / 1000 >= data.produceTime;

    if (isReady) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      audioService.playHarvest();
      addFloatingText(rect.left + rect.width / 2, rect.top, `+1 ${data.produceIcon}`, data.produceIcon);
      setGameState(prev => ({
        ...prev,
        xp: prev.xp + 20,
        inventory: { ...prev.inventory, [data.produceName]: (Number(prev.inventory[data.produceName]) || 0) + 1 },
        animals: prev.animals.map(a => a.id === animalId ? { ...a, lastProducedAt: Date.now() } : a)
      }));
    }
  };

  const sellItem = (name: string, value: number) => {
    if ((Number(gameState.inventory[name]) || 0) <= 0) return;
    
    audioService.playCash(); 
    triggerCoinAnimation(); 
    setGameState(prev => ({
      ...prev, 
      coins: prev.coins + value, 
      inventory: {
        ...prev.inventory, 
        [name]: (Number(prev.inventory[name])) - 1
      }
    }));
    addFloatingText(window.innerWidth/2, 100, "+$" + value, "💰");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden text-slate-800 touch-none select-none h-[100dvh]">
      {/* HUD Superior */}
      <div className="z-10 px-4 pt-6 flex justify-between items-center shrink-0">
        <div className="flex flex-col gap-1">
          <div className={`bg-white/90 backdrop-blur px-3 py-1 rounded-xl shadow-lg flex items-center gap-2 border-2 border-amber-500 transition-transform duration-300 ${coinAnimating ? 'scale-110 shadow-amber-200 shadow-2xl' : ''}`}>
            <span className={`text-xl ${coinAnimating ? 'animate-bounce' : ''}`}>💰</span>
            <span className="font-game text-base text-amber-700">{gameState.coins}</span>
          </div>
          <div className="bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg border border-blue-400 w-24">
            <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(gameState.xp % XP_PER_LEVEL)}%` }} />
            </div>
            <span className="text-[9px] font-bold text-blue-600 block text-center uppercase mt-0.5">Nível {gameState.level}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleNotifications}
            className={`p-2.5 rounded-xl shadow-lg active:scale-95 transition-all text-xl ${notificationsEnabled ? 'bg-blue-500' : 'bg-gray-400 grayscale'}`}
          >
            {notificationsEnabled ? '🔔' : '🔕'}
          </button>

          <div className="flex bg-white/40 backdrop-blur p-0.5 rounded-xl border border-white/50">
             <button onClick={() => setActiveTab('crops')} className={`px-3 py-1.5 rounded-lg text-[9px] font-game ${activeTab === 'crops' ? 'bg-green-500 text-white shadow' : 'text-green-900'}`}>HORTA</button>
             <button onClick={() => setActiveTab('ranch')} className={`px-3 py-1.5 rounded-lg text-[9px] font-game ${activeTab === 'ranch' ? 'bg-orange-500 text-white shadow' : 'text-orange-900'}`}>RANCHO</button>
          </div>
          <button onClick={() => { audioService.playPop(); setIsStoreOpen(true); }} className="bg-amber-500 p-2.5 rounded-xl shadow-lg active:scale-95 transition-all text-2xl">🏪</button>
        </div>
      </div>

      <div className="z-10 px-4 mt-4 shrink-0">
        <div className="bg-white/95 rounded-2xl p-2.5 shadow-md border-b-2 border-green-500 flex items-center gap-3">
          <span className="text-2xl shrink-0">👴</span>
          <p className="text-[10px] font-medium text-slate-700 italic leading-tight">"{advice}"</p>
        </div>
      </div>

      {/* Grid Central com Gramado Realista */}
      <div className="z-10 flex-1 overflow-y-auto px-4 py-4 scrollbar-hide pb-48">
        <div className="max-w-md mx-auto">
          {activeTab === 'crops' ? (
            <div className="relative p-6 rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),_inset_0_4px_10px_rgba(255,255,255,0.4)] border-4 border-green-800/20 overflow-hidden bg-[#22c55e]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_#4ade80_0%,_#166534_100%)] opacity-90" />
              <div className="absolute inset-0 opacity-40 mix-blend-soft-light pointer-events-none" 
                   style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }} />
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                   style={{ 
                     boxShadow: 'inset 0 0 100px rgba(0,0,0,0.2)',
                     background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(21,71,36,0.5) 100%)'
                   }} />

              <div className="grid grid-cols-3 gap-4 relative z-10">
                {plots.map(plot => (
                  <PlotCard key={plot.id} plot={plot} selectedTool={selectedTool} selectedSeed={selectedSeed} onAction={(id, e) => handlePlotAction(id, e)} />
                ))}
                {plots.length < MAX_PLOT_COUNT && (
                  <button 
                    onClick={() => { if(gameState.coins >= PLOT_UNLOCK_COST) { audioService.playPop(); setGameState(prev=>({...prev, coins: prev.coins-PLOT_UNLOCK_COST})); setPlots(prev=>[...prev, {id: prev.length, crop:null, plantedAt:null, watered:false}]); } }} 
                    className="aspect-square rounded-[2rem] border-4 border-dashed border-white/30 bg-black/10 flex flex-col items-center justify-center active:scale-95 transition-all hover:bg-black/20"
                  >
                    <span className="text-xl text-white/50">➕</span>
                    <span className="text-[9px] font-game text-white/50">${PLOT_UNLOCK_COST}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {gameState.animals.map(animal => {
                const data = ANIMALS[animal.type];
                const progress = Math.min(100, ((currentTime - animal.lastProducedAt) / 1000 / data.produceTime) * 100);
                return (
                  <div key={animal.id} onClick={(e) => collectAnimal(animal.id, e)} className="bg-white/90 p-4 rounded-3xl shadow-lg border-2 border-orange-200 flex flex-col items-center relative active:scale-95 transition-all">
                    <span className={`text-5xl mb-2 ${progress >= 100 ? 'animate-bounce' : ''}`}>{data.icon}</span>
                    <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden border border-orange-200">
                       <div className="h-full bg-orange-500" style={{width: `${progress}%`}} />
                    </div>
                    {progress >= 100 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-lg animate-pulse shadow-md">
                        {data.produceIcon}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => { audioService.playPop(); setStoreTab('animals'); setIsStoreOpen(true); }} className="aspect-square bg-white/20 border-4 border-dashed border-white/40 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all group">
                <span className="text-4xl">🐾</span>
                <span className="font-game text-[10px] text-white/60 mt-2 uppercase">Comprar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'crops' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-amber-50/95 backdrop-blur-lg p-4 pb-8 border-t-2 border-amber-200 rounded-t-[2.5rem] shadow-2xl">
          <div className="flex justify-center gap-10 mb-4">
            <button onClick={() => { audioService.playPop(); setSelectedTool(ToolType.SEED); }} className={`p-3.5 rounded-2xl transition-all ${selectedTool === ToolType.SEED ? 'bg-amber-400 scale-110 shadow-lg' : 'bg-amber-100 opacity-60'}`}>🌱</button>
            <button onClick={() => { audioService.playPop(); setSelectedTool(ToolType.WATER); }} className={`p-3.5 rounded-2xl transition-all ${selectedTool === ToolType.WATER ? 'bg-blue-400 scale-110 shadow-lg' : 'bg-blue-100 opacity-60'}`}>💧</button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {(Object.keys(CROPS) as CropType[]).map(type => {
              const isLocked = CROPS[type].minLevel && gameState.level < CROPS[type].minLevel;
              return (
                <button 
                  key={type} 
                  disabled={isLocked}
                  onClick={() => { audioService.playPop(); setSelectedSeed(type); setSelectedTool(ToolType.SEED); }} 
                  className={`min-w-[75px] p-2 rounded-2xl border-2 transition-all relative shrink-0 ${selectedSeed === type ? 'bg-white border-amber-500 shadow-md translate-y-[-4px]' : 'bg-transparent border-transparent opacity-80'} ${isLocked ? 'grayscale opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute -top-1.5 -left-1 bg-amber-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-game shadow-sm">x{gameState.seedInventory[type] || 0}</div>
                  <span className="text-2xl block mb-1">{isLocked ? '🔒' : CROPS[type].icon}</span>
                  <span className="text-[9px] font-bold uppercase truncate block text-amber-900">{isLocked ? 'Nível ' + CROPS[type].minLevel : CROPS[type].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md transition-all duration-300">
          <div className="bg-amber-50 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-500">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 shrink-0 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <span className="text-3xl drop-shadow-md">🏪</span>
                <h2 className="font-game text-2xl tracking-wide uppercase drop-shadow-sm">Mercado Central</h2>
              </div>
              <button 
                onClick={() => { audioService.playPop(); setIsStoreOpen(false); }} 
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 px-4 mt-6 shrink-0">
              <button onClick={() => { audioService.playPop(); setStoreTab('buy'); }} className={`flex flex-col items-center gap-1.5 py-4 rounded-[2rem] transition-all duration-300 border-b-4 ${storeTab === 'buy' ? 'bg-green-500 border-green-700 text-white shadow-lg scale-105' : 'bg-white border-gray-100 text-green-800 opacity-70'}`}>
                <span className="text-2xl">🌱</span>
                <span className="text-[10px] font-game uppercase">Sementes</span>
              </button>
              <button onClick={() => { audioService.playPop(); setStoreTab('animals'); }} className={`flex flex-col items-center gap-1.5 py-4 rounded-[2rem] transition-all duration-300 border-b-4 ${storeTab === 'animals' ? 'bg-orange-500 border-orange-700 text-white shadow-lg scale-105' : 'bg-white border-gray-100 text-orange-800 opacity-70'}`}>
                <span className="text-2xl">🐾</span>
                <span className="text-[10px] font-game uppercase">Animais</span>
              </button>
              <button onClick={() => { audioService.playPop(); setStoreTab('sell'); }} className={`flex flex-col items-center gap-1.5 py-4 rounded-[2rem] transition-all duration-300 border-b-4 ${storeTab === 'sell' ? 'bg-emerald-500 border-emerald-700 text-white shadow-lg scale-105' : 'bg-white border-gray-100 text-emerald-800 opacity-70'}`}>
                <span className="text-2xl">💰</span>
                <span className="text-[10px] font-game uppercase">Vender</span>
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 space-y-3 mt-4 mb-2 transition-colors duration-500 ${storeTab === 'buy' ? 'bg-green-50/50' : storeTab === 'animals' ? 'bg-orange-50/50' : 'bg-emerald-50/50'}`}>
              {storeTab === 'buy' && (Object.keys(CROPS) as CropType[]).map(type => {
                const isLocked = CROPS[type].minLevel && gameState.level < CROPS[type].minLevel;
                return (
                  <div key={type} className={`flex items-center justify-between p-4 bg-white rounded-3xl border-2 shadow-sm transition-all ${isLocked ? 'opacity-60 grayscale border-gray-200' : 'border-green-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                        {isLocked ? '🔒' : CROPS[type].icon}
                      </div>
                      <div>
                        <span className="font-game text-xs text-green-900 block uppercase">{isLocked ? 'Bloqueado' : CROPS[type].name}</span>
                        <span className="text-green-600 font-bold text-lg leading-none">{isLocked ? 'Nível ' + CROPS[type].minLevel : '$' + CROPS[type].cost}</span>
                      </div>
                    </div>
                    {!isLocked && (
                      <button 
                        onClick={() => { 
                          if(gameState.coins >= CROPS[type].cost) { 
                            audioService.playPop(); 
                            setGameState(prev => ({...prev, coins: prev.coins - CROPS[type].cost, seedInventory: {...prev.seedInventory, [type]: (prev.seedInventory[type] || 0) + 1}}));
                            addFloatingText(window.innerWidth/2, 100, "-$" + CROPS[type].cost);
                          } 
                        }} 
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-game transition-all ${gameState.coins >= CROPS[type].cost ? 'bg-green-500 text-white shadow-md active:scale-95' : 'bg-gray-200 text-gray-400'}`}
                      >
                        COMPRAR
                      </button>
                    )}
                  </div>
                );
              })}

              {storeTab === 'animals' && (Object.keys(ANIMALS) as AnimalType[]).map(type => (
                <div key={type} className="flex items-center justify-between p-4 bg-white rounded-3xl border-2 border-orange-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">{ANIMALS[type].icon}</div>
                    <div>
                      <span className="font-game text-xs text-orange-900 block uppercase">{ANIMALS[type].name}</span>
                      <span className="text-orange-600 font-bold text-lg leading-none">${ANIMALS[type].cost}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => buyAnimal(type)} 
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-game transition-all ${gameState.coins >= ANIMALS[type].cost ? 'bg-orange-500 text-white shadow-md active:scale-95' : 'bg-gray-200 text-gray-400'}`}
                    disabled={gameState.coins < ANIMALS[type].cost}
                  >
                    CONTRATAR
                  </button>
                </div>
              ))}
              
              {storeTab === 'sell' && (
                <div className="space-y-3">
                  {Object.entries(gameState.inventory).filter(([_, qty]) => Number(qty) > 0).length === 0 ? (
                    <div className="text-center py-12 opacity-30 flex flex-col items-center">
                      <span className="text-7xl mb-4">📭</span>
                      <p className="font-game text-xs text-emerald-900 uppercase">Estoque Vazio!</p>
                    </div>
                  ) : (
                    Object.entries(gameState.inventory).map(([name, qty]) => {
                      if (Number(qty) <= 0) return null;
                      const cropMatch = Object.values(CROPS).find(c => c.name === name);
                      const animalMatch = Object.values(ANIMALS).find(a => a.produceName === name);
                      const val = cropMatch ? cropMatch.value : (animalMatch ? animalMatch.produceValue : 1);
                      const icon = cropMatch ? cropMatch.icon : (animalMatch ? animalMatch.produceIcon : '📦');
                      return (
                        <div key={name} className="flex items-center justify-between p-4 bg-white rounded-3xl border-2 border-emerald-100 shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner relative">
                              {icon}
                              <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-game w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">x{qty}</span>
                            </div>
                            <div>
                              <span className="font-game text-xs text-emerald-900 block uppercase">{name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-600 font-bold text-lg leading-none">${val}</span>
                                <span className="text-emerald-400 text-[10px] animate-pulse">📈 LUCRO</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => sellItem(name, val)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-game shadow-md active:scale-95 transition-all">VENDER 1</button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            
            <div className="p-8 bg-white border-t-2 border-amber-100 shrink-0 flex justify-between items-center shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] font-game text-gray-400 uppercase tracking-widest mb-1">Tesouro</span>
                <div className={`font-game text-3xl text-amber-600 flex items-center gap-2 transition-transform duration-300 ${coinAnimating ? 'scale-125' : ''}`}>💰 ${gameState.coins}</div>
              </div>
              <button onClick={() => { audioService.playPop(); setIsStoreOpen(false); }} className="bg-amber-500 text-white font-game px-12 py-5 rounded-[2rem] text-sm uppercase shadow-xl active:scale-95 transition-all border-b-4 border-amber-700">Sair</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {floatingTexts.map(t => (
          <div key={t.id} className="absolute flex flex-col items-center animate-[float_1.2s_ease-out_forwards]" style={{ left: t.x, top: t.y }}>
            {t.icon && <span className="text-2xl mb-1">{t.icon}</span>}
            <span className="font-game text-sm text-orange-600 drop-shadow-sm whitespace-nowrap">{t.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translate(-50%, 0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(-50%, -100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
