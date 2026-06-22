import { AuthProvider } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { QueryProvider } from "@/components/query-provider";
import { ChatWidget } from "@/components/chat-widget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <QueryProvider>
        <AuthProvider>
          {children}
          <ChatWidget />
        </AuthProvider>
      </QueryProvider>
    </AuthGuard>
  );
}
