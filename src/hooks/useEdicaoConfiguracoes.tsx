import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import ModalAlteracoesNaoSalvas from '../components/configuracoes/ModalAlteracoesNaoSalvas'
import { useModalErro } from './useModalErro'
import { extrairErroExplicado } from '../utils/apiError'
import { useSaidaConfiguracoesStore } from '../store/saidaConfiguracoesStore'

// V0.17.0 (#983, RN-NOVA-28, DT-NOVA-23) — estado de edição único de Configurações: cada aba registra
// os itens pendentes (um por aba; nos métodos de pagamento, um por método) e a página tem um só
// indicador, um só "Salvar alterações" e a guarda de saída. Nenhum endpoint novo: cada item chama a
// gravação que já existia.

export type AbaEdicao = 'precificacao' | 'perfil' | 'pagamento'

/** Ordem fixa do salvar único (RN-NOVA-28 item 2). */
const ORDEM: AbaEdicao[] = ['precificacao', 'perfil', 'pagamento']

const ROTULO_ABA: Record<AbaEdicao, string> = {
  precificacao: 'Precificação',
  perfil: 'Perfil da empresa',
  pagamento: 'Métodos de pagamento',
}

export interface AlteracaoCampo { campo: string; antes: string; depois: string }

export interface ItemPendente {
  chave: string
  /** Complemento do rótulo (nos métodos de pagamento, o nome do método). */
  sufixo?: string
  alteracoes: AlteracaoCampo[]
  /** Preenchido quando algum campo alterado é inválido: bloqueia o salvar. */
  erro?: string
  salvar: () => Promise<void>
}

type Itens = Record<AbaEdicao, ItemPendente[]>
const VAZIO: Itens = { precificacao: [], perfil: [], pagamento: [] }

interface Contexto {
  itens: Itens
  temPendencia: boolean
  salvando: boolean
  primeiroErro: string | null
  registrar: (aba: AbaEdicao, itens: ItemPendente[]) => void
  salvarAlteracoes: () => Promise<boolean>
}

const EdicaoContext = createContext<Contexto | null>(null)

export function useEdicaoConfiguracoes(): Contexto {
  const ctx = useContext(EdicaoContext)
  if (!ctx) throw new Error('useEdicaoConfiguracoes fora de EdicaoConfiguracoesProvider')
  return ctx
}

/** A aba informa seus itens pendentes a cada mudança; sem pendência, passar lista vazia. */
export function useRegistrarEdicao(aba: AbaEdicao, itens: ItemPendente[]) {
  const { registrar } = useEdicaoConfiguracoes()
  useEffect(() => { registrar(aba, itens) }, [registrar, aba, itens])
  useEffect(() => () => registrar(aba, []), [registrar, aba])
}

type Saida = { tipo: 'navegacao' } | { tipo: 'sessao'; continuar: () => void }

export function EdicaoConfiguracoesProvider({ onSalvou, children }: { onSalvou: () => void; children: ReactNode }) {
  const [itens, setItens] = useState<Itens>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [saida, setSaida] = useState<Saida | null>(null)
  const { modalErro, mostrarErro } = useModalErro()

  const itensRef = useRef(itens)
  itensRef.current = itens
  const ignorarGuarda = useRef(false)

  const temPendencia = ORDEM.some(a => itens[a].length > 0)
  const temPendenciaRef = useRef(false)
  temPendenciaRef.current = temPendencia

  const registrar = useCallback((aba: AbaEdicao, lista: ItemPendente[]) => {
    setItens(prev => (prev[aba].length === 0 && lista.length === 0 ? prev : { ...prev, [aba]: lista }))
  }, [])

  const primeiroErro = useMemo(() => {
    for (const aba of ORDEM) {
      const comErro = itens[aba].find(i => i.erro)
      if (comErro) return comErro.erro ?? null
    }
    return null
  }, [itens])

  /** Grava, um por vez e na ordem fixa, todo item pendente; uma falha não interrompe os demais. */
  const salvarAlteracoes = useCallback(async (): Promise<boolean> => {
    const atuais = itensRef.current
    const falhas: string[] = []
    setSalvando(true)
    try {
      for (const aba of ORDEM) {
        for (const item of atuais[aba]) {
          try {
            await item.salvar()
          } catch (err) {
            const rotulo = item.sufixo ? `${ROTULO_ABA[aba]} — ${item.sufixo}` : ROTULO_ABA[aba]
            falhas.push(`${rotulo}: ${extrairErroExplicado(err, 'Erro ao salvar. Tente novamente.').mensagem}`)
          }
        }
      }
    } finally {
      setSalvando(false)
    }
    if (falhas.length > 0) {
      mostrarErro({
        titulo: 'Algumas alterações não foram salvas',
        mensagem: 'Algumas alterações não foram salvas.',
        motivo: 'O que foi gravado ficou salvo; o que falhou continua pendente na tela.',
        comoResolver: 'Corrija o que está indicado e clique em "Salvar alterações" de novo.',
        itens: falhas,
      })
      return false
    }
    onSalvou()
    return true
  }, [mostrarErro, onSalvou])

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !ignorarGuarda.current && temPendenciaRef.current && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (blocker.state === 'blocked') setSaida({ tipo: 'navegacao' })
  }, [blocker.state])

  // Sair da conta: o botão do menu consulta esta função antes de limpar a sessão.
  useEffect(() => {
    const { definir } = useSaidaConfiguracoesStore.getState()
    definir((continuar) => {
      if (!temPendenciaRef.current) return false
      setSaida({ tipo: 'sessao', continuar })
      return true
    })
    return () => useSaidaConfiguracoesStore.getState().definir(null)
  }, [])

  // Fechar/atualizar a página: aviso padrão do navegador (sem lista nem botões próprios).
  useEffect(() => {
    if (!temPendencia) return
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [temPendencia])

  const concluirSaida = (s: Saida) => {
    ignorarGuarda.current = true
    setSaida(null)
    if (s.tipo === 'navegacao') blocker.proceed?.()
    else s.continuar()
  }

  const continuarEditando = () => {
    const s = saida
    setSaida(null)
    if (s?.tipo === 'navegacao') blocker.reset?.()
  }

  const sairSemSalvar = () => { if (saida) concluirSaida(saida) }

  const salvarESair = async () => {
    if (!saida) return
    if (primeiroErro) {
      continuarEditando()
      mostrarErro({
        titulo: 'Não foi possível salvar',
        mensagem: primeiroErro,
        motivo: 'Há um campo inválido. Nada foi gravado e você continua em Configurações.',
        comoResolver: 'Corrija o campo ou escolha "Sair sem salvar" para descartar as alterações.',
      })
      return
    }
    const s = saida
    const ok = await salvarAlteracoes()
    if (ok) concluirSaida(s)
    else continuarEditando()
  }

  const valor = useMemo<Contexto>(
    () => ({ itens, temPendencia, salvando, primeiroErro, registrar, salvarAlteracoes }),
    [itens, temPendencia, salvando, primeiroErro, registrar, salvarAlteracoes],
  )

  return (
    <EdicaoContext.Provider value={valor}>
      {children}
      {saida && (
        <ModalAlteracoesNaoSalvas
          itens={itens}
          salvando={salvando}
          onSalvarESair={salvarESair}
          onSairSemSalvar={sairSemSalvar}
          onContinuar={continuarEditando}
        />
      )}
      {modalErro}
    </EdicaoContext.Provider>
  )
}
