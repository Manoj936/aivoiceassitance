import { useEffect, useRef, useState } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

export default function VoiceAssistant() {
  const audioRef = useRef(null);
  const [userName, setUserName] = useState("Manoj");
  const [tone, setTone] = useState("flirty");

  // Use ref to track status value
  const statusRef = useRef("idle"); // idle | listening | processing

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("SpeechRecognition is not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      statusRef.current = "listening"; // Update statusRef directly
    };

    recognition.onend = () => {
      if (statusRef.current !== "processing") {
        statusRef.current = "idle"; // Update statusRef directly
      }
    };

    recognition.onresult = async (event) => {
      statusRef.current = "processing"; // Update statusRef directly
      const transcript = event.results[0][0].transcript;
      console.log("You said:", transcript);
      const geminiResponse = await callGemini(transcript);
      const reply = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Gemini said:", reply);
      if (reply) await speak(reply);
      statusRef.current = "idle"; // Update statusRef directly
    };
  }, [userName, tone]);

  const startRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  async function callGemini(text) {
    const instruction = `You are an AI Girlfriend of ${userName}, a tech-savvy person who loves coding. Reply in a short, ${tone} tone that can be spoken out loud with emotions.`;
    const body = {
      system_instruction: { parts: [{ text: instruction }] },
      contents: [{ parts: [{ text }] }],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    return await res.json();
  }

  async function speak(text) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "nova",
        input: text,
        instructions: `You are Niko, an AI girlfriend of ${userName}. Speak in a ${tone} tone with emotional expressions.`,
        response_format: "mp3",
      }),
    });

    const audioBlob = await res.blob();
    const url = URL.createObjectURL(audioBlob);
    if (audioRef.current) {
      audioRef.current.src = url;
      await audioRef.current.play();
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">🎙️ Talking with Niko...</h2>

      {/* User Name Input */}
      <input
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Enter your name"
        className="p-2 border rounded w-64"
      />

      {/* Tone Selector */}
      <select
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        className="p-2 border rounded w-64"
      >
        <option value="friendly">Friendly 🫂</option>
        <option value="flirty">Flirty 🫦</option>
        <option value="supportive">Supportive 🤗</option>
        <option value="funny">Funny 🤣</option>
        <option value="romantic">Romantic 😘</option>
        <option value="angry">Angry 😡</option>
      </select>

      {/* Mic Animation */}
      <div className="relative">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl transition-all duration-300
          ${statusRef.current === "listening" ? "bg-red-500 animate-pulse" : ""}
          ${statusRef.current === "processing" ? "bg-yellow-500 animate-ping" : ""}
          ${statusRef.current === "idle" ? "bg-gray-400" : ""}`}
        >
          🎤
        </div>
      </div>

      {/* Status Text */}
      <p className="text-lg font-medium capitalize">
        {statusRef.current === "idle" && "Click Start to speak"}
        {statusRef.current === "listening" && "Listening..."}
        {statusRef.current === "processing" && "Processing..."}
      </p>

      {/* Start Button */}
      <button
        onClick={startRecognition}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={statusRef.current === "listening" || statusRef.current === "processing"}
      >
        🎧 Start Talking
      </button>

      {/* Audio */}
      <audio ref={audioRef} id="audio" className="hidden" />
    </div>
  );
}
