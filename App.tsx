
import React, { useState, useEffect } from 'react';
import { CropType, GameState, Plot, ToolType, AnimalType } from './types';
import { CROPS, ANIMALS, INITIAL_COINS, INITIAL_PLOT_COUNT, XP_PER_LEVEL, PLOT_UNLOCK_COST, MAX_PLOT_COUNT } from './constants';
import PlotCard from './components/PlotCard';
import { getFarmAdvice } from './services/geminiService';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'crops' | 'ranch'>('crops');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultSeeds = { 
      [CropType.WHEAT]: 5, [CropType.CORN]: 0, [CropType.CARROT]: 0, [CropType.TOMATO]: 0, [CropType.PUMPKIN]: 0 
    };

    try {
      const saved = localStorage.getItem('gemini_harvest_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          coins: Number(parsed.coins) ?? INITIAL_COINS,
          xp: Number(parsed.xp) ?? 0,
          level: Number(parsed.level) ?? 1,
          inventory: parsed.inventory || {},
          seedInventory: parsed.seedInventory || defaultSeeds,
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
  const [advice, setAdvice] = useState<string>("Bem-vindo de volta à sua fazenda!");
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'buy' | 'sell' | 'animals'>('buy');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
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
      try {
        const text = await getFarmAdvice(gameState.coins, gameState.level, gameState.inventory);
        setAdvice(text);
      } catch (err) {
        setAdvice("O clima está ótimo para plantar hoje!");
      }
    };
    if (isLoaded) fetchAdvice();
  }, [gameState.level, isLoaded]);

  if (!isLoaded) return null;

  const addFloatingText = (x: number, y: number, text: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 800);
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
      addFloatingText(rect.left + rect.width / 2, rect.top, "+15 XP");
      setGameState(prev => {
        const newXp = prev.xp + 15;
        return {
          ...prev,
          xp: newXp,
          level: Math.floor(newXp / XP_PER_LEVEL) + 1,
          inventory: { ...prev.inventory, [plot.crop!]: (Number(prev.inventory[plot.crop!]) || 0) + 1 }
        };
      });
      setPlots(prev => prev.map(p => p.id === id ? { ...p, crop: null, plantedAt: null, watered: false } : p));
      return;
    }
    
    if (selectedTool === ToolType.SEED && !plot.crop) {
      if ((gameState.seedInventory[selectedSeed] || 0) > 0) {
        setGameState(prev => ({ 
          ...prev, 
          seedInventory: { ...prev.seedInventory, [selectedSeed]: (prev.seedInventory[selectedSeed] || 0) - 1 } 
        }));
        setPlots(prev => prev.map(p => p.id === id ? { ...p, crop: selectedSeed, plantedAt: Date.now(), watered: false } : p));
      }
    } else if (selectedTool === ToolType.WATER && plot.crop && !plot.watered) {
      setPlots(prev => prev.map(p => p.id === id ? { ...p, watered: true } : p));
    }
  };

  const collectAnimal = (animalId: number, e: React.MouseEvent) => {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal) return;
    const data = ANIMALS[animal.type];
    const isReady = (currentTime - animal.lastProducedAt) / 1000 >= data.produceTime;

    if (isReady) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addFloatingText(rect.left + rect.width / 2, rect.top, `+1 ${data.produceIcon}`);
      setGameState(prev => ({
        ...prev,
        xp: prev.xp + 20,
        inventory: { ...prev.inventory, [data.produceName]: (Number(prev.inventory[data.produceName]) || 0) + 1 },
        animals: prev.animals.map(a => a.id === animalId ? { ...a, lastProducedAt: Date.now() } : a)
      }));
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden text-slate-800 touch-none select-none">
      {/* Dynamic Background Elements */}
      <div className="absolute top-10 left-10 text-4xl opacity-20">☁️</div>
      <div className="absolute top-20 right-10 text-5xl opacity-20 animate-pulse">☁️</div>

      {floatingTexts.map(t => (
        <div key={t.id} className="fixed z-[100] font-game text-sm pointer-events-none animate-bounce text-orange-500 font-bold" style={{ left: t.x, top: t.y, transform: 'translateX(-50%)' }}>{t.text}</div>
      ))}

      {/* Header Mobile - Ajustado para não cortar */}
      <div className="z-10 px-4 pt-6 flex justify-between items-center shrink-0">
        <div className="flex flex-col gap-1">
          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-xl shadow-lg flex items-center gap-2 border-2 border-amber-500">
            <span className="text-xl">💰</span>
            <span className="font-game text-lg text-amber-700">{gameState.coins}</span>
          </div>
          <div className="bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg border border-blue-400 w-24">
            <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(gameState.xp % XP_PER_LEVEL)}%` }} />
            </div>
            <span className="text-[9px] font-bold text-blue-600 block text-center uppercase mt-0.5">Nível {gameState.level}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white/40 backdrop-blur p-0.5 rounded-xl border border-white/50 shadow-sm">
             <button onClick={() => setActiveTab('crops')} className={`px-3 py-1.5 rounded-lg text-[10px] font-game ${activeTab === 'crops' ? 'bg-green-500 text-white shadow' : 'text-green-900'}`}>HORTA</button>
             <button onClick={() => setActiveTab('ranch')} className={`px-3 py-1.5 rounded-lg text-[10px] font-game ${activeTab === 'ranch' ? 'bg-orange-500 text-white shadow' : 'text-orange-900'}`}>RANCHO</button>
          </div>
          <button onClick={() => setIsStoreOpen(true)} className="bg-amber-500 p-2.5 rounded-xl shadow-lg active:scale-95 transition-all text-2xl">🏪</button>
        </div>
      </div>

      {/* Dica do Mentor */}
      <div className="z-10 px-4 mt-4 shrink-0">
        <div className="bg-white/95 rounded-2xl p-3 shadow-md border-b-2 border-green-500 flex items-center gap-3">
          <span className="text-2xl shrink-0">👴</span>
          <p className="text-[11px] font-medium text-slate-700 italic leading-tight">"{advice}"</p>
        </div>
      </div>

      {/* Área de Jogo - Otimizada para rolagem e visualização */}
      <div className="z-10 flex-1 overflow-y-auto px-4 py-6 scrollbar-hide pb-48">
        <div className="max-w-md mx-auto h-full">
          {activeTab === 'crops' ? (
            <div className="grid grid-cols-3 gap-3">
              {plots.map(plot => (
                <PlotCard key={plot.id} plot={plot} selectedTool={selectedTool} selectedSeed={selectedSeed} onAction={(id, e) => handlePlotAction(id, e)} />
              ))}
              {plots.length < MAX_PLOT_COUNT && (
                <button 
                  onClick={() => { if(gameState.coins >= PLOT_UNLOCK_COST) { setGameState(prev=>({...prev, coins: prev.coins-PLOT_UNLOCK_COST})); setPlots(prev=>[...prev, {id: prev.length, crop:null, plantedAt:null, watered:false}]); } }} 
                  className="aspect-square rounded-2xl border-4 border-dashed border-white/50 bg-white/10 flex flex-col items-center justify-center active:scale-95 hover:bg-white/20 transition-all"
                >
                  <span className="text-2xl text-white/50">➕</span>
                  <span className="text-[10px] font-game text-white/50 mt-1">${PLOT_UNLOCK_COST}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {gameState.animals.map(animal => {
                const data = ANIMALS[animal.type];
                const progress = Math.min(100, ((currentTime - animal.lastProducedAt) / 1000 / data.produceTime) * 100);
                return (
                  <div key={animal.id} onClick={(e) => collectAnimal(animal.id, e)} className="bg-white/90 p-4 rounded-3xl shadow-lg border-2 border-orange-200 flex flex-col items-center relative active:scale-95 transition-all">
                    <span className={`text-6xl mb-2 ${progress >= 100 ? 'animate-bounce' : ''}`}>{data.icon}</span>
                    <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden border border-orange-200">
                       <div className="h-full bg-orange-500 transition-all duration-300" style={{width: `${progress}%`}} />
                    </div>
                    {progress >= 100 && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xl animate-pulse shadow-md">
                        {data.produceIcon}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => { setStoreTab('animals'); setIsStoreOpen(true); }} className="aspect-square bg-white/20 border-4 border-dashed border-white/40 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all group">
                <span className="text-4xl group-hover:scale-110 transition-transform">🐾</span>
                <span className="font-game text-[10px] text-white/60 mt-2">ADOTAR</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar Inferior Mobile - Fixo e sem cortes */}
      {activeTab === 'crops' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-amber-50/95 backdrop-blur-lg p-4 pb-10 border-t-2 border-amber-200 rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
          <div className="flex justify-center gap-12 mb-5">
            <button onClick={() => setSelectedTool(ToolType.SEED)} className={`p-4 rounded-2xl transition-all ${selectedTool === ToolType.SEED ? 'bg-amber-400 scale-110 shadow-lg ring-4 ring-amber-200' : 'bg-amber-100 opacity-60'}`}>🌱</button>
            <button onClick={() => setSelectedTool(ToolType.WATER)} className={`p-4 rounded-2xl transition-all ${selectedTool === ToolType.WATER ? 'bg-blue-400 scale-110 shadow-lg ring-4 ring-blue-200' : 'bg-blue-100 opacity-60'}`}>💧</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
            {(Object.keys(CROPS) as CropType[]).map(type => (
              <button 
                key={type} 
                onClick={() => { setSelectedSeed(type); setSelectedTool(ToolType.SEED); }} 
                className={`min-w-[80px] p-2 rounded-2xl border-2 transition-all relative shrink-0 ${selectedSeed === type ? 'bg-white border-amber-500 shadow-md translate-y-[-4px]' : 'bg-transparent border-transparent opacity-80'}`}
              >
                <div className="absolute -top-2 -left-1 bg-amber-600 text-white text-[9px] px-2 py-0.5 rounded-full font-game shadow-sm">x{gameState.seedInventory[type] || 0}</div>
                <span className="text-2xl block mb-1">{CROPS[type].icon}</span>
                <span className="text-[9px] font-bold uppercase truncate block text-amber-900">{CROPS[type].name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loja Modal - Mobile First */}
      {isStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="bg-amber-500 p-5 shrink-0 flex justify-between items-center text-white">
              <h2 className="font-game text-xl tracking-wider">MERCADO DA FAZENDA</h2>
              <button onClick={() => setIsStoreOpen(false)} className="text-3xl font-bold p-2">&times;</button>
            </div>
            
            <div className="flex bg-amber-50 p-1.5 shrink-0 mx-4 mt-2 rounded-2xl">
              {['buy', 'animals', 'sell'].map((t) => (
                <button 
                  key={t}
                  onClick={() => setStoreTab(t as any)} 
                  className={`flex-1 py-2.5 text-[11px] font-game rounded-xl transition-all ${storeTab === t ? 'bg-amber-500 text-white shadow-md' : 'text-amber-800 opacity-50'}`}
                >
                  {t === 'buy' ? 'SEMENTES' : t === 'animals' ? 'ANIMAIS' : 'VENDER'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {storeTab === 'buy' && (Object.keys(CROPS) as CropType[]).map(type => (
                <div key={type} className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl border border-amber-100 active:bg-amber-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{CROPS[type].icon}</span>
                    <div>
                      <span className="font-bold text-xs uppercase block">{CROPS[type].name}</span>
                      <span className="text-amber-600 text-[10px] font-game">${CROPS[type].cost}</span>
                    </div>
                  </div>
                  <button onClick={() => { if(gameState.coins>=CROPS[type].cost) setGameState(prev=>({...prev, coins: prev.coins-CROPS[type].cost, seedInventory: {...prev.seedInventory, [type]: (prev.seedInventory[type] || 0)+1}})) }} className="bg-green-500 text-white px-5 py-2 rounded-xl text-xs font-game shadow-sm active:scale-95 transition-all">COMPRAR</button>
                </div>
              ))}
              
              {storeTab === 'sell' && Object.entries(gameState.inventory).map(([name, qty]) => {
                if (Number(qty) <= 0) return null;
                const cropMatch = Object.values(CROPS).find(c => c.type === name);
                const animalMatch = Object.values(ANIMALS).find(a => a.produceName === name);
                const val = cropMatch?.value || animalMatch?.produceValue || 1;
                const icon = cropMatch?.icon || animalMatch?.produceIcon || '📦';
                return (
                  <div key={name} className="flex items-center justify-between p-3 bg-green-50 rounded-2xl border border-green-100 active:bg-green-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div>
                        <span className="font-bold text-xs uppercase block">{name}</span>
                        <span className="text-green-600 text-[10px] font-bold">x{qty} disponíveis</span>
                      </div>
                    </div>
                    <button onClick={() => setGameState(prev=>({...prev, coins: prev.coins+val, inventory: {...prev.inventory, [name]: (Number(prev.inventory[name]))-1}}))} className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-game shadow-sm active:scale-95 transition-all">VENDER (${val})</button>
                  </div>
                );
              })}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Seu Saldo</span>
                <span className="font-game text-2xl text-amber-600">💰 ${gameState.coins}</span>
              </div>
              <button onClick={() => setIsStoreOpen(false)} className="bg-amber-500 text-white font-game px-8 py-3 rounded-2xl text-sm uppercase shadow-lg active:scale-95 transition-all">CONCLUÍDO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
