// Conexão direta entre a TV e os celulares, usando PeerJS (WebRTC).
//
// Como funciona:
// 1. A TV se registra no servidor público do PeerJS com o id "rola-bjj-<CÓDIGO>".
// 2. O celular se conecta a esse id. O servidor só apresenta um ao outro.
// 3. Depois disso, os dados vão direto de aparelho para aparelho:
//    celular -> TV: comandos { a: 'toggle' | 'reset' | 'skip' | 'config', cfg? }
//    TV -> celular: o estado do cronômetro, a cada segundo e a cada mudança.

import { salvar, carregar } from './armazenamento.js';

const PREFIXO = 'rola-bjj-';
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I/L para não confundir
const ERROS_DE_REDE = ['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'];

export const peerDisponivel = () => typeof window.Peer === 'function';

function novoCodigo() {
  const n = new Uint32Array(4);
  crypto.getRandomValues(n);
  let codigo = '';
  for (const x of n) codigo += LETRAS[x % LETRAS.length];
  return codigo;
}

export function codigoValido(texto) {
  return /^[A-Z0-9]{4}$/.test(texto);
}

function fechar(obj, metodo = 'close') {
  try { obj?.[metodo](); } catch (e) { /* já fechado */ }
}

// ==================== lado da TV ====================

export class TvHost {
  /**
   * @param {{aoReceberComando: Function, aoMudar: Function, fotoAtual: Function}} opcoes
   */
  constructor({ aoReceberComando, aoMudar, fotoAtual }) {
    this.aoReceberComando = aoReceberComando;
    this.aoMudar = aoMudar;
    this.fotoAtual = fotoAtual;
    this.codigo = carregar('code');
    this.peer = null;
    this.conexoes = new Set();
    this.pronta = false;
    this.tentativasId = 0;
  }

  get controles() { return this.conexoes.size; }

  iniciar(trocarCodigo = false) {
    this.parar();
    if (trocarCodigo || !this.codigo) {
      this.codigo = novoCodigo();
      salvar('code', this.codigo);
    }
    if (!peerDisponivel()) { this.aoMudar(); return; }

    const p = new window.Peer(PREFIXO + this.codigo, { debug: 0 });
    this.peer = p;
    const atual = () => p === this.peer;

    p.on('open', () => {
      if (!atual()) return;
      this.pronta = true;
      this.tentativasId = 0;
      this.aoMudar();
    });

    p.on('connection', conn => {
      conn.on('open', () => {
        if (!atual()) return;
        this.conexoes.add(conn);
        this.enviarPara(conn, this.fotoAtual());
        this.aoMudar();
      });
      conn.on('data', d => { if (atual()) this.aoReceberComando(d); });
      const remover = () => { this.conexoes.delete(conn); this.aoMudar(); };
      conn.on('close', remover);
      conn.on('error', remover);
    });

    p.on('disconnected', () => {
      if (!atual()) return;
      this.pronta = false;
      this.aoMudar();
      setTimeout(() => { if (atual() && !p.destroyed) fechar(p, 'reconnect'); }, 2000);
    });

    p.on('error', err => {
      if (!atual()) return;
      this.pronta = false;
      this.aoMudar();
      if (err.type === 'unavailable-id') {
        // O código ainda está preso pela aba anterior (libera em alguns segundos).
        // Tenta de novo algumas vezes e, se não der, troca de código.
        if (this.tentativasId++ < 4) setTimeout(() => { if (atual()) this.iniciar(false); }, 4000);
        else { this.tentativasId = 0; this.iniciar(true); }
      } else if (ERROS_DE_REDE.includes(err.type)) {
        setTimeout(() => { if (atual()) this.iniciar(false); }, 5000);
      }
    });

    this.aoMudar();
  }

  parar() {
    if (this.peer) {
      const p = this.peer;
      this.peer = null;
      fechar(p, 'destroy');
    }
    this.conexoes.clear();
    this.pronta = false;
  }

  enviarPara(conn, foto) {
    try { if (conn.open) conn.send(foto); } catch (e) { /* conexão caiu */ }
  }

  transmitir(foto) {
    this.conexoes.forEach(c => this.enviarPara(c, foto));
  }
}

// ==================== lado do celular ====================

// situacao: 'nenhuma' | 'conectando' | 'conectado' | 'nao-encontrada' | 'sem-rede'
export class ControleCliente {
  /**
   * @param {{aoReceberEstado: Function, aoMudarSituacao: Function}} opcoes
   */
  constructor({ aoReceberEstado, aoMudarSituacao }) {
    this.aoReceberEstado = aoReceberEstado;
    this.aoMudarSituacao = aoMudarSituacao;
    this.peer = null;
    this.conn = null;
    this.codigo = null;
    this.situacao = 'nenhuma';
    this.timerNovaTentativa = null;
    this.ativo = false;

    document.addEventListener('visibilitychange', () => {
      // ao desbloquear o celular, reconecta na hora
      if (document.visibilityState === 'visible' && this.ativo && this.codigo && this.situacao !== 'conectado') this.garantir();
    });
  }

  get conectado() { return this.situacao === 'conectado'; }

  mudar(situacao) {
    this.situacao = situacao;
    this.aoMudarSituacao();
  }

  conectar(codigo) {
    this.codigo = codigo;
    salvar('lastCode', codigo);
    this.fecharConexao();
    this.mudar(peerDisponivel() ? 'conectando' : 'sem-rede');
    this.garantir();
  }

  desconectar() {
    clearTimeout(this.timerNovaTentativa);
    this.codigo = null;
    this.fecharConexao();
    if (this.peer) { const p = this.peer; this.peer = null; fechar(p, 'destroy'); }
    this.mudar('nenhuma');
  }

  enviar(comando) {
    if (!this.conn || !this.conn.open) return false;
    try { this.conn.send(comando); return true; } catch (e) { return false; }
  }

  // ----- internos -----

  fecharConexao() {
    if (this.conn) { const c = this.conn; this.conn = null; fechar(c); }
  }

  tentarDeNovo() {
    clearTimeout(this.timerNovaTentativa);
    this.timerNovaTentativa = setTimeout(() => this.garantir(), 3000);
  }

  garantir() {
    if (!peerDisponivel() || !this.codigo || !this.ativo) return;
    if (this.conn && this.conn.open) return;

    if (!this.peer || this.peer.destroyed) {
      const p = new window.Peer({ debug: 0 });
      this.peer = p;
      p.on('open', () => { if (p === this.peer) this.discar(); });
      p.on('error', err => {
        if (p !== this.peer) return;
        if (err.type === 'peer-unavailable') this.mudar('nao-encontrada');
        else if (ERROS_DE_REDE.includes(err.type)) { this.peer = null; fechar(p, 'destroy'); this.mudar('sem-rede'); }
        this.tentarDeNovo();
      });
      p.on('disconnected', () => {
        if (p === this.peer && !p.destroyed) setTimeout(() => fechar(p, 'reconnect'), 1500);
      });
    } else if (this.peer.open) {
      this.discar();
    } else {
      this.tentarDeNovo();
    }
  }

  discar() {
    this.fecharConexao();
    const c = this.peer.connect(PREFIXO + this.codigo, { reliable: true });
    this.conn = c;
    c.on('open', () => { if (c === this.conn) this.mudar('conectado'); });
    c.on('data', d => { if (c === this.conn) this.aoReceberEstado(d); });
    c.on('close', () => {
      if (c !== this.conn) return;
      this.conn = null;
      this.aoReceberEstado(null);
      if (this.situacao === 'conectado') this.mudar('conectando');
      this.tentarDeNovo();
    });
    c.on('error', () => {});
    // se em 9 s não abriu, a TV provavelmente não está no ar com esse código
    setTimeout(() => {
      if (c === this.conn && !c.open) {
        this.conn = null;
        fechar(c);
        if (this.situacao === 'conectando') this.mudar('nao-encontrada');
        this.tentarDeNovo();
      }
    }, 9000);
  }
}
