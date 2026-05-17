import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Mic, Send, Volume2, Trash2 } from "lucide-react";
import "./styles.css";

// Vercel için port numarasını kaldırıp relative path (göreli yol) yaptık
const API_URL = "/api/chat";// Burayı birazdan gerçek backend linkinle değiştireceğiz
const STORAGE_KEY = "jarvismobile.onrender.com";

function App() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Hazir");
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canListen = useMemo(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), []);

  async function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean || busy) return;
    const nextMessages = [...messages, { role: "user", text: clean }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setStatus("Dusunuyor");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, memory: nextMessages })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Baglanti hatasi");
      const answer = data.text || "Cevap alinamadi.";
      setMessages([...nextMessages, { role: "assistant", text: answer }]);
      speak(answer);
      setStatus("Hazir");
    } catch (error) {
      setMessages([...nextMessages, { role: "assistant", text: `Hata: ${error.message}` }]);
      setStatus("Hata");
    } finally {
      setBusy(false);
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  function listen() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Mikrofon bu tarayicida desteklenmiyor");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setStatus("Dinliyor");
    recognition.onerror = () => setStatus("Ses alinamadi");
    recognition.onend = () => setStatus("Hazir");
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      if (text) sendMessage(text);
    };
    recognition.start();
  }

  function clearChat() {
    window.speechSynthesis?.cancel();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">JARVIS Mobile</p>
          <h1>Yanindayim.</h1>
        </div>
        <div className="status">{status}</div>
      </header>

      <section className="orb" aria-hidden="true">
        <div className="ring ringA" />
        <div className="ring ringB" />
        <div className="core" />
      </section>

      <section className="chat" aria-label="Sohbet">
        {messages.length === 0 && <p className="empty">Bir sey yaz veya mikrofona dokun.</p>}
        {messages.map((msg, index) => (
          <article className={`bubble ${msg.role}`} key={`${msg.role}-${index}`}>
            {msg.text}
          </article>
        ))}
        <div ref={bottomRef} />
      </section>

      <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
        <button type="button" className="iconButton" onClick={listen} disabled={!canListen || busy} title="Konus">
          <Mic size={20} />
        </button>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="JARVIS'e yaz..." />
        <button type="submit" className="iconButton primary" disabled={busy || !input.trim()} title="Gonder">
          <Send size={20} />
        </button>
        <button type="button" className="iconButton" onClick={() => messages.at(-1)?.text && speak(messages.at(-1).text)} title="Tekrar oku">
          <Volume2 size={20} />
        </button>
        <button type="button" className="iconButton" onClick={clearChat} title="Temizle">
          <Trash2 size={20} />
        </button>
      </form>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
