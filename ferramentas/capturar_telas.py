"""
Capturas de tela do portal no Edge headless, controlado pelo protocolo de depuração (CDP).
Sem dependências: tem um cliente WebSocket mínimo embutido.

Uso (na raiz do repositório):
    python ferramentas/capturar_telas.py <pasta-de-saída> [nomes das capturas...]

Sobe um servidor local na porta 8765, abre cada página com uma sessão local de exemplo
("Grupo Exemplo", sem planilha), rola até o seletor indicado e salva PNGs em 1366px e 520px.
Por que não usar só --screenshot: com âncoras e rolagem suave, o headless captura a página
no meio da rolagem; aqui a rolagem é instantânea e a captura espera os scripts.
"""
import base64
import json
import os
import pathlib
import random
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORTA_SITE, PORTA_CDP = 8765, 9333

# (nome, página, alvo, largura, altura). O alvo é um id: na página da parte ele vai no endereço (#id),
# e o próprio portal abre o módulo certo e rola até o ponto, como acontece com o estudante.
CAPTURAS = [
    ("home", "/index.html", "", 1366, 1500),
    ("home-trilha", "/index.html", "trilha", 1366, 1400),
    ("e0", "/entregas/e0.html", "", 1366, 1300),
    ("e0-termo", "/entregas/e0.html", "s-termo", 1366, 1100),
    ("roteiro", "/atividades/roteiro.html", "s-b1", 1366, 1200),
    ("auditoria", "/atividades/auditoria.html", "s-caso", 1366, 1300),
    ("e1", "/entregas/e1.html", "", 1366, 1300),
    ("e1-mercado", "/entregas/e1.html", "s-mercado", 1366, 1400),
    ("e1-bench", "/entregas/e1.html", "s-benchmarking", 1366, 1500),
    ("e1-swot", "/entregas/e1.html", "s-swot", 1366, 1300),
    ("e2-persona", "/entregas/e2.html", "s-personas", 1366, 1500),
    ("e2-pos", "/entregas/e2.html", "s-posicionamento", 1366, 1300),
    ("e3-7ps", "/entregas/e3.html", "s-sete-ps", 1366, 1300),
    ("e4-ice", "/entregas/e4.html", "s-ice", 1366, 1300),
    ("e4-orc", "/entregas/e4.html", "s-orcamento", 1366, 1200),
    ("e5-editorial", "/entregas/e5.html", "s-editorial", 1366, 1300),
    ("e6", "/entregas/e6.html", "s-painel", 1366, 1300),
    ("plano", "/plano.html", "", 1366, 1300),
    ("leitura-a4", "/leituras/aula-4-tam-sam-som-e-tendencias.html", "", 1366, 1100),
    ("m-home", "/index.html", "", 520, 2000),
    ("m-e1", "/entregas/e1.html", "", 520, 1600),
    ("m-e1-bench", "/entregas/e1.html", "s-benchmarking", 520, 2000),
    ("m-e4-ice", "/entregas/e4.html", "s-ice", 520, 1800),
]


def encerrar(proc):
    """Encerra o processo e todos os filhos (no Windows, edge.kill() deixa os processos filhos do Edge vivos)."""
    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)


class WS:
    """Cliente WebSocket mínimo (só texto, sem extensões) para o CDP."""

    def __init__(self, url):
        host, resto = url[len("ws://"):].split("/", 1)
        h, p = host.split(":")
        self.s = socket.create_connection((h, int(p)))
        chave = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{resto} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {chave}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.s.recv(4096)
        self.buf = resp.split(b"\r\n\r\n", 1)[1]
        self.n = 0

    def _ler(self, n):
        while len(self.buf) < n:
            self.buf += self.s.recv(1 << 20)
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def enviar(self, obj):
        dados = json.dumps(obj).encode()
        cab = bytearray([0x81])
        n = len(dados)
        if n < 126:
            cab.append(0x80 | n)
        elif n < 65536:
            cab += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            cab += bytes([0x80 | 127]) + struct.pack(">Q", n)
        mask = os.urandom(4)
        self.s.sendall(bytes(cab) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(dados)))

    def receber(self):
        partes = b""
        while True:
            b1, b2 = self._ler(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._ler(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._ler(8))[0]
            partes += self._ler(n)
            if b1 & 0x80:
                return json.loads(partes)

    def cmd(self, metodo, **params):
        self.n += 1
        self.enviar({"id": self.n, "method": metodo, "params": params})
        while True:
            m = self.receber()
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError(m["error"])
                return m.get("result", {})


def main(saida):
    saida = pathlib.Path(saida)
    saida.mkdir(parents=True, exist_ok=True)
    site = subprocess.Popen([sys.executable, "-m", "http.server", str(PORTA_SITE), "--bind", "127.0.0.1"],
                            cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    perfil = tempfile.mkdtemp(prefix="pm-cdp-")
    edge = subprocess.Popen([EDGE, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                             f"--remote-debugging-port={PORTA_CDP}", f"--user-data-dir={perfil}", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        alvo = None
        for _ in range(40):
            try:
                lista = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORTA_CDP}/json"))
                alvo = next(t for t in lista if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.5)
        ws = WS(alvo["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Runtime.enable")   # sem isto, o headless às vezes não executa os scripts da página a tempo
        ws.cmd("Page.bringToFront")
        ws.cmd("Emulation.setFocusEmulationEnabled", enabled=True)
        base = f"http://127.0.0.1:{PORTA_SITE}"
        ws.cmd("Page.navigate", url=base + "/index.html")
        time.sleep(1.5)
        sessao = json.dumps({"id": "grupo exemplo", "nome": "Grupo Exemplo", "turma": "2026.2", "chave": "", "modo": "local"})
        ws.cmd("Runtime.evaluate", expression=f"localStorage.clear(); localStorage.setItem('pm_sessao_v1', {json.dumps(sessao)})")
        filtro = sys.argv[2:] 
        for nome, pagina, sel, w, h in CAPTURAS:
            if filtro and nome not in filtro:
                continue
            ws.cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=w < 700)
            marca = str(random.randint(1, 10**9))
            ws.cmd("Page.navigate", url=base + pagina + "?x=" + marca)
            # espera a página e o portal.js terminarem (barra superior montada)
            for k in range(80):
                pronto = ws.cmd("Runtime.evaluate", returnByValue=True, expression="JSON.stringify([location.search.indexOf('" + marca + "')>=0, document.readyState, !!(document.querySelector('.vd-topbar') || document.getElementById('sidebar') || document.querySelector('.nav-inner')), document.fonts.status])")
                v = json.loads(pronto.get("result", {}).get("value") or "[false]")
                if v[0] and v[1] == "complete" and v[2] and v[3] == "loaded":
                    break
                if k in (20, 40, 60):   # o headless às vezes para no meio do carregamento: recarrega
                    ws.cmd("Page.reload", ignoreCache=True)
                time.sleep(0.25)
            else:
                print("  aviso: página não ficou pronta:", v)
                rec = ws.cmd("Runtime.evaluate", returnByValue=True, expression="JSON.stringify(performance.getEntriesByType('resource').map(function(e){return e.name.split('/').slice(-1)[0].slice(0,40)+' '+Math.round(e.duration)}))")
                print("  recursos carregados:", rec.get("result", {}).get("value"))
            time.sleep(0.6)
            if sel:
                # rola até o id sem animação (descontando a barra do portal e a navegação das seções)
                r = ws.cmd("Runtime.evaluate", returnByValue=True, expression=(
                    "(function(){document.documentElement.style.scrollBehavior='auto';"
                    f"var id={json.dumps(sel)}, el=document.getElementById(id); if(!el) return 'sem alvo';"
                    "window.scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior:'instant'}); return 'ok';})()"))
                if r.get("result", {}).get("value") != "ok":
                    print(f"  aviso: {nome}: alvo {sel} não encontrado ({r})")
                time.sleep(0.9)
            png = ws.cmd("Page.captureScreenshot", format="png")["data"]
            (saida / f"{nome}.png").write_bytes(base64.b64decode(png))
            print("OK ", nome)
        erros = ws.cmd("Runtime.evaluate", returnByValue=True, expression="document.documentElement.scrollWidth > innerWidth ? 'rolagem horizontal!' : 'sem rolagem horizontal'")
        print("última página (520px):", erros["result"]["value"])
    finally:
        encerrar(edge)
        encerrar(site)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "capturas")
