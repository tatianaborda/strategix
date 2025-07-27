import Button from './ui/Button';

export default function Hero() {
  return (
  <div className="flex-1 flex items-center px-6 relative z-10">
    <div className="max-w-2xl">
      <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
        <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
          Automate your
        </span>
        <br />
        <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
          limit orders
        </span>
      </h1>
      <p className="text-xl text-slate-300 mb-8 leading-relaxed">
        A simple tool to create limit order strategies
      </p>
      <Button className="text-lg px-8 py-4">
        Start Now
      </Button>
    </div>
  </div>
);
}
