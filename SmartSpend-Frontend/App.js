// App.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// initialize i18n once for the whole app (resolves ./i18n/index.js)
import './i18n';

import HomeScreen from './screens/HomeScreen';
import TransactionsScreen from './screens/TransactionScreen';
import RegisterScreen from './screens/RegisterScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import LanguageSettingsScreen from './screens/LanguageSettingsScreen';
import { supabase } from './services/supabase';

supabase.auth.getSession().then(({ data, error }) => {
  if (error) console.error('Supabase connection error:', error.message);
  else console.log('Supabase connected, session data:', data);
});

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        setBootLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (bootLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00B8A9" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="TransactionScreen" component={TransactionsScreen} />
            <Stack.Screen name="Chatbot" component={ChatbotScreen} />
            <Stack.Screen
              name="LanguageSettings"
              component={LanguageSettingsScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
          </>
        ) : (
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
