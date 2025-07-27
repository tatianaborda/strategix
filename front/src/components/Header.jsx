import React, { useState } from 'react';
import { Zap, ChevronDown, Copy, ExternalLink, LogOut, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import useWallet from '../hooks/useWallet';

export default function Header() {
  const { 
    account, 
    isConnected, 
    isConnecting, 
    error, 
    connectWallet, 
    disconnectWallet,
    formatAddress,
    chainId
  } = useWallet();
  
  const [showDropdown, setShowDropdown] = useState(false);

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
    }
  };

  const openInExplorer = () => {
    if (account) {
      const explorerUrl = chainId === 1 
        ? `https://etherscan.io/address/${account}`
        : `https://etherscan.io/address/${account}`;
      window.open(explorerUrl, '_blank');
    }
  };

  const getNetworkName = (chainId) => {
    const networks = {
      1: 'Ethereum',
      5: 'Goerli',
      11155111: 'Sepolia',
      137: 'Polygon',
      80001: 'Mumbai'
    };
    return networks[chainId] || 'Unknown';
  };

  return (
    <header className="flex justify-between items-center p-6 relative z-10">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Zap className="w-8 h-8 text-cyan-300 fill-current" />
          <div className="absolute inset-0 w-8 h-8 bg-cyan-300 blur-sm opacity-50"></div>
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
          STRATEGIX
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isConnected && chainId && (
          <div className="bg-slate-800/50 backdrop-blur-sm text-slate-300 px-3 py-1 rounded-lg text-sm border border-slate-600/50">
            {getNetworkName(chainId)}
          </div>
        )}


        {error && (
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-red-300 px-3 py-1 rounded-lg text-sm max-w-xs truncate flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}


        {!isConnected ? (
          <Button 
            variant="primary" 
            className="px-8 text-sm"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Conectando...' : 'Connect your wallet'}
          </Button>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:border-cyan-400/50 hover:bg-slate-700/80 flex items-center gap-3 min-w-[140px]"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">{formatAddress(account)}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                
                <div className="absolute top-full right-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg overflow-hidden z-20 min-w-64 shadow-2xl">
                  <div className="p-4 border-b border-slate-600/50 bg-slate-700/30">
                    <div className="text-slate-400 text-xs mb-1 font-medium">Wallet Address</div>
                    <div className="text-white text-sm font-mono bg-slate-900/50 px-2 py-1 rounded border">
                      {account}
                    </div>
                    {chainId && (
                      <div className="text-cyan-400 text-xs mt-2 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Connected to {getNetworkName(chainId)}
                      </div>
                    )}
                  </div>
                  

                  <div className="py-1">
                    <button
                      onClick={() => {
                        copyAddress();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-slate-700/50 transition-colors flex items-center gap-3 text-sm"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                      Copy address
                    </button>
                    
                    <button
                      onClick={() => {
                        openInExplorer();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-slate-700/50 transition-colors flex items-center gap-3 text-sm"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                      Look in browser
                    </button>
                    
                    <div className="border-t border-slate-600/50 my-1"></div>
                    
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect wallet
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}