
import React, { useState, useEffect } from 'react';
import { CropType, GameState, Plot, ToolType, AnimalType, AnimalSlot } from './types';
import { CROPS, ANIMALS, INITIAL_COINS, INITIAL_PLOT_COUNT, XP_PER_LEVEL, PLOT_UNLOCK_COST, MAX_PLOT_COUNT } from './constants';
import PlotCard from './components/PlotCard';
import { getFarmAdvice } from './services/geminiService';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'crops' | 'ranch'>('crops');
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem('gemini_harvest_state');
      const defaultSeeds = { [CropType.WHEAT]: 5, [CropType.CORN]: 0, [CropType.CARROT]: 0, [CropType.TOMATO]: 0, [CropType.PUMPKIN]: 0 };
      
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          coins: Number(parsed.coins) || INITIAL_COINS,
          xp: Number(parsed.xp) || 0,
          level: Number(parsed.level) || 1,
          inventory: parsed.inventory || {},
          seedInventory: parsed.seedInventory || defaultSeeds,
          animals: parsed.animals || []
        };
      }
    } catch (e) {
      console.error("Error loading state", e);
    }

    return {
      coins: INITIAL_COINS,
      xp: 0,
      level: 1,
      inventory: {},
      seedInventory: { [CropType.WHEAT]: 5, [CropType.CORN]: 0, [CropType.CARROT]: 0, [CropType.TOMATO]: 0, [CropType.PUMPKIN]: 0 },
      animals: []
    };
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
  const [advice, setAdvice] = useState<string>("Carregando sua fazenda...");
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'buy' | 'sell' | 'animals'>('buy');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_harvest_state', JSON.stringify(gameState));
    localStorage.setItem('gemini_harvest_plots', JSON.stringify(plots));
  }, [gameState, plots]);

  useEffect(() => {
    const fetchAdvice = async () => {
      const text = await getFarmAdvice(gameState.coins, gameState.level, gameState.inventory);
      setAdvice(text);
    };
    fetchAdvice();
  }, [gameState.level, isStoreOpen]);

  const addFloatingText = (x: number, y: number, text: string, color: string = "text-yellow-500") => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  const handlePlotAction = (id: number, e: React.MouseEvent) => {
    const plot = plots.find(p => p.id === id);
    if (!plot) return;
    const cropData = plot.crop ? CROPS[plot.crop] : null;
    if (!cropData && selectedTool === ToolType.WATER) return;

    const now = Date.now();
    const effectiveGrowth = plot.watered ? (cropData?.growthTime || 0) / 2 : (cropData?.growthTime || 0);
    const isReady = plot.plantedAt && (now - plot.plantedAt) / 1000 >= effectiveGrowth;

    if (plot.crop && isReady) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addFloatingText(rect.left + rect.width / 2, rect.top, "+15 XP", "text-blue-500");
      harvest(id, plot.crop);
      return;
    }
    if (selectedTool === ToolType.SEED && !plot.crop) plant(id);
    else if (selectedTool === ToolType.WATER && plot.crop && !plot.watered) water(id);
  };

  const plant = (id: number) => {
    if (gameState.seedInventory[selectedSeed] > 0) {
      setGameState(prev => ({ 
        ...prev, 
        seedInventory: { ...prev.seedInventory, [selectedSeed]: prev.seedInventory[selectedSeed] - 1 } 
      }));
      setPlots(prev => prev.map(p => p.id === id ? { ...p, crop: selectedSeed, plantedAt: Date.now(), watered: false } : p));
    } else {
      setAdvice(`Sem sementes de ${CROPS[selectedSeed].name}!`);
    }
  };

  const water = (id: number) => setPlots(prev => prev.map(p => p.id === id ? { ...p, watered: true } : p));

  const harvest = (id: number, type: CropType) => {
    setGameState(prev => {
      const newXp = prev.xp + 15;
      return {
        ...prev,
        xp: newXp,
        level: Math.floor(newXp / XP_PER_LEVEL) + 1,
        inventory: { ...prev.inventory, [type]: (Number(prev.inventory[type]) || 0) + 1 }
      };
    });
    setPlots(prev => prev.map(p => p.id === id ? { ...p, crop: null, plantedAt: null, watered: false } : p));
  };

  const buyAnimal = (type: AnimalType) => {
    const animal = ANIMALS[type];
    if (gameState.coins >= animal.cost) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - animal.cost,
        animals: [...prev.animals, { id: Date.now() + Math.random(), type, lastProducedAt: Date.now() }]
      }));
      setAdvice(`Parabéns! Uma nova ${animal.name} chegou.`);
    }
  };

  const collectFromAnimal = (animalId: number, e: React.MouseEvent) => {
    const animalInstance = gameState.animals.find(a => a.id === animalId);
    if (!animalInstance) return;
    const data = ANIMALS[animalInstance.type];
    const isReady = (currentTime - animalInstance.lastProducedAt) / 1000 >= data.produceTime;

    if (isReady) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addFloatingText(rect.left + rect.width / 2, rect.top, `+1 ${data.produceName}`, "text-white font-bold");
      
      setGameState(prev => ({
        ...prev,
        xp: prev.xp + 25,
        level: Math.floor((prev.xp + 25) / XP_PER_LEVEL) + 1,
        inventory: { ...prev.inventory, [data.produceName]: (Number(prev.inventory[data.produceName]) || 0) + 1 },
        animals: prev.animals.map(a => a.id === animalId ? { ...a, lastProducedAt: Date.now() } : a)
      }));
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden relative font-sans">
      {floatingTexts.map(t => (
        <div key={t.id} className="fixed z-[100] font-game text-xl pointer-events-none animate-bounce" style={{ left: t.x, top: t.y, transform: 'translateX(-50%)', color: 'orange' }}>{t.text}</div>
      ))}

      {/* Header */}
      <div className="z-10 p-4 pt-6 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur px-4 py-1.5 rounded-2xl shadow-xl flex items-center gap-3 border-2 border-amber-500">
            <span className="text-2xl">💰</span>
            <span className="font-game text-xl text-amber-700">{gameState.coins}</span>
          </div>
          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-xl shadow-lg border-2 border-blue-400 w-32">
            <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase"><span>Nível {gameState.level}</span></div>
            <div className="h-2 bg-blue-100 rounded-full mt-1">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(gameState.xp % XP_PER_LEVEL)}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <button onClick={() => setIsStoreOpen(true)} className="bg-amber-500 p-3 rounded-2xl shadow-xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all"><span className="text-2xl">🏪</span></button>
          <div className="flex bg-white/50 backdrop-blur p-1 rounded-2xl border-2 border-white/50">
             <button onClick={() => setActiveTab('crops')} className={`px-4 py-2 rounded-xl text-xs font-game transition-all ${activeTab === 'crops' ? 'bg-green-500 text-white' : 'text-green-800'}`}>HORTA</button>
             <button onClick={() => setActiveTab('ranch')} className={`px-4 py-2 rounded-xl text-xs font-game transition-all ${activeTab === 'ranch' ? 'bg-orange-500 text-white' : 'text-orange-800'}`}>RANCHO</button>
          </div>
        </div>
      </div>

      {/* Advice */}
      <div className="z-10 px-4 mt-2">
        <div className="bg-white/95 rounded-3xl p-3 shadow-xl border-b-4 border-green-500 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-2xl">👴</div>
          <p className="text-xs font-semibold text-slate-700 italic leading-tight">"{advice}"</p>
        </div>
      </div>

      {/* Main Area */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md overflow-y-auto max-h-[55vh] scrollbar-hide">
          {activeTab === 'crops' ? (
            <div className="grid grid-cols-3 gap-3">
              {plots.map(plot => (
                <PlotCard key={plot.id} plot={plot} selectedTool={selectedTool} selectedSeed={selectedSeed} onAction={(id, e) => handlePlotAction(id, e)} />
              ))}
              {plots.length < MAX_PLOT_COUNT && (
                <button onClick={() => { if(gameState.coins >= PLOT_UNLOCK_COST) { setGameState(prev=>({...prev, coins: prev.coins-PLOT_UNLOCK_COST})); setPlots(prev=>[...prev, {id: prev.length, crop:null, plantedAt:null, watered:false}]); } }} className="w-full aspect-square rounded-2xl border-4 border-dashed border-white/40 flex flex-col items-center justify-center bg-white/10 active:scale-95 transition-all">
                  <span className="text-xl text-white/60">➕</span>
                  <span className="text-[10px] font-game text-white/60">${PLOT_UNLOCK_COST}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {gameState.animals.map(animal => {
                const data = ANIMALS[animal.type];
                const elapsed = (currentTime - animal.lastProducedAt) / 1000;
                const progress = Math.min(100, (elapsed / data.produceTime) * 100);
                const isReady = progress >= 100;
                return (
                  <div key={animal.id} onClick={(e) => collectFromAnimal(animal.id, e)} className="bg-white/90 p-4 rounded-[2rem] shadow-xl border-4 border-orange-200 flex flex-col items-center relative active:scale-95 transition-transform cursor-pointer">
                    <span className={`text-6xl mb-2 ${isReady ? 'animate-bounce' : ''}`}>{data.icon}</span>
                    <span className="font-game text-xs text-orange-800 uppercase text-center">{data.name}</span>
                    <div className="w-full h-3 bg-orange-100 rounded-full mt-2 overflow-hidden border border-orange-200">
                       <div className={`h-full transition-all duration-300 ${isReady ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{width: `${progress}%`}} />
                    </div>
                    {isReady && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 w-10 h-10 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-xl animate-pulse">
                        {data.produceIcon}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => { setStoreTab('animals'); setIsStoreOpen(true); }} className="aspect-square bg-white/20 border-4 border-dashed border-white/40 rounded-[2rem] flex flex-col items-center justify-center active:scale-95 transition-all">
                <span className="text-4xl">🐾</span>
                <span className="font-game text-[10px] text-white/60 mt-2">LOJA</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {activeTab === 'crops' && (
        <div className="z-20 bg-amber-50/90 backdrop-blur-2xl p-4 pb-8 border-t-4 border-amber-200 rounded-t-[3rem] shadow-2xl">
          <div className="flex justify-around mb-4">
            <button onClick={() => setSelectedTool(ToolType.SEED)} className={`p-3 rounded-2xl ${selectedTool === ToolType.SEED ? 'bg-amber-400 shadow-inner scale-110' : 'opacity-50'}`}>🌱</button>
            <button onClick={() => setSelectedTool(ToolType.WATER)} className={`p-3 rounded-2xl ${selectedTool === ToolType.WATER ? 'bg-blue-400 shadow-inner scale-110' : 'opacity-50'}`}>💧</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-2">
            {(Object.keys(CROPS) as CropType[]).map(type => (
              <button key={type} onClick={() => { setSelectedSeed(type); setSelectedTool(ToolType.SEED); }} className={`min-w-[80px] p-2 rounded-2xl border-2 transition-all relative ${selectedSeed === type ? 'bg-white border-amber-500 shadow-lg' : 'bg-amber-100/50 border-transparent'}`}>
                <div className="absolute -top-2 -left-1 bg-amber-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-game">x{gameState.seedInventory[type] || 0}</div>
                <span className="text-2xl block">{CROPS[type].icon}</span>
                <span className="text-[9px] font-bold uppercase">{CROPS[type].name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Store Modal */}
      {isStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-amber-500 p-4">
              <div className="flex justify-between items-center text-white mb-4">
                <h2 className="font-game text-xl tracking-wider uppercase">Mercado</h2>
                <button onClick={() => setIsStoreOpen(false)} className="text-2xl">&times;</button>
              </div>
              <div className="flex bg-amber-600/40 p-1 rounded-xl">
                <button onClick={() => setStoreTab('buy')} className={`flex-1 py-2 rounded-lg font-game text-[10px] ${storeTab === 'buy' ? 'bg-white text-amber-600 shadow' : 'text-white/70'}`}>SEMENTES</button>
                <button onClick={() => setStoreTab('animals')} className={`flex-1 py-2 rounded-lg font-game text-[10px] ${storeTab === 'animals' ? 'bg-white text-amber-600 shadow' : 'text-white/70'}`}>ANIMAIS</button>
                <button onClick={() => setStoreTab('sell')} className={`flex-1 py-2 rounded-lg font-game text-[10px] ${storeTab === 'sell' ? 'bg-white text-amber-600 shadow' : 'text-white/70'}`}>VENDER</button>
              </div>
            </div>
            
            <div className="p-4 space-y-2 max-h-[45vh] overflow-y-auto">
              {storeTab === 'buy' && (Object.keys(CROPS) as CropType[]).map(type => (
                <div key={type} className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{CROPS[type].icon}</span>
                    <div className="font-bold text-xs">{CROPS[type].name} <span className="text-amber-600 text-[10px] block">${CROPS[type].cost}</span></div>
                  </div>
                  <button onClick={() => { if(gameState.coins>=CROPS[type].cost) setGameState(prev=>({...prev, coins: prev.coins-CROPS[type].cost, seedInventory: {...prev.seedInventory, [type]: (prev.seedInventory[type] || 0)+1}})) }} className="bg-green-500 text-white px-3 py-1.5 rounded-xl font-game text-[10px]">COMPRAR</button>
                </div>
              ))}

              {storeTab === 'animals' && (Object.keys(ANIMALS) as AnimalType[]).map(type => (
                <div key={type} className="flex items-center justify-between p-3 bg-orange-50 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ANIMALS[type].icon}</span>
                    <div className="font-bold text-xs">{ANIMALS[type].name} <span className="text-orange-600 text-[10px] block">${ANIMALS[type].cost}</span></div>
                  </div>
                  <button onClick={() => buyAnimal(type)} className="bg-orange-500 text-white px-3 py-1.5 rounded-xl font-game text-[10px]">ADOTAR</button>
                </div>
              ))}

              {storeTab === 'sell' && Object.entries(gameState.inventory).map(([name, qty]) => {
                const numericQty = Number(qty);
                if (numericQty <= 0) return null;
                const cropMatch = Object.values(CROPS).find(c => c.type === name);
                const animalMatch = Object.values(ANIMALS).find(a => a.produceName === name);
                const itemValue = cropMatch?.value || animalMatch?.produceValue || 0;
                const itemIcon = cropMatch?.icon || animalMatch?.produceIcon || '📦';

                return (
                  <div key={name} className="flex items-center justify-between p-3 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{itemIcon}</span>
                      <div className="font-bold text-xs">{name} <span className="text-green-600 text-[10px] block">Valor: ${itemValue}</span></div>
                    </div>
                    <button onClick={() => setGameState(prev=>({...prev, coins: prev.coins+itemValue, inventory: {...prev.inventory, [name]: numericQty-1}}))} className="bg-green-600 text-white px-3 py-1.5 rounded-xl font-game text-[10px]">VENDER 1</button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="font-game text-xl text-amber-600">💰 ${gameState.coins}</div>
              <button onClick={() => setIsStoreOpen(false)} className="bg-amber-500 text-white font-game px-6 py-2 rounded-xl text-sm uppercase">Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
