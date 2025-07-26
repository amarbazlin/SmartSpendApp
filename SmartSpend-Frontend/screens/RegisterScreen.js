// screens/AuthScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../services/supabase';

export default function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const validate = () => {
    if (!email || !password || (isRegistering && !name)) {
      Alert.alert('Please fill all required fields.');
      return false;
    }
    // basic email check
    const emailOk = /\S+@\S+\.\S+/.test(email);
    if (!emailOk) {
      Alert.alert('Enter a valid email.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      setBusy(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }, // store in auth.user.user_metadata
          emailRedirectTo: undefined, // you can set your deep link here
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          Alert.alert('Account already exists for this email.');
        } else {
          Alert.alert('Sign up failed', error.message);
        }
        return;
      }

      // Optional: also insert into your "user" table if you have one
      // Note: The table is often called "profiles" in Supabase quickstarts.
      // const { error: insertErr } = await supabase.from('user').insert({
      //   id: data.user.id,
      //   name,
      //   email,
      // });
      // if (insertErr) {
      //   console.log('Insert profile error:', insertErr.message);
      // }

      Alert.alert(
        'Check your inbox',
        'We sent you a confirmation email. Please verify and then log in.'
      );
      setIsRegistering(false);
    } catch (e) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      setBusy(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login failed', error.message);
        return;
      }
      // success -> App.js listener will switch to HomeScreen
    } catch (e) {
      Alert.alert('Login failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = () => {
    if (isRegistering) return handleRegister();
    return handleLogin();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <View style={styles.logo}>
              <Image
                source={require('./images/App_Logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoLabel}>SmartSpend</Text>
          </View>
        </View>

        <Text style={styles.title}>{isRegistering ? 'Register' : 'Login'}</Text>

        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, busy && { opacity: 0.6 }]}
          onPress={handleAction}
          disabled={busy}
        >
          <Text style={styles.buttonText}>
            {busy ? 'Please wait…' : isRegistering ? 'Register' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsRegistering(!isRegistering)}
          style={styles.switchLink}
          disabled={busy}
        >
          <Text style={styles.switchText}>
            {isRegistering
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 100,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    backgroundColor: 'white',
  },
  headerCenter: {
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoLabel: {
    fontSize: 19,
    fontWeight: '300',
    color: '#374151',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Roboto',
    marginBottom: 30,
    color: '#111827',
  },
  input: {
    height: 50,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  button: {
    backgroundColor: '#00B8A9',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  switchLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
});
