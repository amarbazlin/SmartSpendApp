// SmartSpend-Frontend/services/chatApi.js
import { Platform } from "react-native";
import { supabase } from "./supabase";  // <-- make sure this import exists

// Backend URL priority:
// 1. Take from .env (EXPO_PUBLIC_BACKEND_URL)
// 2. Emulator localhost (10.0.2.2 for Android, localhost for iOS)
// 3. LAN IP fallback (manual override for physical device)
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5050"
    : "http://localhost:5050") ||
  "http://172.20.10.4:5050"; // adjust if LAN testing on real device

export async function askInvestAssistant({ messages, targetLang, grounding }) {
  try {
    // ✅ always get logged in user id from Supabase
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("No logged in user. Please log in.");

    const latestMessage = messages[messages.length - 1]?.content || "";

    const res = await fetch(`${BACKEND_URL}/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,       // ✅ pass real Supabase user id
        message: latestMessage, // user’s actual message
        grounding,
        targetLang,
      }),
    });

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);

    return await res.json(); // { message, grounding_used, ... }
  } catch (err) {
    console.error("askInvestAssistant error:", err);
    throw err;
  }
}
