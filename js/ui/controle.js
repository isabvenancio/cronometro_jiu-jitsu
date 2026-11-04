// Tela do celular: espelho do cronômetro, botões de comando e ajustes do treino.

import { $, desenharDigitos, aviso } from './dom.js';
import { montarAjustes } from './ajustes.js';
import { CONFIG_PADRAO, NOME_FASE, validarConfig } from '../config.js';
import {
  formatarTempo, nomeFase, textoRound, textoProximo, textoAviso,
  progresso, estaPausado, textoBotaoPrincipal,
} from '../formato.js';
import { Cronometro } from '../cronometro.js';
import { peerDisponivel, codigoValido } from '../conexao.js';
import { salvar, carregar } from '../armazenamento.js';

export function criarTelaControle({ cliente, irPara }) {
  let ativa = false;
  let remoto = null;  // { s: estado vindo da TV, em: Date.now() quando chegou }
  let rascunho = validarConfig(carregar('draft') || CONFIG_PADRAO);
  let rascunhoAlterado = false;

  const montarPainel = () => montarAjustes($('#cCfg'), () => rascunho, v => { rascunho = v; rascunhoAlterado = true; });

  // Estado recebido da TV (ou null quando a conexão cai). Tudo é validado antes de usar.
  function receberEstado(d) {
    if (d === null) { remoto = null; return; }
    if (!ativa || !d || typeof d !== 'object' || !(d.phase in NOME_FASE)) return;
    const s = {
      phase: d.phase,
      round: Number(d.round) || 0,
      remaining: Math.max(0, Number(d.remaining) || 0),
      running: !!d.running,
      warned: !!d.warned,
      cfg: validarConfig(d.cfg),
    };
    remoto = { s, em: Date.now() };
    // se ninguém mexeu nos ajustes do celular, eles acompanham os da TV
    if (!rascunhoAlterado && JSON.stringify(s.cfg) !== JSON.stringify(rascunho)) {
      rascunho = s.cfg;
      montarPainel();
    }
  }

  // Entre uma atualização e outra da TV, o celular adianta o relógio sozinho.
  function estadoAgora() {
    if (!remoto) return null;
    const s = { ...remoto.s };
    if (s.running) s.remaining = Math.max(0, s.remaining - (Date.now() - remoto.em));
    return s;
  }

  function enviar(comando) {
    if (!cliente.enviar(comando)) aviso('O celular não está conectado à TV.');
  }

  // ----- desenho -----

  function desenharSituacao() {
    const selo = $('#cStatus');
    const texto = selo.querySelector('span');
    const ajuda = $('#cEmpty');
    const codigo = cliente.codigo;
    let classe = 'warn', msg = 'Conectando…', html = '';

    if (!peerDisponivel()) {
      msg = 'Sem internet';
      html = '<strong>Não consegui carregar a conexão.</strong> Confira a internet do celular e recarregue a página.';
    } else switch (cliente.situacao) {
      case 'nenhuma': msg = 'Sem TV'; break;
      case 'conectado': classe = 'ok'; msg = 'TV ' + codigo; break;
      case 'nao-encontrada':
        msg = 'TV não encontrada';
        html = '<strong>Nenhuma TV com o código ' + codigo + '.</strong> Confira se a TV está aberta no modo TV e mostrando esse código. Continuo tentando sozinho.';
        break;
      case 'sem-rede':
        msg = 'Sem conexão';
        html = '<strong>Perdi a conexão.</strong> Tentando de novo a cada poucos segundos.';
        break;
    }

    selo.className = 'c-status ' + classe;
    texto.textContent = msg;
    ajuda.hidden = !html;
    if (html) ajuda.innerHTML = html;
    $('#cJoin').hidden = !(peerDisponivel() && (cliente.situacao === 'nenhuma' || cliente.situacao === 'nao-encontrada'));
    $('#cOther').hidden = !codigo;
    for (const sel of ['#cToggle', '#cReset', '#cSkip', '#cApply']) $(sel).disabled = !cliente.conectado;
  }

  function desenhar() {
    if (!ativa) return;
    const agora = estadoAgora();
    const s = agora || Cronometro.novoEstado(rascunho);
    const espelho = $('#mirror');
    espelho.dataset.phase = s.phase;
    espelho.classList.toggle('paused', estaPausado(s));
    espelho.classList.toggle('warn', s.phase === 'work' && s.warned);
    $('#mPhase').textContent = nomeFase(s);
    $('#mRound').textContent = textoRound(s);
    desenharDigitos($('#mTime'), formatarTempo(s.remaining));
    $('#mFlag').textContent = agora ? (textoAviso(s) || textoProximo(s, 'Pronto para começar')) : 'Aguardando a TV';
    $('#mBar').style.width = (progresso(s) * 100).toFixed(2) + '%';
    $('#cToggle').textContent = textoBotaoPrincipal(agora);
  }

  // ----- eventos -----

  $('#cToggle').addEventListener('click', () => enviar({ a: 'toggle' }));
  $('#cReset').addEventListener('click', () => enviar({ a: 'reset' }));
  $('#cSkip').addEventListener('click', () => enviar({ a: 'skip' }));
  $('#cApply').addEventListener('click', () => {
    enviar({ a: 'config', cfg: rascunho });
    salvar('draft', rascunho);
    rascunhoAlterado = false;
    aviso('Ajustes enviados para a TV.');
  });
  $('#cExit').addEventListener('click', () => irPara(''));
  $('#cOther').addEventListener('click', () => irPara('controle'));

  const campo = $('#cCodeIn');
  campo.addEventListener('input', () => {
    campo.value = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  });
  $('#cJoin').addEventListener('submit', e => {
    e.preventDefault();
    const codigo = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!codigoValido(codigo)) { aviso('O código tem 4 letras ou números.'); return; }
    irPara('controle/' + codigo);
  });

  return {
    get ativa() { return ativa; },
    desenhar,
    desenharSituacao,
    receberEstado,
    entrar(codigo) {
      ativa = true;
      cliente.ativo = true;
      if (codigo && codigo !== cliente.codigo) { remoto = null; cliente.conectar(codigo); }
      else if (!codigo && cliente.codigo) { remoto = null; cliente.desconectar(); }
      if (!codigo) {
        const ultimo = carregar('lastCode');
        if (ultimo && !campo.value) campo.value = ultimo;
      }
      montarPainel();
      desenharSituacao();
      desenhar();
    },
    sair() {
      ativa = false;
      remoto = null;
      if (cliente.codigo) cliente.desconectar();
      cliente.ativo = false;
    },
  };
}
