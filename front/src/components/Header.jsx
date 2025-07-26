export default function Header() {
  return (
    <header className="flex justify-between items-center">
      <h1 className="text-cyan-400 text-xl font-bold tracking-wider">STRATEGIX</h1>
      <button className="bg-cyan-400 text-black font-semibold py-2 px-4 rounded-xl hover:bg-cyan-300 transition">
        Connect Your Wallet
      </button>
    </header>
  );
}