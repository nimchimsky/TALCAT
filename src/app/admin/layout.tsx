import { AppSidebar } from "@/components/app-sidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1480px] gap-6 px-4 py-4 sm:px-6 sm:py-6">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <main>{children}</main>
      </div>
    </div>
  );
}
