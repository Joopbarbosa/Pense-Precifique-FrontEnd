import AppLayout from '../../components/layout/AppLayout'
import { Factory } from 'lucide-react'

export default function RegistroProducaoPage() {
  return (
    <AppLayout active="producao">
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-[18px] bg-orange/[0.12] text-orange">
          <Factory size={30} />
        </span>
        <div>
          <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-dark">Módulo em manutenção</h1>
          <p className="mb-0 mt-2 text-[14.5px] text-muted">Estamos reconstruindo o módulo de Produção — em breve.</p>
        </div>
      </div>
    </AppLayout>
  )
}
