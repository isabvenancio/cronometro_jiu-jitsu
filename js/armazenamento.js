// Guarda pequenas preferências no navegador (último ajuste, código da TV, som).
// Se o navegador bloquear o localStorage, o cronômetro funciona igual, só não lembra.

const PREFIXO = 'rola.';

export function salvar(chave, valor) {
  try { localStorage.setItem(PREFIXO + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
}

export function carregar(chave) {
  try {
    const v = localStorage.getItem(PREFIXO + chave);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}
