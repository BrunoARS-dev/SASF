import { ManagerPlaceholder } from '@/components/manager-page'
import { QrCodePanel } from '@/components/manager-operation-panels'
import { canAccess, getCurrentUser } from '@/lib/auth'
import { getCurrentQrCode } from '@/lib/manager-api'

export default async function QrCodePage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!canAccess(user.role, 'qrcode')) {
    return (
      <ManagerPlaceholder
        user={user}
        routeKey="qrcode"
        title="QR Code"
        description="Seu perfil nao possui permissao para esta area."
      />
    )
  }

  const { qrCode } = await getCurrentQrCode()

  return <QrCodePanel qrCode={qrCode} />
}
