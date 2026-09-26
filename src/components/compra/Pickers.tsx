import clsx from 'clsx'
import { X } from 'lucide-react'
import ComboBusca from './ComboBusca'
import { insumoService } from '../../services/insumoService'
import { clienteService } from '../../services/clienteService'
import { formatQuantidade } from '../../utils/quantidade'
import type { InsumoResponse } from '../../types/insumo'
import type { ClienteResponse } from '../../types/cliente'
import type { CadastroRef } from '../../types/compra'

// V0.15.0 — seletores das telas de Compras. Só oferecem o que pode virar vínculo NOVO: insumo ativo
// (INS-011) e cadastro ativo com papel Fornecedor (RN-NOVA-3). O backend valida de novo.

/** Busca de insumo ativo. `excluir`: ids que não devem aparecer (ex.: já na lista). */
export function InsumoPicker({ onSelect, excluir = [], size = 'md', placeholder = 'Buscar insumo pelo nome…', autoFocus }: {
  onSelect: (i: InsumoResponse) => void
  excluir?: string[]
  size?: 'sm' | 'md'
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <ComboBusca<InsumoResponse>
      buscar={termo => insumoService.listar(0, 20, termo || undefined, true, 'nome,asc').then(p => p.content.filter(i => !excluir.includes(i.id)))}
      onSelect={onSelect}
      getKey={i => i.id}
      placeholder={placeholder}
      vazio="Nenhum insumo ativo encontrado"
      size={size}
      autoFocus={autoFocus}
      renderItem={i => (
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-semibold text-muted">{i.identificador}</span>
            <span className="truncate text-[14px] font-semibold text-dark">{i.nome}</span>
            {i.marca && <span className="truncate text-[12.5px] text-muted">{i.marca}</span>}
          </div>
          <div className="text-[12px] text-muted">
            Estoque {formatQuantidade(i.estoqueAtual, i.fracionavel, i.tipoExibicaoQuantidade)} {i.unidadeMedida}
          </div>
        </div>
      )}
    />
  )
}

/** Busca de fornecedor (cadastro ativo com papel Fornecedor). */
export function FornecedorBusca({ onSelect, size = 'md', placeholder = 'Buscar fornecedor…' }: {
  onSelect: (c: CadastroRef) => void
  size?: 'sm' | 'md'
  placeholder?: string
}) {
  return (
    <ComboBusca<ClienteResponse>
      buscar={termo => clienteService.listar(0, 20, termo || undefined, { papel: 'FORNECEDOR' }).then(p => p.content)}
      onSelect={c => onSelect({ id: c.id, identificador: c.identificador ?? '', nome: c.nome, ativa: c.ativa })}
      getKey={c => c.id}
      placeholder={placeholder}
      vazio="Nenhum fornecedor encontrado"
      size={size}
      renderItem={c => (
        <div className="min-w-0 flex-1">
          <span className="mr-2 text-[12px] font-semibold text-muted">{c.identificador}</span>
          <span className="text-[14px] font-semibold text-dark">{c.nome}</span>
        </div>
      )}
    />
  )
}

/**
 * Fornecedor escolhido (chip com "remover") ou a busca, quando vazio. Fornecedor já salvo que ficou
 * inativo continua exibido (vínculo existente, RN-NOVA-2), marcado como inativo.
 */
export function FornecedorSelect({ value, onChange, size = 'md', placeholder, semFornecedorLabel }: {
  value: CadastroRef | null
  onChange: (c: CadastroRef | null) => void
  size?: 'sm' | 'md'
  placeholder?: string
  /** Texto do chip quando não há fornecedor e não se quer mostrar a busca (não usado por padrão). */
  semFornecedorLabel?: string
}) {
  if (!value) {
    return semFornecedorLabel
      ? <span className="text-sm italic text-faint">{semFornecedorLabel}</span>
      : <FornecedorBusca onSelect={onChange} size={size} placeholder={placeholder} />
  }
  return (
    <div className={clsx(
      'flex items-center gap-2 rounded-input border-[1.5px] border-teal/30 bg-teal/[0.06] px-3',
      size === 'sm' ? 'h-11' : 'h-12'
    )}>
      <span className="text-[12px] font-semibold text-muted">{value.identificador}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-dark">{value.nome}</span>
      {!value.ativa && <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger">Inativo</span>}
      <button type="button" aria-label={`Remover fornecedor ${value.nome}`} onClick={() => onChange(null)}
        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border-none bg-transparent text-muted hover:bg-white hover:text-danger">
        <X size={15} />
      </button>
    </div>
  )
}
