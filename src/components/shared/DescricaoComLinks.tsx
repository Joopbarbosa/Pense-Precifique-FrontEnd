import { useMemo } from 'react'
import { useCadastrosLinkaveis } from '../../hooks/useCadastrosLinkaveis'
import { segmentarDescricao } from '../../utils/linksDescricao'

/**
 * V0.18.0 (#1179, RN-NOVA-47) — descrição em que os nomes de produto, insumo ou customização viram links que abrem o cadastro em
 * nova aba, sem fechar a tela atual. Nome sem cadastro continua texto simples.
 */
export default function DescricaoComLinks({ texto, className, testId = 'descricao-com-links' }: { texto: string; className?: string; testId?: string }) {
  const cadastros = useCadastrosLinkaveis()
  const trechos = useMemo(() => segmentarDescricao(texto, cadastros), [texto, cadastros])
  return (
    <div className={className} data-testid={testId}>
      {trechos.map((t, i) => t.to
        ? <a key={i} href={t.to} target="_blank" rel="noopener noreferrer" data-testid="link-descricao" onClick={e => e.stopPropagation()}
            className="font-semibold text-teal underline-offset-2 hover:underline">{t.texto}</a>
        : <span key={i}>{t.texto}</span>)}
    </div>
  )
}
