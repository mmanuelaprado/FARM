
import React, { useState, useEffect, useRef } from 'react';
import { CropType, GameState, Plot, ToolType, AnimalType, AnimalSlot } from './types';
import { CROPS, ANIMALS, INITIAL_COINS, INITIAL_PLOT_COUNT, XP_PER_LEVEL, PLOT_UNLOCK_COST, MAX_PLOT_COUNT } from './constants';
import PlotCard from './components/PlotCard';
import { getFarmAdvice } from './services/geminiService';
import { audioService } from './services/audioService';

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
  const adviceIntervalRef = useRef<any>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultSeeds = { 
      [CropType.WHEAT]: 5, [CropType.CORN]: 0, [CropType.CARROT]: 0, [CropType.TOMATO]: 0, [CropType.PUMPKIN]: 0, [CropType.DRAGON_FRUIT]: 0 
    };

    try {
      const saved = localStorage.getItem('gemini_harvest_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          coins: Number(parsed.coins) ?? INITIAL_COINS,
          xp: Number(parsed.xp) || 0,
          level: Number(parsed.level) || 1,
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
    return Array.from({ length: MAX_PLOT_COUNT }, (_, i) => ({
      id: i, 
      crop: null, 
      plantedAt: null, 
      watered: false,
      unlocked: i < INITIAL_PLOT_COUNT
    }));
  });

  const [selectedTool, setSelectedTool] = useState<ToolType>(ToolType.SEED);
  const [selectedSeed, setSelectedSeed] = useState<CropType>(CropType.WHEAT);
  const [advice, setAdvice] = useState<string>("Sua fazenda está incrível hoje!");
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'buy' | 'animals' | 'sell'>('buy');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    setIsLoaded(true);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('gemini_harvest_state', JSON.stringify(gameState));
      localStorage.setItem('gemini_harvest_plots', JSON.stringify(plots));
    }
  }, [gameState, plots, isLoaded]);

  useEffect(() => {
    const fetchAdvice = async () => {
      const text = await getFarmAdvice(gameState.coins, gameState.level, gameState.inventory);
      setAdvice(text);
    };

    if (isLoaded) {
      fetchAdvice();
      adviceIntervalRef.current = setInterval(fetchAdvice, 300000); // 5 min
    }
    return () => clearInterval(adviceIntervalRef.current);
  }, [gameState.level, isLoaded]);

  // Renderiza uma tela de loading caso não esteja pronto
  if (!isLoaded) return <div className="bg-sky-400 h-screen w-screen flex items-center justify-center font-game text-white">Carregando...</div>;

  const handleUnlockPlot = (id: number, e: React.MouseEvent) => {
    if (gameState.coins >= PLOT_UNLOCK_COST) {
      audioService.playCash();
      triggerCoinAnimation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addFloatingText(rect.left + rect.width / 2, rect.top, `-$${PLOT_UNLOCK_COST}`, "🏗️");
      
      setGameState(prev => ({ ...prev, coins: prev.coins - PLOT_UNLOCK_COST }));
      setPlots(prev => prev.map(p => p.id === id ? { ...p, unlocked: true } : p));
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addFloatingText(rect.left + rect.width / 2, rect.top, "Sem moedas!", "❌");
    }
  };

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

    if (!plot.unlocked) {
      handleUnlockPlot(id, e);
      return;
    }

    const cropData = plot.crop ? CROPS[plot.crop] : null;
    const now = Date.now();
    const effectiveGrowth = plot.watered ? (cropData?.growthTime || 0) / 2 : (cropData?.growthTime || 0);
    const isReady = plot.plantedAt && (now - plot.plantedAt) / 1000 >= effectiveGrowth;

    if (plot.crop && isReady) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      audioService.playHarvest();
      const xpGain = plot.crop === CropType.DRAGON_FRUIT ? 150 : 15;
      addFloatingText(rect.left + rect.width / 2, rect.top, `+${xpGain} XP`, cropData?.icon);
      
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
      const newAnimal: AnimalSlot = { id: Date.now(), type, lastProducedAt: Date.now() };
      setGameState(prev => ({ ...prev, coins: prev.coins - data.cost, animals: [...prev.animals, newAnimal] }));
      addFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+1 ${data.icon}`);
      setIsStoreOpen(false);
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
        level: Math.floor((prev.xp + 20) / XP_PER_LEVEL) + 1,
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
      inventory: { ...prev.inventory, [name]: (Number(prev.inventory[name])) - 1 }
    }));
    addFloatingText(window.innerWidth/2, 100, "+$" + value, "💰");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden text-slate-800 touch-none select-none h-[100dvh]">
      <div className="z-10 px-4 pt-6 flex justify-between items-center shrink-0">
        <div className="flex flex-col gap-1">
          <div className={`bg-white/90 backdrop-blur px-3 py-1 rounded-xl shadow-lg flex items-center gap-2 border-2 border-amber-500 transition-transform duration-300 ${coinAnimating ? 'scale-110' : ''}`}>
            <span className="text-xl">💰</span>
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

      <div className="z-10 flex-1 overflow-y-auto px-4 py-4 scrollbar-hide pb-48">
        <div className="max-w-md mx-auto">
          {activeTab === 'crops' ? (
            <div className="relative p-4 rounded-[3.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),_inset_0_4px_12px_rgba(255,255,255,0.4)] border-4 border-green-900/20 overflow-hidden bg-[#15803d]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_#4ade80_0%,_#166534_100%)] opacity-95" />
              <div className="grid grid-cols-3 gap-3 relative z-10">
                {plots.map(plot => (
                  <PlotCard 
                    key={plot.id} 
                    plot={plot} 
                    selectedTool={selectedTool} 
                    selectedSeed={selectedSeed} 
                    onAction={(id, e) => handlePlotAction(id, e)} 
                  />
                ))}
              </div>
            </div>
          ) : (
             <div className="grid grid-cols-2 gap-4">
               {gameState.animals.map(animal => {
                 const data = ANIMALS[animal.type];
                 const progress = Math.min(100, ((currentTime - animal.lastProducedAt) / 1000 / data.produceTime) * 100);
                 const isReady = progress >= 100;
                 return (
                   <div key={animal.id} onClick={(e) => collectAnimal(animal.id, e)} className="bg-white/90 p-5 rounded-[2.5rem] shadow-xl border-2 border-orange-200 flex flex-col items-center relative active:scale-95 transition-all">
                     <span className={`text-6xl mb-3 ${isReady ? 'animate-bounce drop-shadow-md' : 'grayscale-[0.4]'}`}>{data.icon}</span>
                     <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden border border-orange-200">
                        <div className="h-full bg-orange-500 transition-all duration-1000" style={{width: `${progress}%`}} />
                     </div>
                     {isReady && (
                       <div className="absolute -top-2 -right-2 bg-yellow-400 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center text-xl shadow-lg animate-pulse">
                         {data.produceIcon}
                       </div>
                     )}
                     <span className="text-[10px] font-game text-orange-800 mt-2 uppercase">{data.name}</span>
                   </div>
                 );
               })}
               <button onClick={() => { audioService.playPop(); setStoreTab('animals'); setIsStoreOpen(true); }} className="aspect-square bg-white/30 border-4 border-dashed border-white/60 rounded-[2.5rem] flex flex-col items-center justify-center active:scale-95 transition-all hover:bg-white/40 group">
                 <span className="text-4xl group-hover:scale-110 transition-transform">🐾</span>
                 <span className="font-game text-[10px] text-orange-900/60 mt-2 uppercase tracking-tighter">Novo Animal</span>
               </button>
             </div>
          )}
        </div>
      </div>

      {activeTab === 'crops' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-amber-50/95 backdrop-blur-lg p-4 pb-12 border-t-2 border-amber-200 rounded-t-[3rem] shadow-2xl">
          <div className="flex justify-center gap-8 mb-4">
            <button onClick={() => { audioService.playPop(); setSelectedTool(ToolType.SEED); }} className={`p-4 rounded-2xl transition-all ${selectedTool === ToolType.SEED ? 'bg-amber-400 scale-110 shadow-lg' : 'bg-amber-100/50'}`}>🌱</button>
            <button onClick={() => { audioService.playPop(); setSelectedTool(ToolType.WATER); }} className={`p-4 rounded-2xl transition-all ${selectedTool === ToolType.WATER ? 'bg-blue-400 scale-110 shadow-lg' : 'bg-blue-100/50'}`}>💧</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-2">
            {(Object.keys(CROPS) as CropType[]).map(type => {
              const isLocked = CROPS[type].minLevel && gameState.level < CROPS[type].minLevel;
              return (
                <button 
                  key={type} 
                  disabled={isLocked}
                  onClick={() => { audioService.playPop(); setSelectedSeed(type); setSelectedTool(ToolType.SEED); }} 
                  className={`min-w-[85px] p-3 rounded-2xl border-2 transition-all relative shrink-0 ${selectedSeed === type ? 'bg-white border-amber-500 shadow-md translate-y-[-4px]' : 'bg-white/40 border-transparent'} ${isLocked ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute -top-2 -left-1 bg-amber-600 text-white text-[9px] px-2 py-0.5 rounded-full font-game shadow-sm z-10">x{gameState.seedInventory[type] || 0}</div>
                  <span className="text-2xl block mb-1">{isLocked ? '🔒' : CROPS[type].icon}</span>
                  <span className="text-[10px] font-bold uppercase truncate block text-amber-900">{isLocked ? 'Nível ' + CROPS[type].minLevel : CROPS[type].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-amber-50 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-500">
            <div className="bg-amber-500 p-6 flex justify-between items-center text-white">
              <h2 className="font-game text-xl uppercase tracking-wider">Mercado Central</h2>
              <button onClick={() => setIsStoreOpen(false)} className="text-2xl">✕</button>
            </div>
            
            <div className="flex gap-2 px-4 mt-4">
              <button onClick={() => setStoreTab('buy')} className={`flex-1 py-2 rounded-xl font-game text-[10px] ${storeTab === 'buy' ? 'bg-green-500 text-white' : 'bg-white text-green-700'}`}>SEMENTES</button>
              <button onClick={() => setStoreTab('animals')} className={`flex-1 py-2 rounded-xl font-game text-[10px] ${storeTab === 'animals' ? 'bg-orange-500 text-white' : 'bg-white text-orange-700'}`}>ANIMAIS</button>
              <button onClick={() => setStoreTab('sell')} className={`flex-1 py-2 rounded-xl font-game text-[10px] ${storeTab === 'sell' ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-700'}`}>VENDER</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/20">
              {storeTab === 'buy' && (Object.keys(CROPS) as CropType[]).map(type => {
                const isLocked = CROPS[type].minLevel && gameState.level < CROPS[type].minLevel;
                return (
                  <div key={type} className={`flex items-center justify-between p-4 bg-white rounded-3xl border-2 shadow-sm transition-all ${isLocked ? 'opacity-50' : 'border-green-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">{isLocked ? '🔒' : CROPS[type].icon}</div>
                      <div>
                        <span className="font-game text-xs text-green-900 block uppercase">{isLocked ? 'Lendário' : CROPS[type].name}</span>
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
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-game transition-all ${gameState.coins >= CROPS[type].cost ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}
                      >COMPRAR</button>
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
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-game transition-all ${gameState.coins >= ANIMALS[type].cost ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}
                  >CONTRATAR</button>
                </div>
              ))}

              {storeTab === 'sell' && (
                <div className="pt-2">
                  {Object.entries(gameState.inventory).map(([name, qty]) => {
                    if ((Number(qty) || 0) <= 0) return null;
                    const crop = Object.values(CROPS).find(c => c.name === name);
                    const animal = Object.values(ANIMALS).find(a => a.produceName === name);
                    const val = crop ? crop.value : (animal ? animal.produceValue : 1);
                    const icon = crop ? crop.icon : (animal ? animal.produceIcon : '📦');
                    return (
                      <div key={name} className="flex items-center justify-between p-4 bg-white rounded-3xl border-2 border-emerald-100 shadow-sm mb-2">
                         <span className="font-game text-xs">{icon} {name} (x{qty})</span>
                         <button onClick={() => sellItem(name, val)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-game shadow-md">VENDER ${val}</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-white border-t border-amber-100 flex justify-between items-center shrink-0">
              <div className="font-game text-2xl text-amber-600">💰 ${gameState.coins}</div>
              <button onClick={() => setIsStoreOpen(false)} className="bg-amber-500 text-white font-game px-8 py-4 rounded-2xl text-xs uppercase shadow-xl">Fechar</button>
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
