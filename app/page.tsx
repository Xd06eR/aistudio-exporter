import { ClientPage } from "@/components/client-page";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Google AI Studio Exporter
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Turn your Google AI Studio conversations into Markdown, XML, HTML, or
            Plain Text — ready to paste into any chatbot or agent to continue the
            work.
          </p>
        </div>
        <ClientPage />
      </div>
    </main>
  );
}
