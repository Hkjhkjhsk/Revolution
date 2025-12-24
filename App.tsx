import React, { useState, useRef, useEffect } from 'react';
import { GameStatus, GameState, GameScene } from './types';
import { generateNextScene, generateSceneImage, speakAgentLine, isKeyMissing } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    status: GameStatus.START_SCREEN,
    currentScene: null,
    history: [],
    power: 50,
    morale: 50,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [showKeyError, setShowKeyError] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isKeyMissing()) {
      setShowKeyError(true);
    } else {
      generateSceneImage("soldier bleeding hand", true).then(setStartImage);
    }
  }, []);

  const playAgentVoice = async (text: string) => {
    try {
      const buffer = await speakAgentLine(text);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) {
      console.error("Audio error", err);
    }
  };

  const startGame = async () => {
    if (isKeyMissing()) {
      setShowKeyError(true);
      return;
    }
    setIsLoading(true);
    try {
      const initialScene = await generateNextScene(
        "البداية: رحلة بحرية هادئة، وفجأة العاصفة تتحطم السفينة.",
        "الاستيقاظ على الشاطئ المجهول",
        50,
        50
      );
      const imageUrl = await generateSceneImage(initialScene.description);
      
      setState(prev => ({
        ...prev,
        status: GameStatus.IN_GAME,
        currentScene: { ...initialScene, imageUrl }
      }));
      
      playAgentVoice(initialScene.agentPrompt);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAction = async (action: string) => {
    if (!action.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const nextScene = await generateNextScene(
        state.currentScene?.situationContext || "",
        action,
        state.morale,
        state.power
      );
      const imageUrl = await generateSceneImage(nextScene.description);
      
      setState(prev => ({
        ...prev,
        currentScene: { ...nextScene, imageUrl },
        history: [...prev.history, action],
        morale: Math.max(0, Math.min(100, prev.morale + (Math.random() * 10 - 5))),
        power: Math.max(0, Math.min(100, prev.power + (Math.random() * 10 - 5)))
      }));

      playAgentVoice(nextScene.agentPrompt);
      setUserInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (showKeyError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-10 text-center">
        <div className="max-w-md border border-red-900/50 p-8 space-y-4">
          <h2 className="text-red-500 font-amiri text-2xl">خطأ في الإعداد</h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            لم يتم العثور على مفتاح API الخاص بـ Gemini. 
            يرجى إضافته في إعدادات الاستضافة (Environment Variables) باسم <code className="text-zinc-300">API_KEY</code>.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-[10px] text-zinc-400 border border-zinc-800 px-4 py-2 hover:bg-zinc-900 transition-all"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }

  if (state.status === GameStatus.START_SCREEN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#050507] text-zinc-500 overflow-hidden relative">
        <div className="absolute inset-0 cold-overlay opacity-60"></div>
        
        <div className="max-w-sm w-full space-y-12 z-10">
          <div className="relative soldier-frame aspect-square bg-zinc-900/20 overflow-hidden">
            {startImage ? (
              <img 
                src={startImage} 
                alt="عسكري مجهول"
                className="w-full h-full object-cover flicker grayscale contrast-125 transition-opacity duration-1000"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-zinc-800">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-transparent animate-spin rounded-full"></div>
              </div>
            )}
            <div className="absolute inset-0 vignette"></div>
          </div>

          <div className="text-center space-y-2 opacity-80">
            <h1 className="text-2xl font-light tracking-[0.3em] uppercase text-zinc-300 font-amiri">الندبة السوداء</h1>
            <p className="text-[10px] tracking-widest text-zinc-600">تجربة عسكرية نفسية</p>
          </div>

          <button 
            onClick={startGame}
            disabled={isLoading}
            className="w-full py-4 border border-zinc-800/50 hover:border-zinc-400 hover:text-zinc-200 transition-all duration-700 text-sm tracking-[0.5em] disabled:opacity-20 uppercase font-light"
          >
            {isLoading ? '...' : '[ ابدأ اللعبة ]'}
          </button>
        </div>

        <div className="absolute bottom-10 text-[9px] tracking-[0.2em] opacity-20">
          لا تعليمات. لا تراجع. فقط قراراتك.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 transition-opacity duration-2000">
        {state.currentScene?.imageUrl && (
          <img 
            src={state.currentScene.imageUrl} 
            className="w-full h-full object-cover opacity-30 grayscale cold-overlay"
            alt="Current Scene"
          />
        )}
        <div className="absolute inset-0 cold-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507] via-transparent to-[#050507]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          <p className="text-lg md:text-xl font-light text-zinc-400 font-amiri leading-relaxed opacity-90 transition-all duration-1000">
            {state.currentScene?.description}
          </p>
          
          <div className="h-px w-12 bg-zinc-800 mx-auto"></div>

          <p className="text-xl md:text-2xl text-zinc-100 font-amiri leading-snug italic tracking-wide">
            "{state.currentScene?.agentPrompt}"
          </p>
        </div>
      </div>

      <div className="relative z-10 p-12 flex flex-col items-center">
        <div className="max-w-xl w-full space-y-4">
          <input 
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAction(userInput)}
            placeholder="..."
            className="w-full bg-transparent border-b border-zinc-800 py-3 text-center text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-500 transition-colors font-amiri text-lg"
            disabled={isLoading}
            autoFocus
          />
          
          <div className="flex justify-center gap-12 text-[9px] tracking-[0.3em] text-zinc-700 uppercase pt-4">
            <div className="flex flex-col items-center gap-1">
              <span>المعنويات</span>
              <div className="w-16 h-0.5 bg-zinc-900 overflow-hidden">
                <div className="h-full bg-zinc-700 transition-all duration-1000" style={{ width: `${state.morale}%` }}></div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>القوة</span>
              <div className="w-16 h-0.5 bg-zinc-900 overflow-hidden">
                <div className="h-full bg-red-900/50 transition-all duration-1000" style={{ width: `${state.power}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay flicker">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
    </div>
  );
};

export default App;