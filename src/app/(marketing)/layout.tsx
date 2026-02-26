export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Marketing header/footer will be built in Task 8 */}
      {children}
    </div>
  )
}
