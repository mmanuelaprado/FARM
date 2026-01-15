
import React, { useState, useEffect } from 'react';
import { CropType, GameState, Plot, ToolType, AnimalType, MaterialType, CropData, AnimalData } from './types';
import { CROPS, ANIMALS, MATERIALS, HOUSE_UPGRADES, INITIAL_COINS, INITIAL_PLOT_COUNT, XP_BASE, PLOT_UNLOCK_COST, MAX_PLOT_COUNT } from './constants';
import PlotCard from './components/PlotCard';
import { audioService } from './services/audioService';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  icon?: string;
}

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'crops' | 'ranch' | 'house'>('crops');
  const [isLoaded, setIsLoaded] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultSeeds: any = {};
    Object.keys(CropType).forEach(key => defaultSeeds[key] = (key === 'WHEAT') ? 5 : 0);
    const defaultMaterials: any = { [MaterialType.WOOD]: 0, [MaterialType.BRICK]: 0, [MaterialType.TILE]: 0 };

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
          materialInventory: { ...defaultMaterials, ...parsed.materialInventory },
          animals: Array.isArray(parsed.animals) ? parsed.animals : [],
          houseLevel: Number(parsed.houseLevel) || 0
        };
      }
    } catch (e) {}
    return { 
      coins: INITIAL_COINS, 
      xp: 0, 
      level: 1, 
      inventory: {}, 
      seedInventory: defaultSeeds, 
      materialInventory: defaultMaterials, 
      animals: [], 
      houseLevel: 0
    };
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
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<'buy' | 'animals' | 'materials' | 'sell'>('buy');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const xpToNextLevel = gameState.level * XP_BASE;

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

  const addFloatingText = (x: number, y: number, text: string, icon?: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text, icon }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1200);
  };

  const handleLevelUp = (currentXp: number, currentLevel: number) => {
    let newXp = currentXp;
    let newLevel = currentLevel;
    while (newXp >= newLevel * XP_BASE) {
      newXp -= (newLevel * XP_BASE);
      newLevel++;
      addFloatingText(window.innerWidth/2, 100, `LEVEL UP! ${newLevel}`, "🎉");
    }
    return { xp: newXp, level: newLevel };
  };

  const upgradeHouse = () => {
    const nextLevel = gameState.houseLevel + 1;
    if (nextLevel >= HOUSE_UPGRADES.length) return;
    const upgrade = HOUSE_UPGRADES[nextLevel];
    const canAffordCoins = gameState.coins >= upgrade.cost;
    const canAffordMaterials = Object.entries(upgrade.req).every(([mat, qty]) => 
      (gameState.materialInventory[mat as MaterialType] || 0) >= (qty as number)
    );
    if (canAffordCoins && canAffordMaterials) {
      audioService.playCash();
      setGameState(prev => {
        const newMaterials = { ...prev.materialInventory };
        Object.entries(upgrade.req).forEach(([mat, qty]) => {
          newMaterials[mat as MaterialType] -= (qty as number);
        });
        const xpGain = 150;
        const result = handleLevelUp(prev.xp + xpGain, prev.level);
        return { ...prev, coins: prev.coins - upgrade.cost, materialInventory: newMaterials, houseLevel: nextLevel, xp: result.xp, level: result.level };
      });
      addFloatingText(window.innerWidth/2, 100, "CASA EVOLUÍDA!", "🔨");
    }
  };

  const collectAnimalProduct = (id: number, e: React.MouseEvent) => {
    const animal = gameState.animals.find(a => a.id === id);
    if (!animal) return;
    const data = ANIMALS[animal.type];
    const isReady = (currentTime - animal.lastProducedAt) / 1000 >= data.produceTime;
    if (isReady) {
      audioService.playHarvest();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addFloatingText(rect.left + rect.width / 2, rect.top, `+1 ${data.produceIcon}`, data.produceIcon);
      setGameState(prev => {
        const result = handleLevelUp(prev.xp + 10, prev.level);
        return { ...prev, xp: result.xp, level: result.level, inventory: { ...prev.inventory, [data.produceName]: (prev.inventory[data.produceName] || 0) + 1 }, animals: prev.animals.map(a => a.id === id ? { ...a, lastProducedAt: Date.now() } : a) };
      });
    }
  };

  if (!isLoaded) return null;

  // TELA INICIAL
  if (!gameStarted) {
    return (
      <div className="fixed inset-0 z-[500] bg-gradient-to-b from-green-400 via-green-500 to-emerald-600 overflow-y-auto overflow-x-hidden p-6 text-white font-game flex flex-col items-center">
        <div className="max-w-2xl w-full flex flex-col items-center">
          
          <div className="text-center mt-12 animate-bounce-slow">
            <span className="text-8xl block mb-4 drop-shadow-xl">🌾</span>
            <h1 className="text-5xl md:text-7xl uppercase tracking-tighter drop-shadow-2xl">Harvest Farm</h1>
            <p className="text-lg text-green-100 mt-2 font-game bg-black/10 px-4 py-1 rounded-full inline-block">Local Edition</p>
          </div>

          <button 
            onClick={() => { audioService.playPop(); setGameStarted(true); }}
            className="mt-12 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-3xl px-12 py-5 rounded-[2.5rem] shadow-[0_10px_0_#b45309] active:translate-y-2 active:shadow-none transition-all animate-pulse border-4 border-white"
          >
            JOGAR AGORA
          </button>

          <section className="mt-20 w-full bg-white/20 backdrop-blur-md p-8 rounded-[3rem] border-2 border-white/30 shadow-2xl">
            <h2 className="text-3xl mb-4 flex items-center gap-3">📜 História</h2>
            <p className="text-lg leading-relaxed font-sans font-semibold">
              O seu avô deixou para você uma pequena gleba de terra mágica. Antigamente, esta fazenda alimentava 
              toda a região, mas agora está em suas mãos restaurar sua glória. O solo aqui é especial: com o 
              carinho certo e água pura, as plantas crescem em minutos! Comece do zero e torne-se o mestre da colheita.
            </p>
          </section>

          <section className="mt-8 w-full">
            <h2 className="text-3xl mb-6 text-center">🐾 Nossos Animais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(ANIMALS).map(a => (
                <div key={a.type} className="bg-white/95 p-6 rounded-3xl shadow-xl flex flex-col items-center text-slate-800 border-b-4 border-slate-200">
                  <span className="text-6xl mb-2">{a.icon}</span>
                  <h3 className="text-xl font-game">{a.name}</h3>
                  <div className="mt-2 flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-orange-700">Produz: {a.produceIcon} {a.produceName}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 w-full bg-amber-500/40 p-8 rounded-[3rem] border-2 border-amber-300 shadow-2xl">
            <h2 className="text-3xl mb-6 text-center">📖 Como Jogar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans font-bold">
              <div className="flex items-start gap-4 bg-black/10 p-4 rounded-2xl">
                <span className="text-2xl">🌱</span>
                <p>Selecione uma semente e clique em um lote de terra para plantar.</p>
              </div>
              <div className="flex items-start gap-4 bg-black/10 p-4 rounded-2xl">
                <span className="text-2xl">💧</span>
                <p>Use o regador para acelerar o crescimento em 50%!</p>
              </div>
              <div className="flex items-start gap-4 bg-black/10 p-4 rounded-2xl">
                <span className="text-2xl">✨</span>
                <p>Quando brilhar, clique para colher e ganhar experiência.</p>
              </div>
              <div className="flex items-start gap-4 bg-black/10 p-4 rounded-2xl">
                <span className="text-2xl">🏪</span>
                <p>Venda seus produtos no Mercado para comprar novas expansões.</p>
              </div>
            </div>
          </section>

          <section className="mt-8 w-full bg-blue-600/30 p-8 rounded-[3rem] border-2 border-blue-400 shadow-2xl">
            <h2 className="text-3xl mb-4">⚙️ Como funciona a produção</h2>
            <p className="font-sans font-bold leading-relaxed">
              Cada planta tem um tempo de maturação natural. Ao regar, você reduz esse tempo pela metade 
              imediatamente. Os animais do rancho (Galinhas, Abelhas e Vacas) produzem recursos de forma 
              automática a cada intervalo fixo. Basta clicar neles quando o ícone de recurso aparecer para coletar!
            </p>
          </section>

          <section className="mt-8 w-full mb-20 text-center">
            <h2 className="text-3xl mb-6">📸 Galeria da Fazenda</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
              <div className="min-w-[300px] h-48 bg-emerald-700 rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl relative group overflow-hidden">
                 <div className="absolute inset-0 bg-green-500/20 group-hover:bg-transparent transition-all"></div>
                 <span className="text-8xl">🌻</span>
                 <p className="absolute bottom-4 font-game text-white text-lg">Horta em Ação</p>
              </div>
              <div className="min-w-[300px] h-48 bg-orange-600 rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl relative group overflow-hidden">
                 <div className="absolute inset-0 bg-orange-500/20 group-hover:bg-transparent transition-all"></div>
                 <span className="text-8xl">🐮</span>
                 <p className="absolute bottom-4 font-game text-white text-lg">Rancho Feliz</p>
              </div>
              <div className="min-w-[300px] h-48 bg-indigo-800 rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl relative group overflow-hidden">
                 <div className="absolute inset-0 bg-indigo-500/20 group-hover:bg-transparent transition-all"></div>
                 <span className="text-8xl">🏛️</span>
                 <p className="absolute bottom-4 font-game text-white text-lg">Mansão Rural</p>
              </div>
            </div>
          </section>

          <p className="text-white/40 mb-12 font-sans text-sm">© 2024 Harvest Farm Team</p>
        </div>
        <style>{`
          .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
          @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden text-slate-800 touch-none select-none h-[100dvh] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] animate-in fade-in duration-500">
      
      {/* HEADER STATS */}
      <div className="z-10 px-4 pt-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 border-2 border-amber-500">
            <span className="text-xl">💰</span>
            <span className="font-game text-base text-amber-700">{gameState.coins}</span>
          </div>
          <div className="bg-white/95 backdrop-blur px-2 py-1.5 rounded-xl border border-blue-400 w-28 shadow-sm">
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(gameState.xp / xpToNextLevel) * 100}%` }} />
            </div>
            <div className="flex justify-between items-center mt-1 px-1">
              <span className="text-[9px] font-bold text-blue-600 font-game">Lvl {gameState.level}</span>
              <span className="text-[8px] text-blue-400 font-bold">{Math.floor(gameState.xp)}/{xpToNextLevel}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex bg-black/10 backdrop-blur-md p-1 rounded-2xl">
             <button onClick={() => setActiveTab('crops')} className={`px-5 py-2.5 rounded-xl text-[10px] font-game transition-all ${activeTab === 'crops' ? 'bg-green-500 text-white shadow-md' : 'text-green-900'}`}>HORTA</button>
             <button onClick={() => setActiveTab('ranch')} className={`px-5 py-2.5 rounded-xl text-[10px] font-game transition-all ${activeTab === 'ranch' ? 'bg-orange-500 text-white shadow-md' : 'text-orange-900'}`}>RANCHO</button>
             <button onClick={() => setActiveTab('house')} className={`px-5 py-2.5 rounded-xl text-[10px] font-game transition-all ${activeTab === 'house' ? 'bg-indigo-500 text-white shadow-md' : 'text-indigo-900'}`}>CASA</button>
          </div>
          <button onClick={() => { audioService.playPop(); setIsStoreOpen(true); }} className="bg-amber-500 p-2.5 rounded-2xl shadow-lg text-2xl border-b-4 border-amber-700 active:translate-y-1 active:border-b-0 transition-all">🏪</button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="z-10 flex-1 flex items-center justify-center px-4 py-2 min-h-0 overflow-hidden">
        <div className="w-full max-w-md max-h-full">
          {activeTab === 'crops' ? (
            <div className="relative p-1 rounded-[2.5rem] shadow-2xl border-4 border-green-900/20 overflow-hidden bg-[#15803d]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_#4ade80_0%,_#166534_100%)] opacity-95" />
              <div className="relative z-10 overflow-y-auto scrollbar-hide h-[360px] p-2">
                <div className="grid grid-cols-3 gap-2.5">
                  {plots.map(plot => (
                    <PlotCard key={plot.id} plot={plot} selectedTool={selectedTool} selectedSeed={selectedSeed} onAction={(id, e) => {
                      const plotRef = plots.find(p => p.id === id);
                      if(!plotRef) return;
                      if(!plotRef.unlocked && gameState.coins >= PLOT_UNLOCK_COST) {
                        setGameState(p => ({...p, coins: p.coins - PLOT_UNLOCK_COST}));
                        setPlots(ps => ps.map(p => p.id === id ? {...p, unlocked: true} : p));
                        audioService.playCash();
                      } else if (plotRef.unlocked && !plotRef.crop && (gameState.seedInventory[selectedSeed] || 0) > 0) {
                        setGameState(p => ({...p, seedInventory: {...p.seedInventory, [selectedSeed]: (p.seedInventory[selectedSeed] || 0) - 1}}));
                        setPlots(ps => ps.map(p => p.id === id ? {...p, crop: selectedSeed, plantedAt: Date.now(), watered: false} : p));
                        audioService.playPop();
                      } else if (plotRef.crop) {
                        const c = CROPS[plotRef.crop];
                        const growthNeeded = plotRef.watered ? c.growthTime / 2 : c.growthTime;
                        const ready = (Date.now() - (plotRef.plantedAt || 0)) / 1000 > growthNeeded;
                        if(ready) {
                          setGameState(p => {
                            const result = handleLevelUp(p.xp + 5, p.level);
                            return {...p, xp: result.xp, level: result.level, inventory: {...p.inventory, [c.name]: (p.inventory[c.name]||0)+1}};
                          });
                          setPlots(ps => ps.map(p => p.id === id ? {...p, crop: null, plantedAt: null, watered: false} : p));
                          audioService.playHarvest();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          addFloatingText(rect.left + rect.width / 2, rect.top, `+1 ${c.icon}`, c.icon);
                        } else if (selectedTool === ToolType.WATER && !plotRef.watered) {
                          audioService.playPop();
                          setPlots(ps => ps.map(p => p.id === id ? {...p, watered: true} : p));
                        }
                      }
                    }} />
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'ranch' ? (
             <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[55vh] w-full p-1 scrollbar-hide">
               {gameState.animals.map(animal => {
                 const data = ANIMALS[animal.type];
                 const progress = Math.min(100, ((currentTime - animal.lastProducedAt) / 1000 / data.produceTime) * 100);
                 const isReady = progress >= 100;
                 return (
                   <div key={animal.id} onClick={(e) => collectAnimalProduct(animal.id, e)} className="bg-white/95 p-4 rounded-[2.5rem] shadow-xl flex flex-col items-center relative active:scale-95 transition-all">
                     <span className={`text-6xl mb-2 ${isReady ? 'animate-bounce' : ''}`}>{data.icon}</span>
                     {isReady && <div className="absolute top-2 right-2 text-xl bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm">{data.produceIcon}</div>}
                     <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-orange-500" style={{width: `${progress}%`}} />
                     </div>
                     <span className="font-game text-[10px] text-orange-800 uppercase mt-2">{data.name}</span>
                   </div>
                 );
               })}
               <button onClick={() => { setIsStoreOpen(true); setStoreTab('animals'); }} className="aspect-square bg-white/40 border-4 border-dashed border-white/60 rounded-[2.5rem] flex flex-col items-center justify-center active:scale-95 transition-all">
                 <span className="text-4xl opacity-40">➕</span>
                 <span className="font-game text-[10px] text-orange-900/60 mt-2 uppercase">Adotar</span>
               </button>
             </div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
              <span className="text-[120px] relative drop-shadow-2xl animate-bounce-slow">
                {HOUSE_UPGRADES[gameState.houseLevel].icon}
              </span>
              <div className="bg-white/90 backdrop-blur p-6 rounded-[2.5rem] shadow-2xl w-full border-t-4 border-indigo-200">
                <h3 className="font-game text-xl text-indigo-900 text-center mb-1">{HOUSE_UPGRADES[gameState.houseLevel].name}</h3>
                <p className="text-[10px] text-center text-indigo-500 uppercase font-bold tracking-widest mb-4">Nível {gameState.houseLevel}</p>
                {gameState.houseLevel < HOUSE_UPGRADES.length - 1 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(HOUSE_UPGRADES[gameState.houseLevel+1].req).map(([mat, qty]) => (
                        <div key={mat} className="flex flex-col items-center bg-indigo-50 p-2 rounded-2xl border border-indigo-100">
                          <span className="text-2xl">{MATERIALS[mat as MaterialType].icon}</span>
                          <span className={`text-[10px] font-bold mt-1 ${gameState.materialInventory[mat as MaterialType] >= (qty as number) ? 'text-green-600' : 'text-red-400'}`}>
                            {gameState.materialInventory[mat as MaterialType]}/{(qty as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button onClick={upgradeHouse} className="w-full bg-indigo-600 text-white font-game py-4 rounded-2xl shadow-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all">
                      CONSTRUIR (${HOUSE_UPGRADES[gameState.houseLevel+1].cost})
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-amber-600 font-game">CASA COMPLETA! 🎉</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'crops' && (
        <div className="z-20 bg-amber-50/95 p-3 border-t-2 border-amber-200 rounded-t-[2.5rem] shrink-0">
          <div className="flex justify-center gap-6 mb-3">
             <button onClick={() => setSelectedTool(ToolType.SEED)} className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${selectedTool === ToolType.SEED ? 'bg-amber-400 shadow-lg scale-110' : 'bg-white border'}`}>🌱</button>
             <button onClick={() => setSelectedTool(ToolType.WATER)} className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${selectedTool === ToolType.WATER ? 'bg-blue-400 shadow-lg scale-110' : 'bg-white border'}`}>💧</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
            {(Object.keys(CROPS) as CropType[]).map(type => {
              const isLocked = (CROPS[type].minLevel || 0) > gameState.level;
              return (
                <button key={type} disabled={isLocked} onClick={() => { setSelectedSeed(type); setSelectedTool(ToolType.SEED); audioService.playPop(); }} className={`min-w-[60px] p-2 rounded-xl border-2 transition-all relative ${selectedSeed === type ? 'bg-white border-amber-500 scale-105 shadow-md' : 'bg-white/50 border-transparent'} ${isLocked ? 'grayscale opacity-50' : ''}`}>
                  <div className="absolute -top-1 -left-1 bg-amber-600 text-white text-[8px] px-1.5 rounded-full z-10">x{gameState.seedInventory[type] || 0}</div>
                  <span className="text-2xl block">{isLocked ? '🔒' : CROPS[type].icon}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isStoreOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-amber-50 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-white/20">
            <div className="bg-amber-500 p-5 flex justify-between items-center text-white shrink-0">
              <h2 className="font-game text-xl uppercase tracking-wider">Mercado Central</h2>
              <button onClick={() => setIsStoreOpen(false)} className="text-2xl p-2 bg-black/10 rounded-full w-10 h-10 flex items-center justify-center">✕</button>
            </div>
            
            <div className="flex gap-1 px-4 mt-4 overflow-x-auto scrollbar-hide shrink-0 pb-1">
              <button onClick={() => setStoreTab('buy')} className={`px-4 py-2 rounded-xl font-game text-[9px] shrink-0 transition-all ${storeTab === 'buy' ? 'bg-green-500 text-white' : 'bg-white text-green-700 shadow-sm'}`}>SEMENTES</button>
              <button onClick={() => setStoreTab('animals')} className={`px-4 py-2 rounded-xl font-game text-[9px] shrink-0 transition-all ${storeTab === 'animals' ? 'bg-orange-500 text-white' : 'bg-white text-orange-700 shadow-sm'}`}>ANIMAIS</button>
              <button onClick={() => setStoreTab('materials')} className={`px-4 py-2 rounded-xl font-game text-[9px] shrink-0 transition-all ${storeTab === 'materials' ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-700 shadow-sm'}`}>MATERIAIS</button>
              <button onClick={() => setStoreTab('sell')} className={`px-4 py-2 rounded-xl font-game text-[9px] shrink-0 transition-all ${storeTab === 'sell' ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-700 shadow-sm'}`}>VENDER</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 mt-2 min-h-0 bg-amber-100/30">
              {storeTab === 'materials' && Object.values(MATERIALS).map(m => (
                <div key={m.type} className="flex items-center justify-between p-3 bg-white rounded-2xl border shadow-sm gap-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-3xl shrink-0">{m.icon}</span>
                    <span className="font-game text-xs text-indigo-900 truncate">{m.name}</span>
                  </div>
                  <button onClick={() => { if(gameState.coins >= m.cost) { setGameState(p => ({...p, coins: p.coins - m.cost, materialInventory: {...p.materialInventory, [m.type]: p.materialInventory[m.type] + 1}})); audioService.playPop(); } }} className={`text-white px-4 py-2 rounded-xl text-[9px] font-game border-b-4 shrink-0 transition-all ${gameState.coins >= m.cost ? 'bg-indigo-500 border-indigo-700 active:border-b-0 active:translate-y-1' : 'bg-gray-400 border-gray-500 opacity-60'}`}>${m.cost}</button>
                </div>
              ))}
              
              {storeTab === 'buy' && (Object.keys(CROPS) as CropType[]).map(type => {
                const isLocked = (CROPS[type].minLevel || 0) > gameState.level;
                return (
                  <div key={type} className={`flex items-center justify-between p-3 bg-white rounded-2xl border shadow-sm gap-2 ${isLocked ? 'opacity-40 grayscale' : ''}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-3xl shrink-0">{isLocked ? '🔒' : CROPS[type].icon}</span>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-game text-xs truncate">{isLocked ? 'Bloqueado' : CROPS[type].name}</span>
                        {isLocked && <span className="text-[8px] font-bold text-red-600">Lvl {CROPS[type].minLevel}</span>}
                      </div>
                    </div>
                    {!isLocked && (
                      <button onClick={() => { if(gameState.coins >= CROPS[type].cost) { setGameState(p => ({...p, coins: p.coins - CROPS[type].cost, seedInventory: {...p.seedInventory, [type]: (p.seedInventory[type] || 0) + 1}})); audioService.playPop(); } }} className={`text-white px-4 py-2 rounded-xl text-[9px] font-game border-b-4 shrink-0 transition-all ${gameState.coins >= CROPS[type].cost ? 'bg-green-500 border-green-700 active:border-b-0 active:translate-y-1' : 'bg-gray-400 border-gray-500 opacity-60'}`}>${CROPS[type].cost}</button>
                    )}
                  </div>
                );
              })}

              {storeTab === 'animals' && (Object.keys(ANIMALS) as AnimalType[]).map(type => {
                const data = ANIMALS[type];
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-white rounded-2xl border shadow-sm gap-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-3xl shrink-0">{data.icon}</span>
                      <span className="font-game text-xs text-orange-900 truncate">{data.name}</span>
                    </div>
                    <button onClick={() => { if(gameState.coins >= data.cost) { setGameState(p => ({...p, coins: p.coins - data.cost, animals: [...p.animals, {id: Date.now(), type, lastProducedAt: Date.now()}]})); audioService.playPop(); } }} className={`text-white px-4 py-2 rounded-xl text-[9px] font-game border-b-4 shrink-0 transition-all ${gameState.coins >= data.cost ? 'bg-orange-500 border-orange-700 active:border-b-0 active:translate-y-1' : 'bg-gray-400 border-gray-500 opacity-60'}`}>${data.cost}</button>
                  </div>
                );
              })}

              {storeTab === 'sell' && Object.entries(gameState.inventory).map(([name, qty]) => (
                (qty as number) > 0 && (
                  <div key={name} className="flex items-center justify-between p-3 bg-white rounded-2xl border shadow-sm gap-2">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <span className="font-game text-xs text-emerald-900 truncate">{name}</span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 rounded-lg text-[9px] font-bold">x{qty}</span>
                    </div>
                    <button onClick={() => {
                       const crop = (Object.values(CROPS) as CropData[]).find(c => c.name === name);
                       const animalProd = (Object.values(ANIMALS) as AnimalData[]).find(a => a.produceName === name);
                       const val = crop ? crop.value : (animalProd ? animalProd.produceValue : 10);
                       setGameState(p => ({...p, coins: p.coins + val, inventory: {...p.inventory, [name]: (p.inventory[name] || 0) - 1}}));
                       audioService.playCash();
                       addFloatingText(window.innerWidth/2, 100, `+$${val}`, "💰");
                    }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-game border-b-4 border-emerald-800 shrink-0 active:translate-y-1 active:border-b-0 transition-all">VENDER (${ (Object.values(CROPS) as CropData[]).find(c => c.name === name)?.value || (Object.values(ANIMALS) as AnimalData[]).find(a => a.produceName === name)?.produceValue || 10 })</button>
                  </div>
                )
              ))}
            </div>
            
            <div className="p-6 bg-white border-t flex justify-between items-center shrink-0">
              <div className="font-game text-lg text-amber-600">Carteira: ${gameState.coins}</div>
              <button onClick={() => setIsStoreOpen(false)} className="bg-amber-500 text-white font-game px-8 py-3 rounded-2xl text-[10px] shadow-lg border-b-4 border-amber-700 active:translate-y-1 active:border-b-0 transition-all uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-[200]">
        {floatingTexts.map(t => (
          <div key={t.id} className="absolute flex flex-col items-center animate-float-up" style={{ left: t.x, top: t.y }}>
            {t.icon && <span className="text-2xl mb-1 drop-shadow-md">{t.icon}</span>}
            <span className="font-game text-sm text-white drop-shadow-md bg-orange-500/90 px-3 py-1 rounded-xl border border-white/50">{t.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float-up {
          0% { transform: translate(-50%, 0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(-50%, -100px); opacity: 0; }
        }
        .animate-float-up { animation: float-up 1.2s ease-out forwards; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
