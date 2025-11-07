import { Gen1MainApp } from './components/Gen1MainApp';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pt-24">
      <div className="max-w-4xl mx-auto">
        <Gen1MainApp />
      </div>
    </main>
  );
}

