import Header from './components/Header';
import Hero from './components/Hero';
import BotForm from './components/BotForm';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-white font-sans">
      <div className="max-w-6xl mx-auto p-6">
        <Header />
        <div className="mt-16 grid md:grid-cols-2 gap-10 items-center">
          <Hero />
          <BotForm />
        </div>
      </div>
    </div>
  );
}
