import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select ({ value, onChange, options, placeholder, error }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border ${
          error ? 'border-red-400' : 'border-slate-600/50'
        } rounded-lg px-3 py-2 text-left text-cyan-300 text-sm flex items-center justify-between hover:border-cyan-300/70 hover:from-slate-700/80 hover:to-slate-600/80 transition-all duration-200`}
      >
        <span className="flex items-center gap-2">
          <span className="text-cyan-300 font-medium">$</span>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-r from-slate-800/95 to-slate-700/95 backdrop-blur-md border border-slate-600/50 rounded-lg shadow-2xl z-20 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-cyan-300 text-sm hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 first:rounded-t-lg last:rounded-b-lg transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <span className="text-cyan-300 font-medium">$</span>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
      
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}