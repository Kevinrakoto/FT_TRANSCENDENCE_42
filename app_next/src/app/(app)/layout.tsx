import { ClientProviders } from "@/components/ClientProviders"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientProviders>
      {children}
    </ClientProviders>
  )
}
