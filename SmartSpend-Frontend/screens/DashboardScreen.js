import React from 'react';
import { Home, Menu, Wallet, Target, BarChart3, DollarSign, TrendingUp, Search, PiggyBank, CreditCard, Eye, CheckCircle } from 'lucide-react';

export default function HomeScreen() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto border-x border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white">
        <Menu size={24} className="text-gray-700" />
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center mb-1">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">SmartSpend</span>
        </div>
        <div className="w-6"></div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-white">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="flex-1 bg-gray-50 px-4 py-6">
        {/* Income & Expense Buttons */}
        <div className="flex gap-4 mb-6">
          <button className="flex-1 bg-green-500 text-white font-semibold py-4 px-6 rounded-full hover:bg-green-600 transition-colors">
            + Add Income
          </button>
          <button className="flex-1 bg-red-400 text-white font-semibold py-4 px-6 rounded-full hover:bg-red-500 transition-colors">
            + Add Expense
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-green-400 rounded-3xl p-6 mb-6 text-white">
          <div className="flex justify-between mb-6">
            <div>
              <div className="flex items-center mb-2">
                <BarChart3 size={16} className="mr-2" />
                <span className="text-sm opacity-90">Total Balance</span>
              </div>
              <p className="text-3xl font-bold">$7,783.00</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end mb-2">
                <Eye size={16} className="mr-2" />
                <span className="text-sm opacity-90">Total Expense</span>
              </div>
              <p className="text-2xl font-bold text-red-300">-$1,187.40</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative mb-4">
            <div className="bg-black bg-opacity-20 rounded-full h-10 flex items-center">
              <div className="bg-black rounded-full h-10 flex items-center justify-center px-4" style={{width: '30%'}}>
                <span className="text-white text-sm font-semibold">30%</span>
              </div>
              <div className="absolute right-4 text-white text-sm font-semibold">
                $20,000.00
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <CheckCircle size={16} className="mr-2" />
            <span className="text-sm">30% Of Your Expenses, Looks Good.</span>
          </div>
        </div>

        {/* Feature Shortcuts */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {[
            { name: "Personalized Budgeting", icon: <BarChart3 size={32} />, bg: "bg-green-100", color: "text-green-600" },
            { name: "Expense Analysis", icon: <PiggyBank size={32} />, bg: "bg-blue-100", color: "text-blue-600" },
            { name: "Investment Advice", icon: <Target size={32} />, bg: "bg-gray-100", color: "text-gray-600" },
            { name: "Smart Alerts", icon: <DollarSign size={32} />, bg: "bg-pink-100", color: "text-pink-600" },
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className={`w-20 h-20 ${item.bg} rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-sm text-gray-600 text-center leading-tight font-medium">{item.name}</p>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Transaction</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <CreditCard size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Deposit from account</p>
                  <p className="text-sm text-gray-400">28 January 2021</p>
                </div>
              </div>
              <p className="text-red-500 font-semibold">-$850</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-lg font-bold">P</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Deposit Paypal</p>
                  <p className="text-sm text-gray-400">25 January 2021</p>
                </div>
              </div>
              <p className="text-green-500 font-semibold">+$2,500</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-green-400 flex justify-around py-4">
        <button className="flex flex-col items-center text-white">
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center text-white opacity-70 hover:opacity-100 transition-opacity">
          <DollarSign size={24} />
          <span className="text-xs mt-1">Accounts</span>
        </button>
        <button className="flex flex-col items-center text-white opacity-70 hover:opacity-100 transition-opacity">
          <Target size={24} />
          <span className="text-xs mt-1">Goals</span>
        </button>
        <button className="flex flex-col items-center text-white opacity-70 hover:opacity-100 transition-opacity">
          <BarChart3 size={24} />
          <span className="text-xs mt-1">Stats</span>
        </button>
      </div>
    </div>
  );
}