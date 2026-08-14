import { PortfolioEditorShell } from "@/components/portfolio/portfolio-editor-shell";

export default async function EditDynamicPortfolioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PortfolioEditorShell usernameHint={username} />;
}
