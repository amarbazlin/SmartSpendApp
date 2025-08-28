// SmartSpend-Frontend/services/chatApi.js
import { supabase } from './supabase';

export async function askInvestAssistant({ messages, targetLang = 'English' }) {
  const { data, error } = await supabase.functions.invoke('chat-invest', {
    body: { messages, targetLang },
  });
  if (error) throw error;
  return data; // { message, suggestions, snapshot }
}
