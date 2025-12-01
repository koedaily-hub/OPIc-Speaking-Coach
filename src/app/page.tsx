import RandomWord from "./components/RandomWord";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md text-center px-4">
        <h1 className="text-2xl font-bold mb-4">
          OPIc Speaking Coach – Random Word Practice
        </h1>
        <p className="text-gray-700 mb-6">
          This is the home page. Click the button below to start your speaking
          challenge with random vocabulary.
        </p>
        <a
          href="/practice"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow"
        >
          Go to Practice Page
        </a>
      </div>
    </main>
  );
}
