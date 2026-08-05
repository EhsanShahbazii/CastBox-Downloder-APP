import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

async function start() {
  const root = createRoot(document.getElementById('root')!);
  if (!window.castboxDesktop) {
    document.title = 'Castbox Downloader — Prototype';
    root.render(<App />);
    return;
  }
  try {
    const response = await window.castboxDesktop.readSettings();
    if (!response.ok) throw new Error(response.error);
    root.render(<App nativeSettings={response.value} />);
  } catch (error) {
    root.render(<main className="max-w-5xl mx-auto p-12"><h1 className="font-serif text-3xl">Settings need attention</h1><p role="alert" className="mt-4">{error instanceof Error ? error.message : 'Unable to connect to the desktop service.'}</p><button className="mt-6 underline" onClick={() => window.location.reload()}>Try again</button></main>);
  }
}
void start();
