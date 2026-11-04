// Painel "Ajustes do treino". O mesmo componente é usado na TV e no celular.

import { OPCOES_ROUND, OPCOES_DESCANSO, OPCOES_QTD_ROUNDS, OPCOES_PREPARACAO, FAIXAS } from '../config.js';
import { formatarDuracao } from '../formato.js';

/**
 * Monta o painel dentro de `raiz`.
 * @param {HTMLElement} raiz
 * @param {() => object} ler   devolve os ajustes atuais (rascunho)
 * @param {(cfg: object) => void} gravar   recebe os ajustes alterados
 */
export function montarAjustes(raiz, ler, gravar) {
  raiz.textContent = '';
  const c = ler();
  const alterar = mudanca => { gravar({ ...ler(), ...mudanca }); montarAjustes(raiz, ler, gravar); };

  const grupo = (titulo, lado) => {
    const g = document.createElement('div');
    g.className = 'grp';
    const h = document.createElement('div');
    h.className = 'grp-h';
    const t = document.createElement('span');
    t.className = 'eyebrow';
    t.textContent = titulo;
    h.appendChild(t);
    if (lado) {
      const l = document.createElement('span');
      l.className = 'summary';
      l.textContent = lado;
      h.appendChild(l);
    }
    g.appendChild(h);
    raiz.appendChild(g);
    return g;
  };

  const fichas = (g, opcoes, valor, chave) => {
    const linha = document.createElement('div');
    linha.className = 'chips';
    for (const [v, rotulo] of opcoes) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = rotulo;
      b.setAttribute('aria-pressed', String(v === valor));
      b.addEventListener('click', () => alterar({ [chave]: v }));
      linha.appendChild(b);
    }
    g.appendChild(linha);
  };

  // atalhos por faixa
  const gf = grupo('Tempo de luta por faixa', 'IBJJF, adulto');
  const faixas = document.createElement('div');
  faixas.className = 'belts';
  for (const [nome, seg, cor, ponteira] of FAIXAS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'belt';
    b.style.setProperty('--belt', cor);
    b.style.setProperty('--tip', ponteira);
    b.setAttribute('aria-pressed', String(c.work === seg));
    const faixa = document.createElement('span');
    faixa.className = 'strap';
    const texto = document.createElement('span');
    texto.textContent = nome + ' ';
    const tempo = document.createElement('small');
    tempo.textContent = formatarDuracao(seg);
    texto.appendChild(tempo);
    b.append(faixa, texto);
    b.addEventListener('click', () => alterar({ work: seg }));
    faixas.appendChild(b);
  }
  gf.appendChild(faixas);

  fichas(grupo('Duração do round'), OPCOES_ROUND, c.work, 'work');
  fichas(grupo('Descanso entre rounds'), OPCOES_DESCANSO, c.rest, 'rest');
  fichas(grupo('Quantidade de rounds'), OPCOES_QTD_ROUNDS, c.rounds, 'rounds');
  fichas(grupo('Preparação antes do 1º round'), OPCOES_PREPARACAO, c.prep, 'prep');

  // aviso de 30 segundos
  const chave = document.createElement('button');
  chave.type = 'button';
  chave.className = 'switch';
  chave.setAttribute('role', 'switch');
  chave.setAttribute('aria-checked', String(c.warn));
  chave.innerHTML = '<span><strong>Aviso de 30 segundos</strong><br><span class="summary">Dois bipes e borda branca no fim do round</span></span><span class="knob"></span>';
  chave.addEventListener('click', () => alterar({ warn: !ler().warn }));
  raiz.appendChild(chave);

  // resumo
  const resumo = document.createElement('div');
  resumo.className = 'summary';
  if (c.rounds) {
    const total = c.rounds * c.work + (c.rounds - 1) * c.rest + c.prep;
    const m = Math.floor(total / 60), s = total % 60;
    resumo.append('Treino total: ');
    const b = document.createElement('b');
    b.textContent = m + ' min' + (s ? ' ' + s + ' s' : '');
    resumo.appendChild(b);
  } else {
    resumo.textContent = 'Rounds seguem até alguém pausar ou zerar.';
  }
  raiz.appendChild(resumo);
}
