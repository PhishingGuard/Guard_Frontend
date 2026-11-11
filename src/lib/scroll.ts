// 본문의 [번호] 칩을 누르면 해당 출처로 이동해 잠깐 강조
export function scrollToSource(idPrefix: string, n: number) {
  const el = document.getElementById(`${idPrefix}-${n}`)
  if (!el) return
  const details = el.closest('details')
  if (details) details.open = true
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}
