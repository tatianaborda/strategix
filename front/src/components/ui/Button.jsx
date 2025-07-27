export default function Button ({ children, variant = 'primary', className = '', ...props }) {
  const baseClasses = 'px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5';
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-400 to-cyan-300 text-slate-900 hover:from-cyan-300 hover:to-cyan-200 font-semibold',
    secondary: 'bg-gradient-to-r from-slate-800 to-slate-700 text-cyan-300 border border-cyan-400/50 hover:border-cyan-300 hover:from-slate-700 hover:to-slate-600',
    danger: 'bg-gradient-to-r from-red-500 to-red-400 text-white hover:from-red-400 hover:to-red-300 font-semibold',
    success: 'bg-gradient-to-r from-green-500 to-green-400 text-white hover:from-green-400 hover:to-green-300 font-semibold'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}