import { PumpkinCarvingApp } from './components/PumpkinCarvingApp';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
        <PumpkinCarvingApp />
      </div>
    </main>
  );
}

