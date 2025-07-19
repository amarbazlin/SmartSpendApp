import React, { useState } from 'react';
import { 
  Home, 
  Menu, 
  Wallet, 
  Target, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Search, 
  PiggyBank, 
  CreditCard, 
  Eye, 
  CheckCircle,
  Lock,
  User,
  Mail,
  ArrowLeft,
  X,
  Bell,
  Palette,
  Globe,
  LogOut,
  Settings
} from 'lucide-react';

// Login Screen Component
const LoginScreen = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email && password) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#00B8A9'}}>
            <img 
              src="/api/placeholder/96/96" 
              alt="SmartSpend Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SmartSpend</h1>
          <p className="text-gray-600 mt-2">Welcome back!</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Login</h2>
          
          <div className="space-y-4">
            <div className="relative">
              <Mail size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: '#00B8A9'}}
              />
            </div>
            
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: '#00B8A9'}}
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full text-white py-4 rounded-2xl font-semibold mt-6 hover:opacity-90 transition-all"
            style={{backgroundColor: '#00B8A9'}}
          >
            Login
          </button>

          <div className="text-center mt-6">
            <button
              onClick={onSwitchToRegister}
              className="font-medium"
              style={{color: '#00B8A9'}}
            >
              Don't have an account? Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Registration Screen Component
const RegisterScreen = ({ onRegister, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = () => {
    if (name && email && password && password === confirmPassword) {
      onRegister();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#00B8A9'}}>
            <img 
              src="/api/placeholder/96/96" 
              alt="SmartSpend Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SmartSpend</h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Register</h2>
          
          <div className="space-y-4">
            <div className="relative">
              <User size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: '#00B8A9'}}
              />
            </div>
            
            <div className="relative">
              <Mail size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: '#00B8A9'}}
              />
            </div>
            
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: '#00B8A9'}}
              />
            </div>
            
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: '#00B8A9'}}
              />
            </div>
          </div>

          <button
            onClick={handleRegister}
            className="w-full text-white py-4 rounded-2xl font-semibold mt-6 hover:opacity-90 transition-all"
            style={{backgroundColor: '#00B8A9'}}
          >
            Register
          </button>

          <div className="text-center mt-6">
            <button
              onClick={onSwitchToLogin}
              className="font-medium"
              style={{color: '#00B8A9'}}
            >
              Already have an account? Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Categories Component (placeholder)
const Categories = ({ onBack }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white p-4 flex items-center">
      <button onClick={onBack} className="mr-4">
        <ArrowLeft size={24} color="#374151" />
      </button>
      <h1 className="text-xl font-semibold">Categories</h1>
    </div>
    <div className="p-4">
      <p className="text-gray-600">Categories content goes here...</p>
    </div>
  </div>
);

// Side Menu Component
const SideMenu = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Menu */}
      <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
        <div className="p-6">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mr-3" style={{backgroundColor: '#00B8A9'}}>
                <img 
                  src="/api/placeholder/48/48" 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">John Doe</h3>
                <p className="text-sm text-gray-600">john@example.com</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2">
              <X size={20} color="#6B7280" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Passcode Setting */}
            <div className="flex items-center py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <Lock size={20} color="#6B7280" className="mr-4" />
              <div>
                <p className="font-medium text-gray-800">Passcode</p>
                <p className="text-sm text-gray-500">OFF</p>
              </div>
            </div>

            {/* Main Currency Setting */}
            <div className="flex items-center py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <DollarSign size={20} color="#6B7280" className="mr-4" />
              <div>
                <p className="font-medium text-gray-800">Main Currency Setting</p>
                <p className="text-sm text-gray-500">LKR(Rs.)</p>
              </div>
            </div>

            {/* Sub Currency Setting */}
            <div className="flex items-center py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <Wallet size={20} color="#6B7280" className="mr-4" />
              <div>
                <p className="font-medium text-gray-800">Sub Currency Setting</p>
              </div>
            </div>

            {/* Alarm Setting */}
            <div className="flex items-center py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <Bell size={20} color="#6B7280" className="mr-4" />
              <div>
                <p className="font-medium text-gray-800">Alarm Setting</p>
              </div>
            </div>

            {/* Style */}
            <div className="flex items-center py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <Palette size={20} color="#6B7280" className="mr-4" />
              <div>
                <p className="font-medium text-gray-800">Style</p>
              </div>
            </div>

            {/* Language Setting */}
            <div className="flex items-center py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <Globe size={20} color="#6B7280" className="mr-4" />
              <div>
                <p className="font-medium text-gray-800">Language Setting</p>
              </div>
            </div>

            {/* Logout */}
            <div 
              className="flex items-center py-4 px-2 hover:bg-red-50 rounded-lg cursor-pointer mt-8"
              onClick={onLogout}
            >
              <LogOut size={20} color="#EF4444" className="mr-4" />
              <div>
                <p className="font-medium text-red-500">Logout</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Home Screen Component
const HomeScreen = ({ onLogout }) => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigateToCategories = () => {
    console.log('Reaches')
    setCurrentScreen('categories');
  };

  const navigateToHome = () => {
    setCurrentScreen('home');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  const handleClick = () => {
    // Handle add income click
    console.log('Add Income clicked');
  };

  if (currentScreen === 'categories') {
    return <Categories onBack={navigateToHome} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between">
          <button onClick={toggleMenu}>
            <Menu size={24} color="#374151" />
          </button>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{backgroundColor: '#00B8A9'}}>
              <img 
                src="/api/placeholder/48/48" 
                alt="SmartSpend Logo" 
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <span className="text-sm font-semibold text-gray-800">SmartSpend</span>
          </div>
          <div className="w-6"></div>
        </div>

        {/* Search Bar */}
        <div className="bg-white px-4 pb-3">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-3">
            <Search size={20} color="#9CA3AF" className="mr-3" />
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent text-gray-700 placeholder-gray-500 outline-none"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Income & Expense Buttons */}
          <div className="flex gap-4">
            <button onClick={handleClick} className="flex-1 text-white py-4 rounded-full font-semibold" style={{backgroundColor: '#00B8A9'}}>
              + Add Income
            </button>
            <button className="flex-1 bg-red-400 text-white py-4 rounded-full font-semibold">
              + Add Expense
            </button>
          </div>

          {/* Balance Card */}
          <div className="rounded-3xl p-6 text-white" style={{backgroundColor: '#00B8A9'}}>
            <div className="flex justify-between mb-6">
              <div>
                <div className="flex items-center mb-2">
                  <BarChart3 size={16} className="mr-2" />
                  <span className="text-sm opacity-90">Total Balance</span>
                </div>
                <div className="text-3xl font-bold">$7,783.00</div>
              </div>
              <div className="text-right">
                <div className="flex items-center mb-2">
                  <Eye size={16} className="mr-2" />
                  <span className="text-sm opacity-90">Total Expense</span>
                </div>
                <div className="text-2xl font-bold text-red-200">-$1,187.40</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="bg-black bg-opacity-20 rounded-full h-10 relative flex items-center">
                <div className="bg-black rounded-full h-10 w-3/10 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">30%</span>
                </div>
                <span className="absolute right-4 text-sm font-semibold">$20,000.00</span>
              </div>
            </div>
            
            <div className="flex items-center">
              <CheckCircle size={16} className="mr-2" />
              <span className="text-sm">30% Of Your Expenses, Looks Good.</span>
            </div>
          </div>

          {/* Feature Shortcuts */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={navigateToCategories} className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{backgroundColor: 'rgba(0, 184, 169, 0.15)'}}>
                <BarChart3 size={32} style={{color: '#00B8A9'}} />
              </div>
              <span className="text-sm text-gray-600 text-center font-medium">Personalized Budgeting</span>
            </button>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <PiggyBank size={32} color="#2563EB" />
              </div>
              <span className="text-sm text-gray-600 text-center font-medium">Expense Analysis</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Target size={32} color="#4B5563" />
              </div>
              <span className="text-sm text-gray-600 text-center font-medium">Investment Advice</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-3">
                <DollarSign size={32} color="#DB2777" />
              </div>
              <span className="text-sm text-gray-600 text-center font-medium">Smart Alerts</span>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transaction</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center mr-3">
                    <CreditCard size={20} color="#D97706" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Deposit from account</p>
                    <p className="text-sm text-gray-500">28 January 2021</p>
                  </div>
                </div>
                <span className="text-red-500 font-semibold">-$850</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold text-lg">P</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Deposit Paypal</p>
                    <p className="text-sm text-gray-500">25 January 2021</p>
                  </div>
                </div>
                <span style={{color: '#00B8A9'}} className="font-semibold">+$2,500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="px-4 py-4" style={{backgroundColor: '#00B8A9'}}>
          <div className="flex justify-around">
            <div className="flex flex-col items-center">
              <Home size={24} color="white" />
              <span className="text-white text-xs mt-1">Home</span>
            </div>
            <div className="flex flex-col items-center opacity-70">
              <DollarSign size={24} color="white" />
              <span className="text-white text-xs mt-1">Accounts</span>
            </div>
            <div className="flex flex-col items-center opacity-70">
              <Target size={24} color="white" />
              <span className="text-white text-xs mt-1">Goals</span>
            </div>
            <div className="flex flex-col items-center opacity-70">
              <BarChart3 size={24} color="white" />
              <span className="text-white text-xs mt-1">Stats</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Menu */}
      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={closeMenu} 
        onLogout={handleLogout} 
      />
    </div>
  );
};

// Main App Component
export default function SmartSpendApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleRegister = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowLogin(false); // Changed from true to false to show register screen
  };

  const switchToLogin = () => {
    setShowLogin(true);
  };

  const switchToRegister = () => {
    setShowLogin(false);
  };

  if (isLoggedIn) {
    return <HomeScreen onLogout={handleLogout} />;
  }

  if (showLogin) {
    return <LoginScreen onLogin={handleLogin} onSwitchToRegister={switchToRegister} />;
  }

  

  return <RegisterScreen onRegister={handleRegister} onSwitchToLogin={switchToLogin} />;
}