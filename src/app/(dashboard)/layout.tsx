import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 px-6 py-12">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
