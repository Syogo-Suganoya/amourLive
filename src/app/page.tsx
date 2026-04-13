"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Home as HomeIcon, 
  Send, 
  Settings, 
  ChevronLeft,
  Heart,
  ShieldCheck,
  Smartphone,
  Calendar
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type State = {
  affection: number;
  trust: number;
  relationshipStage: string;
  flags: Record<string, any>;
};

type Character = {
  id: string;
  name: string;
  location: string;
  personality: any;
};

const CHARACTER_IMAGE_MAP: Record<string, { folder: string; ext: string }> = {
  heroine_01: { folder: "misaki", ext: "jpg" },
  heroine_02: { folder: "akari", ext: "png" },
  heroine_03: { folder: "sion", ext: "png" },
  // 昭和
  heroine_sh_01: { folder: "sachiko", ext: "png" },
  heroine_sh_02: { folder: "kumiko", ext: "png" },
  heroine_sh_03: { folder: "akiko", ext: "png" },
  // 江戸
  heroine_ed_01: { folder: "okatsu", ext: "png" },
  heroine_ed_02: { folder: "yugiri", ext: "png" },
  heroine_ed_03: { folder: "ogin", ext: "png" },
  // 平安
  heroine_he_01: { folder: "fujino", ext: "png" },
  heroine_he_02: { folder: "tsukuyomi", ext: "png" },
  heroine_he_03: { folder: "seisho", ext: "png" },
};

const ERA_CONFIG: Record<string, {
  label: string;
  locations: string[];
  locationLabels: Record<string, string>;
  contactLabel: string;
  messagingLabel: string;
  contactIcon: any;
}> = {
  modern: {
    label: "現代",
    locations: ["cafe", "park", "library"],
    locationLabels: { cafe: "街角のカフェ", park: "セントラルパーク", library: "公立図書館" },
    contactLabel: "連絡先リスト",
    messagingLabel: "LIME",
    contactIcon: Smartphone,
  },
  showa: {
    label: "昭和",
    locations: ["kissaten", "school", "shopping_street"],
    locationLabels: { kissaten: "純喫茶ひだまり", school: "放課後の学校", shopping_street: "夕暮れの商店街" },
    contactLabel: "連絡先帳",
    messagingLabel: "伝言",
    contactIcon: Smartphone,
  },
  edo: {
    label: "江戸時代",
    locations: ["chaya", "yokochou", "temple"],
    locationLabels: { chaya: "峠の茶屋", yokochou: "夜の横丁", temple: "静かな古寺" },
    contactLabel: "交友録",
    messagingLabel: "文",
    contactIcon: Send,
  },
  heian: {
    label: "平安時代",
    locations: ["garden", "miko", "palace"],
    locationLabels: { garden: "寝殿の庭園", miko: "神秘的な社", palace: "平安の宮中" },
    contactLabel: "文箱",
    messagingLabel: "御文",
    contactIcon: Send,
  }
};

// --- Sub-components ---

const TypingText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 30); // タイピング速度
      return () => clearTimeout(timeout);
    } else if (onComplete && text.length > 0) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <span className="vn-text">{displayedText}</span>;
};

const CustomProgressBar = ({ value, color, icon: Icon, label }: { value: number, color: string, icon: any, label: string }) => (
  <div className="vn-status-item">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: color }}>{value}</span>
    </div>
    <div className="progress-bar" style={{ marginBottom: 0 }}>
      <motion.div 
        className="progress-fill" 
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  </div>
);

// --- Main App ---

export default function Home() {
  const [view, setView] = useState<"auth" | "title" | "map" | "chat">("auth");
  const [selectedEra, setSelectedEra] = useState<string>("modern");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; name: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authForm, setAuthForm] = useState({ loginId: "", password: "", name: "" });
  const [authError, setAuthError] = useState("");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({
    affection: 0,
    trust: 0,
    relationshipStage: "stranger",
    flags: {},
  });
  const [emotion, setEmotion] = useState("normal");
  const [isLoading, setIsLoading] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isTrialLimitReached, setIsTrialLimitReached] = useState(false);
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  
  const activeCharacter = Array.isArray(characters) ? characters.find(c => c.id === activeCharacterId) : null;
  
  useEffect(() => {
    const savedKey = localStorage.getItem("amour_live_api_key");
    if (savedKey) setApiKey(savedKey);

    const savedUser = localStorage.getItem("amour_live_user");
    if (savedUser) {
      setLoggedInUser(JSON.parse(savedUser));
      setView("title");
    }
  }, []);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem("amour_live_user", JSON.stringify(loggedInUser));
      fetchCharacters();
    } else {
      localStorage.removeItem("amour_live_user");
    }
  }, [loggedInUser]);

  const fetchCharacters = async () => {
    if (!loggedInUser) return;
    try {
      const res = await fetch(`/api/characters?userId=${loggedInUser.id}&isDebug=${isDebugMode}&era=${selectedEra}`);
      const data = await res.json();
      if (Array.isArray(data)) setCharacters(data);
    } catch (err) {
      console.error("Failed to fetch characters:", err);
    }
  };

  useEffect(() => {
    if (apiKey) localStorage.setItem("amour_live_api_key", apiKey);
  }, [apiKey]);

  const handleVisitLocation = async (location: string) => {
    if (!loggedInUser) return;
    setIsLoading(true);
    setCurrentLocation(location);
    setView("chat");
    setIsPhoneMode(false);

    try {
      const res = await fetch(`/api/init?location=${location}&userId=${loggedInUser.id}`);
      const data = await res.json();
      
      if (!data.characterFound) {
        // 誰もいない場合
        setMessages([{ role: "assistant", content: "今は誰もいないようだ..." }]);
        setActiveCharacterId(null);
        setState({ affection: 0, trust: 0, relationshipStage: "stranger", flags: {} });
        setIsTypingComplete(true);
      } else {
        const logs = data.logs || [];
        const charState = data.state || { affection: 0, trust: 0, relationshipStage: "stranger", flags: "{}" };
        const parsedFlags = typeof charState.flags === 'string' 
          ? JSON.parse(charState.flags) 
          : charState.flags || {};

        setActiveCharacterId(data.characterId);
        
        if (parsedFlags.isBlocked) {
          setMessages([{ role: "assistant", content: `（あ、${data.name}さんだ...。気まずいな、何か酷いことをしてしまった気がする...）` }]);
        } else {
          setMessages(logs);
        }
        
        setState({ ...charState, flags: parsedFlags });
        setEmotion("normal");
        setIsTypingComplete(false);

        if (logs.length === 0) {
          await triggerGreeting(data.characterId, false);
        }
      }
    } catch (err) {
      console.error("Failed to visit location:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneContact = async (characterId: string) => {
    if (!loggedInUser) return;
    setIsLoading(true);
    setShowContacts(false);
    setView("chat");
    setIsPhoneMode(true);
    setActiveCharacterId(characterId);

    try {
      const res = await fetch(`/api/init?characterId=${characterId}&userId=${loggedInUser.id}`);
      const data = await res.json();
      
      const logs = data.logs || [];
      const charState = data.state || { affection: 0, trust: 0, relationshipStage: "stranger", flags: "{}" };
      
      setMessages(logs);
      const parsedFlags = typeof charState.flags === 'string' 
        ? JSON.parse(charState.flags) 
        : charState.flags || {};
      setState({ ...charState, flags: parsedFlags });
      setEmotion("normal");
      setIsTypingComplete(false);

      if (logs.length === 0) {
        await triggerGreeting(characterId, true);
      }
    } catch (err) {
      console.error("Failed to start phone contact:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGreeting = async (characterId: string, isPhone: boolean = false) => {
    if (!loggedInUser) return;
    try {
      const instruction = isPhone 
        ? "（あなたは今、相手からメッセージを受け取りました。返信として最初の挨拶を送ってください）"
        : "（あなたは今、この場所でユーザーと出会いました。最初の挨拶をしてください）";
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: instruction,
          characterId,
          userId: loggedInUser.id,
          isDebug: isDebugMode,
          apiKey,
          systemInstructions: isPhone ? `【重要】${currentEraConfig.messagingLabel}での会話です。当時の時代背景にふさわしい、情緒ある短いメッセージ形式で返信して。` : ""
        }),
      });
      const data = await res.json();
      
      if (data.dialogue) {
        setMessages([{ role: "assistant", content: data.dialogue }]);
        setEmotion(data.emotion);
        setState(data.newState);
      } else if (data.error === 'TRIAL_LIMIT_EXCEEDED') {
        setIsTrialLimitReached(true);
      }
    } catch (err) {
      console.error("Greeting error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeCharacterId) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setIsTypingComplete(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage, 
          characterId: activeCharacterId,
          userId: loggedInUser?.id,
          isDebug: isDebugMode,
          apiKey,
          systemInstructions: isPhoneMode ? `【重要】${currentEraConfig.messagingLabel}での会話です。当時の時代背景にふさわしい、情緒ある短いメッセージ形式で返信して。` : ""
        }),
      });
      const data = await res.json();

      if (data.dialogue) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.dialogue },
        ]);
        setEmotion(data.emotion);
        setState(data.newState);
      } else if (data.error === 'TRIAL_LIMIT_EXCEEDED') {
        setIsTrialLimitReached(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (type: 'affection' | 'trust', delta: number) => {
    if (!activeCharacterId || !loggedInUser) return;
    try {
      const res = await fetch("/api/action/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          characterId: activeCharacterId, 
          userId: loggedInUser.id,
          type, 
          delta 
        }),
      });
      const data = await res.json();
      if (data.success) setState(data.newState);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "stranger": return "初対面";
      case "acquaintance": return "知人";
      case "friend": return "友人";
      case "lover": return "恋人";
      default: return stage;
    }
  };

  const currentEraConfig = ERA_CONFIG[selectedEra] || ERA_CONFIG.modern;
  const characterImgConfig = CHARACTER_IMAGE_MAP[activeCharacter?.id || ""] || { folder: "misaki", ext: "jpg" };
  const portraitUrl = `/images/${characterImgConfig.folder}/${emotion}.${characterImgConfig.ext}`;
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant")?.content || "";

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {view === "auth" && (
          <motion.main 
            key="auth"
            className="title-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="title-content premium-panel" style={{ maxWidth: '400px' }}>
              <h1 className="title-logo" style={{ fontSize: '2.5rem' }}>AmourLive</h1>
              <div className="auth-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
                <button 
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  style={{ opacity: authMode === "login" ? 1 : 0.5, borderBottom: authMode === "login" ? '2px solid var(--primary-pink)' : 'none' }}
                >
                  ログイン
                </button>
                <button 
                  onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                  style={{ opacity: authMode === "signup" ? 1 : 0.5, borderBottom: authMode === "signup" ? '2px solid var(--primary-pink)' : 'none' }}
                >
                  新規登録
                </button>
              </div>

              <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {authMode === "signup" && (
                  <div className="input-group">
                    <label>ユーザー名</label>
                    <input 
                      type="text" 
                      value={authForm.name} 
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    />
                  </div>
                )}
                <div className="input-group">
                  <label>ログインID</label>
                  <input 
                    type="text" 
                    value={authForm.loginId} 
                    onChange={(e) => setAuthForm({ ...authForm, loginId: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>パスワード</label>
                  <input 
                    type="password" 
                    value={authForm.password} 
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>
                
                {authError && <p style={{ color: '#ff5252', fontSize: '0.8rem' }}>{authError}</p>}

                <button 
                  className="start-button" 
                  style={{ marginTop: '10px' }}
                  onClick={async () => {
                    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
                    try {
                      const res = await fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(authForm)
                      });
                      const data = await res.json();
                      if (data.success) {
                        setLoggedInUser(data.user);
                        setView("title");
                      } else {
                        setAuthError(data.error || "Authentication failed");
                      }
                    } catch (err) {
                      setAuthError("Server connection failed");
                    }
                  }}
                >
                  {authMode === "login" ? "ログイン" : "登録する"}
                </button>
              </div>
            </div>
          </motion.main>
        )}

        {view === "title" && (
          <motion.main 
            key="title"
            className="title-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
          >
            <div className="title-content premium-panel">
              <motion.h1 
                className="title-logo"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                AmourLive
              </motion.h1>
              <p className="title-tagline">AIと紡ぐ、あなただけの恋物語</p>
              
              <div className="settings-section">
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={14} /> Gemini API Key
                  </label>
                  <input 
                    type="password" 
                    placeholder={apiKey ? "********" : "体験版としてプレイ中..."}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (e.target.value) setIsTrialLimitReached(false);
                    }}
                  />
                </div>
                {!apiKey && (
                  <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>
                    ※APIキー未入力の場合、各キャラ15回までの体験版となります
                  </p>
                )}
                
                <div className="era-selection" style={{ margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                  <label style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '10px', display: 'block' }}>プレイする時代を選択</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {Object.entries(ERA_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedEra(key)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          background: selectedEra === key ? 'var(--primary-pink)' : 'rgba(255,255,255,0.05)',
                          border: selectedEra === key ? '1px solid var(--primary-pink)' : '1px solid rgba(255,255,255,0.2)',
                          color: 'white',
                          transition: 'all 0.3s'
                        }}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="toggle-group">
                  <span>デバックモード</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={isDebugMode} 
                      onChange={(e) => setIsDebugMode(e.target.checked)} 
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <motion.button 
                className="start-button" 
                onClick={() => setView("map")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                PLAY START
              </motion.button>
              
              <button 
                style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.6, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                onClick={() => { setLoggedInUser(null); setView("auth"); }}
              >
                ログアウト ({loggedInUser?.name})
              </button>
            </div>
          </motion.main>
        )}

        {view === "map" && (
          <motion.main 
            key="map"
            className="map-container"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
          >
            <header className="map-header">
              <motion.h1 
                className="map-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                次はどこへ行く？
              </motion.h1>
              <motion.p 
                className="map-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                放課後のひととき、誰に出会えるでしょうか
              </motion.p>
              
              <motion.button 
                className="home-action-button" 
                onClick={async () => {
                  if (!loggedInUser) return;
                  setIsLoading(true);
                  try {
                    await fetch(`/api/action/home?userId=${loggedInUser.id}`, { method: "POST" });
                    await fetchCharacters();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
              >
                <HomeIcon size={18} style={{ marginRight: '8px' }} /> 今日はもう帰る
              </motion.button>
              
              <motion.button 
                className="smartphone-button"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowContacts(true)}
              >
                <currentEraConfig.contactIcon size={24} color="var(--primary-pink)" />
              </motion.button>
            </header>

            <motion.div 
              className="map-grid"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              initial="hidden"
              animate="show"
            >
              {currentEraConfig.locations.map((loc) => {
                return (
                  <motion.div 
                    key={loc} 
                    className="location-card premium-panel"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => handleVisitLocation(loc)}
                    style={{ 
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('/images/locations/${selectedEra}/${loc}.png')`,
                      backgroundSize: 'cover',
                      cursor: 'pointer',
                      border: 'none',
                      color: 'white',
                      minHeight: '200px'
                    }}
                  >
                    <div className="location-info" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <MapPin size={16} />
                        <h2 className="location-name" style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>{LOCATION_LABELS[loc]}</h2>
                      </div>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>様子を見に行く</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            
            <AnimatePresence>
              {showContacts && (
                <motion.div 
                  className="contacts-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowContacts(false)}
                >
                  <motion.div 
                    className="contacts-modal premium-panel"
                    initial={{ y: 100, scale: 0.9 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 100, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-header">
                      <h3>{currentEraConfig.contactLabel}</h3>
                      <button className="close-btn" onClick={() => setShowContacts(false)}>×</button>
                    </div>
                    <div className="contact-list">
                      {characters.filter(c => {
                        return c.state?.hasContact === true && !c.state?.isBlocked;
                      }).map((char) => (
                        <div key={char.id} className="contact-item" onClick={() => handlePhoneContact(char.id)}>
                          <div className="contact-avatar">
                            {char.name[0]}
                          </div>
                          <div className="contact-info">
                            <span className="contact-name">{char.name}</span>
                            <span className="contact-status">{selectedEra === 'modern' || selectedEra === 'showa' ? 'オンライン' : '在宅'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {characters.filter(c => c.state?.hasContact).length === 0 && (
                      <p style={{ textAlign: 'center', opacity: 0.5, padding: '20px', color: '#666' }}>
                        登録されている連絡先はありません
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button className="back-to-title" onClick={() => setView("title")}>
              タイトル画面へ
            </button>
          </motion.main>
        )}

        {view === "chat" && (
          <motion.main 
            key="chat"
            className="vn-container"
            style={{ backgroundImage: `url('/images/locations/${selectedEra}/${activeCharacter?.location || currentEraConfig.locations[0]}.png')` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Character Portrait */}
            <div className="vn-character-container">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`${activeCharacterId}-${emotion}`}
                  src={portraitUrl}
                  alt={activeCharacter?.name}
                  className="vn-character-img"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: [1, 1.01, 1],
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    animate: { duration: 0.5 },
                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                  }}
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.jp/24/fce4ec/ffffff/400x800.png?text=${activeCharacter?.name}`;
                  }}
                />
              </AnimatePresence>
            </div>

            {/* Status Bars Overlay */}
            <div className="vn-status-overlay">
              {isDebugMode && (
                <>
                  <CustomProgressBar 
                    label="好感度" 
                    value={state.affection} 
                    color="var(--primary-pink)" 
                    icon={Heart} 
                  />
                  <CustomProgressBar 
                    label="信頼度" 
                    value={state.trust} 
                    color="#4db6ac" 
                    icon={ShieldCheck} 
                  />
                  <div className="status-controls premium-panel" style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleUpdateStatus('affection', 5)}>+5</button>
                    <button onClick={() => handleUpdateStatus('trust', 5)}>+5</button>
                  </div>
                </>
              )}
              
              <div className="collection-area">
                <div className="badge-list">
                  {state.flags.hasContact && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="badge contact-badge">
                      <Smartphone size={12} /> Contact
                    </motion.span>
                  )}
                  {state.flags.vowDate && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="badge date-badge">
                      <Calendar size={12} /> Plan
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* Message Window / Smartphone Messaging UI */}
            {isPhoneMode ? (
              <div className="messaging-ui-root" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#e7f0ff' }}>
                <div className="messaging-header" style={{ background: '#35495e', color: 'white', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button onClick={async () => {
                    // ターン消費
                    try {
                      await fetch(`/api/action/home?userId=${loggedInUser?.id}`, { method: "POST" });
                      await fetchCharacters();
                    } catch (e) {}
                    setView("map");
                  }} style={{ color: 'white' }}><ChevronLeft /></button>
                  <span style={{ fontWeight: 700 }}>{activeCharacter?.name}（{currentEraConfig.messagingLabel}）</span>
                </div>
                <div className="messaging-body" style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {[...messages].map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{ 
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.role === 'user' ? '#85e249' : 'white',
                        padding: '10px 15px',
                        borderRadius: '15px',
                        maxWidth: '80%',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        color: 'black',
                        position: 'relative'
                      }}
                    >
                      {msg.content}
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div style={{ alignSelf: 'flex-start', padding: '10px' }}>...</div>
                  )}
                </div>
              </div>
            ) : (
              <motion.div 
                className="vn-message-window"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="vn-name-tag">{activeCharacter?.name || "???"}</div>
                <div className="vn-text-box" style={{ overflowY: 'auto', flex: 1 }}>
                  {activeCharacterId ? (
                    lastAssistantMessage ? (
                      <TypingText 
                        key={lastAssistantMessage} 
                        text={lastAssistantMessage} 
                        onComplete={() => setIsTypingComplete(true)} 
                      />
                    ) : (
                      <p className="vn-text" style={{ opacity: 0.5 }}>...</p>
                    )
                  ) : (
                    <TypingText text={messages[0]?.content || ""} onComplete={() => setIsTypingComplete(true)} />
                  )}
                  {isLoading && <span className="vn-text" style={{ opacity: 0.5 }}>...</span>}
                </div>
                
                <div className="vn-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{activeCharacterId ? `関係: ${getStageLabel(state.relationshipStage)}` : "探索中"}</span>
                  <button 
                    onClick={() => {
                      if (!activeCharacterId) {
                        setView("map");
                      } else {
                        setView("map");
                      }
                    }} 
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={14} /> 立ち去る
                  </button>
                </div>
              </motion.div>
            )}

            {/* Input Overlay */}
            <motion.div 
              className="vn-input-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: isTypingComplete ? 1 : 0 }}
              style={{ pointerEvents: isTypingComplete ? 'auto' : 'none' }}
            >
              <form className="flex items-center gap-2" onSubmit={handleSubmit} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  className="vn-chat-input"
                  placeholder={isTrialLimitReached ? "体験版の制限に達しました" : "何て答える？"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || isTrialLimitReached}
                />
                <button 
                  type="submit" 
                  className="send-button" 
                  disabled={isLoading || !input.trim() || isTrialLimitReached}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', padding: '10px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Send size={18} />
                </button>
              </form>
              {isTrialLimitReached && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ 
                    position: 'absolute', 
                    top: '-60px', 
                    left: '0', 
                    right: '0', 
                    background: 'rgba(255, 82, 82, 0.9)', 
                    color: 'white', 
                    padding: '8px 15px', 
                    borderRadius: '8px', 
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  体験版の制限に達しました。継続するにはタイトル画面でAPIキーを入力してください。
                </motion.div>
              )}
            </motion.div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
