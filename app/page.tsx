import Link from 'next/link';
import { PumpkinCarvingApp } from './components/PumpkinCarvingApp';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Admin Dashboard Link */}
        <div className="mb-4 text-right">
          <Link
            href="/admin"
            className="inline-block text-white/80 hover:text-white text-sm font-semibold transition"
          >
            🛠️ Admin
          </Link>
        </div>

        <PumpkinCarvingApp />
      </div>
    </main>
  );
}

