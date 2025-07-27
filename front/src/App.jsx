import Header from './components/Header'
import Hero from './components/Hero'
import LimitOrderBot from './components/LimitOrderBot'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-slate-900/20 to-slate-900/60"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
      
      <div className="min-h-screen relative z-10">
        <Header />
        
        <main className="flex items-center justify-between px-6 py-12 min-h-[calc(100vh-100px)]">
          <Hero/>
          
          <div className="flex-shrink-0 ml-12">
            <LimitOrderBot />
          </div>
        </main>
      </div>
    </div>
  );
}