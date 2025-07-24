import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';

export default function RegisterScreen({ onRegister, onLogin, onSwitchToLogin }) {
  const [isRegistering, setIsRegistering] = useState(true); // toggle between register and login
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAction = () => {
    if (!email || !password || (isRegistering && !name)) {
      Alert.alert('Please fill all required fields.');
      return;
    }

    if (isRegistering) {
      onRegister(name, email, password);
    } else {
      onLogin(email, password);
    }
  };

  return (
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
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleAction}>
        <Text style={styles.buttonText}>
          {isRegistering ? 'Register' : 'Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsRegistering(!isRegistering)}
        style={styles.switchLink}
      >
        <Text style={styles.switchText}>
          {isRegistering
            ? 'Already have an account? Login'
            : "Don't have an account? Register"}
        </Text>
      </TouchableOpacity>
    </View>
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
    marginBottom: 20,
    color: '#111827',
    marginBottom: 30
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
