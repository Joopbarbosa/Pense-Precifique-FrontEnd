import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button } from '../../components/ui'
import DashboardCompras from '../../components/compra/DashboardCompras'

// V0.15.0 (#598, RN-NOVA-37) — o Dashboard sai da aba de Minhas compras e vira o primeiro item do grupo
// Compras no menu. O endereço antigo (/compras?aba=dashboard) redireciona para cá (ComprasPage).
export default function DashboardComprasPage() {
  const navigate = useNavigate()
  return (
    <AppLayout active="compras" compact>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Dashboard de compras</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Quanto você gastou, com quem e o que ficou mais caro.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="ghost" icon={<ClipboardList size={16} />} onClick={() => navigate('/compras')}>Minhas compras</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/compras/nova')}>Registrar compra</Button>
        </div>
      </div>
      <DashboardCompras />
    </AppLayout>
  )
}
