import { useEffect, useRef, useState } from "react";
import { geminiContext, openAIcontext } from "../helper/commander";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

export default function VoiceAssistant() {
  const audioRef = useRef(null);
  const [userName, setUserName] = useState("Manoj");
  const [tone, setTone] = useState("supportive"); // friendly | supportive | funny | angry
  const [yourCommand, setYourCommand] = useState("");
  // Use ref to track status value
  const [status, setStatus] = useState("idle"); // idle | listening | processing

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
    recognition.lang = "en-IN"; // Set the language to English (India)

    recognition.onresult = async (event) => {
      setStatus("processing"); // Update statusRef directly
      const transcript = event.results[0][0].transcript;
      console.log("You said:", transcript);
      setYourCommand(transcript); // Set the command to state
      const geminiResponse = await callGemini(transcript);
      const reply = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Gemini said:", reply);
      if (reply) {
        await speak(reply);
      }
    };
  }, [userName, tone]);

  const startRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setStatus("listening"); // Update statusRef directly
    }
  };

  async function callGemini(text) {
    const instruction = geminiContext(userName, tone);
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
        voice: "onyx",
        input: text,
        instructions: openAIcontext(userName, tone),
        response_format: "mp3",
      }),
    });

    const audioBlob = await res.blob();
    const url = URL.createObjectURL(audioBlob);
    if (audioRef.current) {
      audioRef.current.src = url;
      await audioRef.current.play();
      setStatus("idle"); // Update statusRef directly
      setYourCommand(""); // Clear the command after speaking
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">
        Hey I am your coding assitant Mike 🎓
      </h2>

      {/* User Name Input */}
      <input
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Enter your name"
        className="p-2 border rounded w-64 bg-gray-800 font-bold"
      />

      {/* Tone Selector */}
      <select
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        className="p-2 border rounded w-64 text-white bg-gray-800 font-bold"
      >
        <option value="friendly">Friendly </option>

        <option value="supportive">Supportive </option>
        <option value="funny">Funny </option>

        <option value="angry">Angry </option>
      </select>

      {/* Mic Animation */}
      <div className="relative cursor-pointer">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl transition-all duration-300
          ${status === "listening" ? "bg-red-500 animate-pulse" : ""}
          ${status === "processing" ? "bg-yellow-500 animate-ping" : ""}
          ${status === "idle" ? "bg-gray-400" : ""}`}
        >
          🎤
        </div>
      </div>

      {/* Status Text */}
      <p className="text-lg font-medium capitalize">
        {status === "idle" && "Click Start to speak"}
        {status === "listening" && "Listening..."}
        {status === "processing" && "Processing..."}
      </p>

      {/* Start Button */}
      {status === "idle" && (
        <button
          onClick={startRecognition}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🗣️ Press to start talking
        </button>
      )}
      {yourCommand && (
        <p className="text-lg font-medium capitalize">
          You said: {yourCommand}
        </p>
      )}
      {/* Audio */}
      <audio ref={audioRef} id="audio" className="hidden" />
    </div>
  );
}
