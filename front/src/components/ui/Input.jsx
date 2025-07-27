export default function Input ({ label, value, onChange, placeholder, type = 'text', error, ...props }) {
  return (
  <div>
    <label className="block text-slate-200 text-xs font-medium mb-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border ${
        error ? 'border-red-400' : 'border-slate-600/50'
      } rounded-lg px-3 py-2 text-cyan-300 text-sm placeholder-slate-400 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 focus:outline-none transition-all duration-200`}
      {...props}
    />
    {error && (
      <p className="text-red-400 text-xs mt-1">{error}</p>
    )}
  </div>
);
}