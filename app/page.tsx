import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black">
      <Link href="/app" className="text-white text-lg hover:text-gray-300 transition-colors">
        Launch Visualizer
      </Link>
    </div>
  );
}
