import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    // Navigate to login/register screen
  };

  return (
    <HomeScreen onLogout={handleLogout} />
  );
}