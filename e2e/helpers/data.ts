/**
 * #754 — datas dos specs no fuso do backend (America/Sao_Paulo), não em UTC: `new Date().toISOString().slice(0, 10)`
 * devolve o dia seguinte depois das 21h em Brasília e o backend recusa a data como futura.
 */
const FUSO = 'America/Sao_Paulo'
const formato = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })

/** "AAAA-MM-DD" do dia de hoje (ou de hoje + `offsetDias`, negativo para o passado) em America/Sao_Paulo. `agora` só existe para testar o helper. */
export function hojeLocal(offsetDias = 0, agora: Date = new Date()): string {
  return formato.format(new Date(agora.getTime() + offsetDias * 86_400_000))
}
