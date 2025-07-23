import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import { supabase } from './services/supabase';
import 'react-native-url-polyfill/auto';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserExist = async () => {
      const { data, error } = await supabase.from('users').select('*');

      if (error) {
        console.error("Error checking users:", error.message || error);
        setShowLogin(false);
      } else {
        setShowLogin(data.length > 0);
      }

      setLoading(false);
    };

    checkUserExist();
  }, []);

  const handleRegister = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      console.log("❌ Registration error:", error.message);
      alert(error.message);
      return;
    } else {
      console.log("✅ Registration successful:", data);
    }

    const userId = data?.user?.id;

    const { error: insertError } = await supabase
      .from('users')
      .insert([{ id: userId, name, email }]);
  };

  const handleLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("❌ Login error:", error.message);
      alert("Invalid email or password");
    } else {
      console.log("✅ Login successful:", data);
      alert("Logged in successfully!");
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowLogin(true);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00B8A9" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <HomeScreen onLogout={handleLogout} />
      ) : (
        <RegisterScreen
          onRegister={handleRegister}
          onLogin={handleLogin}
          onSwitchToLogin={() => {}}
        />
      )}
    </NavigationContainer>
  );
}
