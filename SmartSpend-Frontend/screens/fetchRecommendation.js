// fetchRecommendation.js
import axios from 'axios';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

const AI_URL = 'http://10.3.1.173:5050';


export const getCurrentUserId = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user?.id || null;
};

export const fetchRecommendation = async () => {
  try {
    const uid = await getCurrentUserId();
    if (!uid) {
      Alert.alert('Please log in first.');
      return null;
    }

    // profile
    const { data: profile, error: pErr } = await supabase
      .from('users')
      .select('age, gender, employment, monthly_income')
      .eq('id', uid)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!profile?.age || !profile?.gender || !profile?.employment || !profile?.monthly_income) {
      Alert.alert('Profile incomplete', 'Please add age, gender, employment, and monthly income.');
      return null;
    }

    // user categories (only expense)
    const { data: cats, error: cErr } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', uid)
      .eq('type', 'expense');
    if (cErr) throw cErr;

    const categoryNames = (cats || []).map(c => c.name);

    // Optional: you can compute historical weights from this month’s expenses
    // and pass them as "historical_weights" to better split discretionary.
    // Here we skip (equal split).
    const body = {
      age: profile.age,
      income: profile.monthly_income,
      gender: profile.gender,
      employment: profile.employment,
      categories: categoryNames
      // historical_weights: { "Gym": 0.7, "CustomCat": 0.3 }
    };

    const res = await axios.post(`${AI_URL}/recommend`, body, { timeout: 15000 });
    const rec = res.data?.recommendation;

    if (!rec) {
      Alert.alert('AI error', 'No recommendation returned.');
      return null;
    }

    // Persist: update each category limit_ to LKR amount
    await Promise.all(Object.entries(rec).map(async ([name, amount]) => {
      await supabase
        .from('categories')
        .update({ limit_: Number(amount) })
        .eq('user_id', uid)
        .eq('name', name)
        .eq('type', 'expense');
    }));

    return rec;
  } catch (e) {
    console.log('fetchRecommendation error:', e);
    Alert.alert('Failed', e.message || 'Unknown error.');
    return null;
  }
};
