import WordleGame from "@/components/WordleGame";
import InstallPrompt from "@/components/InstallPrompt";

export default function Home() {
  return (
    <main className="min-h-screen bg-base-100">
      <WordleGame />
      <InstallPrompt />
    </main>
  );
}
