"use client";

import { useState, useEffect, useRef } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type State = {
  affection: number;
  trust: number;
  relationshipStage: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({
    affection: 0,
    trust: 0,
    relationshipStage: "stranger",
  });
  const [emotion, setEmotion] = useState("normal");
  const [isLoading, setIsLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // 初期化: ステータスと履歴を取得
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/init");
        const data = await res.json();
        if (data.logs) setMessages(data.logs);
        if (data.state) setState(data.state);
      } catch (err) {
        console.error("Failed to initialize:", err);
      }
    }
    init();
  }, []);

  // 新規メッセージ時に自動スクロール
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      if (data.dialogue) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.dialogue },
        ]);
        setEmotion(data.emotion);
        setState(data.newState);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 関係性の表示用ラベル
  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "stranger": return "初対面";
      case "acquaintance": return "知人";
      case "friend": return "友人";
      case "lover": return "恋人";
      default: return stage;
    }
  };

  return (
    <main className="chat-container">
      {/* キャラクター・ステータスエリア */}
      <section className="character-area">
        <div className="portrait-wrapper premium-panel">
          {/* 画像は public/images/misaki/[emotion].png に保存されている前提 */}
          <img
            src={`/images/misaki/${emotion}.png`}
            alt="Misaki"
            className="portrait-image"
            onError={(e) => {
              // 画像がない場合のフォールバック（デモ表示用）
              e.currentTarget.src = "https://placehold.jp/24/fce4ec/ffffff/400x800.png?text=Misaki";
            }}
          />
        </div>

        <div className="status-card premium-panel">
          <div className="status-label">現在の関係: {getStageLabel(state.relationshipStage)}</div>
          
          <div className="status-label">好感度 ({state.affection})</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, state.affection)}%`, background: '#ff80ab' }}
            ></div>
          </div>

          <div className="status-label">信頼度 ({state.trust})</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, state.trust)}%`, background: '#4db6ac' }}
            ></div>
          </div>
        </div>
      </section>

      {/* チャットエリア */}
      <section className="chat-area">
        <div className="message-log premium-panel" ref={logRef}>
          {messages.length === 0 && (
            <div className="message assistant">
              美咲さんに話しかけてみましょう。
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.content}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant" style={{ opacity: 0.6 }}>
              ......入力中
            </div>
          )}
        </div>

        <form className="input-area premium-panel" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder="メッセージを入力してください..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={isLoading}>
            送信
          </button>
        </form>
      </section>
    </main>
  );
}
