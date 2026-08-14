import { Header } from "@/components/header";
import CreatorPage from "../creator/[username]/page";

export default function UsernamePage(props: { params: Promise<{ username: string }> }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CreatorPage {...props} />
      </main>
    </div>
  );
}
