// Pequenos utilitários de interface usados pelas telas.

export const $ = seletor => document.querySelector(seletor);

// Desenha "05:00" com cada dígito numa caixa de largura fixa, para os números não "pularem".
export function desenharDigitos(el, texto) {
  if (el.dataset.v === texto) return;
  el.dataset.v = texto;
  el.textContent = '';
  for (const ch of texto) {
    const span = document.createElement('span');
    span.className = ch === ':' ? 'dg c' : 'dg';
    span.textContent = ch;
    el.appendChild(span);
  }
}

let timerAviso = null;
export function aviso(mensagem) {
  const t = $('#toast');
  t.textContent = mensagem;
  t.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { t.hidden = true; }, 2600);
}
