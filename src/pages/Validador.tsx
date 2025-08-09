import "../styles/Validador.scss";
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
// import { CheckCircle } from "@phosphor-icons/react";
// import {XCircle, Loader2 } from "lucide-react";

// Base da API (permite sobrescrever via Vite env)
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:4000";

// Tipos de dados
interface Empresa {
  nome: string;
  cnpj: string;
  clientes: number;
}

interface Linha {
  linha: number;
  empresa?: string;
  CNPJ?: string;
  usuario?: string;
  senha?: string;
  procurador?: string;
  presumido?: string;
  responsavel?: string;
  codSistema?: string;
  mes?: string;
  ano?: string;
  IM?: string;
  status?: string;
  captchaImg?: string;
  motivo?: string;
  mensagemErro?: string;
  // Progresso individual
  progressPercent?: number; // 0..100
  stepIndex?: number;
  stepTotal?: number;
  stepName?: string;
  isFinalizada?: boolean;
  resultadoFinal?: 'sucesso' | 'erro';
  // Progresso exibido suavizado (removido - voltando ao comportamento anterior)
}

interface ProgressoEvent extends Partial<Linha> {
  linha: number;
  status: string;
  captchaBase64?: string;
  // Campos alternativos que o backend pode enviar
  progressPercent?: number;
  percent?: number;
  progresso?: number;
  stepIndex?: number;
  stepTotal?: number;
  stepName?: string;
  isFinal?: boolean;
}

interface CaptchaEvent {
  linha: number;
  imagem: string;
}

const socket = io(API_BASE_URL);

export default function Validador() {
  const [empresa, setEmpresa] = useState<Empresa>({ nome: "", cnpj: "", clientes: 0 });
  const [linhasAtivas, setLinhasAtivas] = useState<Linha[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<Linha[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number,string>>({});
  const [captchaImgBase64, setCaptchaImgBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [linhaCaptchaAtual, setLinhaCaptchaAtual] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [globalProgress, setGlobalProgress] = useState<number>(0);
// Captura o captcha enviado pelo backend via socket e exibe para o usuário
useEffect(() => {
  function handleCaptcha(data: CaptchaEvent) {
    // Se for o mesmo captcha (mesma linha), só atualiza a imagem e limpa o input
    setCaptchaImgBase64(data.imagem);
    setCaptchaInput("");
    setLinhaCaptchaAtual((linhaAtual) => {
      // Se for um novo captcha para a mesma linha, mantém a linha
      if (linhaAtual === data.linha) return linhaAtual;
      // Se for para outra linha, atualiza
      return data.linha;
    });
  }
  socket.on("captcha", handleCaptcha);
  return () => {
    socket.off("captcha", handleCaptcha);
  };
}, []);

// Função para enviar a resposta do captcha para o backend via socket
function enviarCaptchaParaBackend(valor?: string) {
  const resposta = valor !== undefined ? valor : captchaInput;
  if (resposta && resposta.length === 5 && linhaCaptchaAtual != null) {
    socket.emit("captcha-resposta", {
      linha: linhaCaptchaAtual,
      resposta
    });
    // Não limpa o estado aqui! Só limpa quando o backend retornar sucesso para a linha
  }
}


// Consolidado: único useEffect para socket.on("progresso")
useEffect(() => {
  function handleProgresso(info: ProgressoEvent) {
    const { linha, status } = info;
    setLinhasAtivas((prevAtivas) => {
      // calcula percent
      let percentFromInfo: number | undefined = undefined;
      if (typeof info.progressPercent === 'number') percentFromInfo = info.progressPercent;
      else if (typeof info.percent === 'number') percentFromInfo = info.percent;
      else if (typeof info.progresso === 'number') percentFromInfo = info.progresso;
      else if (typeof info.stepIndex === 'number' && typeof info.stepTotal === 'number' && info.stepTotal! > 0) {
        percentFromInfo = (info.stepIndex! / info.stepTotal!) * 100;
      }

      const lowerStatus = (status || '').toLowerCase();
      const isFinalFromStatus = /(final|conclu|empresa validada|completo|terminad)/i.test(status || '');
      const isSuccessFromStatus = /(sucesso|conclu|ok)/i.test(status || '');
      const isErrorFromStatus = /(erro|falha|inválid|inval|fracass)/i.test(status || '');
      const isFinal = Boolean(info.isFinal || isFinalFromStatus);

      // fallback baseado em estágios quando não veio percent
      let fallbackPercent: number | undefined = undefined;
      if (percentFromInfo === undefined) {
        if (lowerStatus.includes('login')) fallbackPercent = 25;
        else if (lowerStatus.includes('valid')) fallbackPercent = 75; // validação
        else if (lowerStatus.includes('captcha')) fallbackPercent = 10;
        else if (lowerStatus.includes('carregando')) fallbackPercent = 50;
      }

      let atualizadas = prevAtivas.map((l) =>
        l.linha === linha
          ? {
              ...l,
              status,
              captchaImg: info.captchaBase64 || l.captchaImg,
              stepIndex: info.stepIndex ?? l.stepIndex,
              stepTotal: info.stepTotal ?? l.stepTotal,
              stepName: info.stepName ?? l.stepName,
              progressPercent: (() => {
                const base = percentFromInfo ?? l.progressPercent ?? fallbackPercent ?? 0;
                const bounded = Math.max(0, Math.min(100, Math.round(base)));
                if (isFinal) return 100;
                // Evita 100% antes do final
                return Math.min(bounded, 99);
              })(),
              isFinalizada: isFinal || l.isFinalizada,
              resultadoFinal: isFinal
                ? (isErrorFromStatus ? 'erro' : (isSuccessFromStatus ? 'sucesso' : l.resultadoFinal))
                : l.resultadoFinal,
              // Remove displayedProgress fix
            }
          : l
      );

      if (status.toLowerCase().includes("sucesso")) {
        // Se for sucesso para a linha do captcha, limpa o estado de captcha
        if (linhaCaptchaAtual === linha) {
          setCaptchaImgBase64(null);
          setCaptchaInput("");
          setLinhaCaptchaAtual(null);
        }
        // Mantém a ordem original das linhas (não reordena para o final)
        return atualizadas;
      }
      // Se for erro, só remove da lista se NÃO for a linha do captcha atual
      if (status.toLowerCase().includes("erro")) {
        if (linhaCaptchaAtual === linha) {
          // Mantém a linha para permitir nova tentativa de captcha
          return atualizadas;
        }
        // Remove da lista de ativas normalmente para outros casos
        return atualizadas.filter((l) => l.linha !== linha);
      }
      return atualizadas;
    });
    // Se for erro, adiciona em linhasComErro
    if (status.toLowerCase().includes("erro")) {
      setLinhasComErro((erroAntigo) => {
        const jaExiste = erroAntigo.some((l) => l.linha === linha);
        if (jaExiste) return erroAntigo;
        return [...erroAntigo, { ...info }];
      });
    }
  }
  socket.on("progresso", handleProgresso);
  return () => {
    socket.off("progresso", handleProgresso);
  };
}, [linhaCaptchaAtual]);

// Progresso global baseado na média dos percentuais por linha
useEffect(() => {
  if (!linhasAtivas || linhasAtivas.length === 0) {
    setGlobalProgress(0);
    return;
  }
  const percents = linhasAtivas.map((l) => {
    if (l.isFinalizada) return 100;
    if (typeof l.progressPercent === 'number') return Math.min(l.progressPercent, 99);
    if (l.status?.toLowerCase().includes('carregando')) return 50;
    if (l.status?.toLowerCase().includes('captcha')) return 10;
    return 0;
  });
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  setGlobalProgress(Math.round(avg));
}, [linhasAtivas]);

// Removida a simulação de números aleatórios


useEffect(() => {
  fetch(`${API_BASE_URL}/api/empresas`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length > 0) {
        setEmpresa(data[0]);

        // Carrega JSON da contabilidade
        const nomeContabilidade = data[0].nome;
        const nomeArquivoSeguro = nomeContabilidade.replace(/[^\w\d]/g, '_');
        fetch(`${API_BASE_URL}/api/validacoes/${encodeURIComponent(nomeArquivoSeguro)}`)
          .then(res => res.json())
          .then(dados => {
            if (Array.isArray(dados)) {
              setLinhasAtivas(dados);
            } else {
              console.warn('Nenhum dado encontrado para esta contabilidade.');
            }
          })
          .catch(err => console.error('Erro ao carregar JSON da contabilidade:', err));
      }
      });
  }, []);



useEffect(() => {
  async function carregarValidacoes() {
    try {
      const nomeTratado = empresa.nome.replace(/[^\w\d]/g, '_');
      const res = await fetch(`${API_BASE_URL}/empresas/validacoes/${nomeTratado}`);
      if (!res.ok) {
        console.warn('Nenhum dado de validação encontrado.');
        return;
      }

      const validacoesSalvas = await res.json();
      setLinhasAtivas((prev) =>
        prev.map((linha) => {
          const validada = (validacoesSalvas as Linha[]).find((v: Linha) => v.linha === linha.linha);
          return validada ? { ...linha, status: validada.status || linha.status } : linha;
        })
      );
    } catch (err) {
      console.error('Erro ao carregar validações:', err);
    }
  }

  if (empresa?.nome) {
    carregarValidacoes();
  }
}, [empresa]);
  function handleImportarClick() {
    // Usa ref para evitar query por id
    fileInputRef.current?.click();
  }

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Processa localmente para exibir imediatamente
      const linhasProcessadas = (rows as any[]).map((row: any, index: number) => ({
        linha: index + 2,
        procurador: row["Procurador"]?.toUpperCase() || "",
        presumido: row["Presumido"]?.toUpperCase() || "",
        empresa: row["empresa"] || "",
        CNPJ: row["CNPJ"] || "",
        usuario: row["usuario"] || "",
        senha: row["senha"] || "",
        status: "",
        captchaImg: "",
      }));
      setLinhasAtivas(linhasProcessadas);
    };
    reader.readAsArrayBuffer(file);
  }
  e.target.value = "";
}
// Função antiga de resolver captcha via REST removida (agora via socket e card manual)

  const executarValidacao = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/executar-validacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
      contabilidade: empresa.nome,
      modoLogin,
      modoResolucao: resolucao,
      qtdNavegadores,
      }),
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      alert("✅ Validação concluida com sucesso!");
    } else {
      alert("❌ Erro ao iniciar validação: " + resultado.erro);
    }
  } catch (error) {
    console.error("Erro ao executar validação:", error);
    alert("Erro ao executar validação.");
  }
};

  const salvarNoBackend = async () => {
  try {
      const res = await fetch(`${API_BASE_URL}/api/salvar-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contabilidade: empresa.nome,
        dados: linhasAtivas,
      }),
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      alert('✅ JSON salvo com sucesso no backend!');
    } else {
      alert('Erro ao salvar JSON: ' + resultado.erro);
    }
  } catch (err) {
    console.error('Erro ao salvar JSON no backend:', err);
    alert('Erro ao salvar JSON no backend.');
  }
};

function renderTabela(linhas: Linha[]) {
  return (
    <table className="validador-tabela">
      <thead>
        <tr>
          <th>Linha</th>
          <th>Procurador</th>
          <th>Presumido</th>
          <th>Empresa</th>
          <th>CNPJ</th>
          <th>Progresso</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr
            key={linha.linha}
            className={`validador-tabela-row ${
              linha.status?.toLowerCase().includes("sucesso")
                ? "status-sucesso"
                : linha.status?.toLowerCase().includes("erro")
                ? "status-erro"
                : linha.status === "carregando"
                ? "status-carregando"
                : ""
            }`}
          >
            <td>
              <div className="validador-tabela-circulo">{linha.linha}</div>
            </td>
            <td>
              <span className={`icone-status ${linha.procurador === 'SIM' ? 'verde' : 'cinza'}`}>
                {linha.procurador === 'SIM' ? '✔' : ''}
              </span>
            </td>
            <td>
              <span className={`icone-status ${linha.presumido === 'SIM' ? 'verde' : 'cinza'}`}>
                {linha.presumido === 'SIM' ? '✔' : ''}
              </span>
            </td>
            <td>{linha.empresa?.toString().slice(0, 23)}</td>
            <td>{linha.CNPJ}</td>
            {/* Progresso da linha */}
            <td>
              <div className="validador-row-progress">
                <div className="validador-progress-track">
                  <div
                    className={`validador-progress-bar ${
                      linha.isFinalizada && linha.resultadoFinal === 'erro'
                        ? 'erro'
                        : linha.isFinalizada && linha.resultadoFinal === 'sucesso'
                        ? 'sucesso'
                        : 'carregando'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (linha.isFinalizada ? 100 : (linha.progressPercent ?? (linha.status?.toLowerCase().includes('carregando') ? 50 : linha.status?.toLowerCase().includes('captcha') ? 10 : 0)))))}%` }}
                  />
                </div>
                <span className="validador-progress-label">
                  {Math.round(Math.max(0, Math.min(100, (linha.isFinalizada ? 100 : (linha.progressPercent ?? (linha.status?.toLowerCase().includes('carregando') ? 50 : linha.status?.toLowerCase().includes('captcha') ? 10 : 0))))))}%
                </span>
              </div>
            </td>
            {/* Ícones de status removidos conforme solicitado */}
            {/* CAPTCHAS VISUAIS */}
            {linha.status === 'captcha' && (
              <td colSpan={5} className="validador-tabela-captcha-overlay-cell">
                <div className={`validador-captcha-overlay validador-captcha-bg-${linha.status?.toLowerCase()}`}>
                  <img
                    src={`data:image/png;base64,${linha.captchaImg}`}
                    alt="captcha"
                    width={100}
                    height={30}
                  />
                  <input
                    type="text"
                    maxLength={5}
                    value={respostaCaptcha[linha.linha] || ""}
                    onChange={(e) =>
                      setRespostaCaptcha((prev) => ({
                        ...prev,
                        [linha.linha]: e.target.value,
                      }))
                    }
                    className="validador-captcha-input"
                  />
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Tabela especial para erros
function renderTabelaErros(linhas: Linha[]) {
  return (
    <table className="validador-tabela validador-tabela-erro">
      <thead>
        <tr>
          <th>Linha</th>
          <th>Empresa</th>
          <th>CNPJ</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <React.Fragment key={linha.linha}>
            <tr
              className="validador-tabela-row status-erro validador-tabela-row-erro"
              style={{ borderBottom: '2px solid #e57373', borderLeft: '4px solid #e57373', background: '#fff6f6' }}
            >
              <td>
                <div className="validador-tabela-circulo erro" style={{ background: 'linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)', color: '#fff', border: '1.5px solid #e57373' }}>
                  {linha.linha}
                </div>
              </td>
              <td>{linha.empresa?.toString().slice(0, 23)}</td>
              <td>{linha.CNPJ}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ color: '#b71c1c', fontSize: 13, padding: '4px 12px 10px 32px', background: '#fff6f6', borderBottom: '2px solid #e57373' }}>
                <strong>Motivo:</strong> {linha.motivo || linha.mensagemErro || linha.status || 'Erro desconhecido'}
              </td>
            </tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

// ListaStatusEmpresas removido pois não é utilizado
const [modoLogin,      setModoLogin]      = useState<'automatico' | 'manual'>('manual');
const [resolucao,      setResolucao]      = useState<'FHD' | 'QHD'>('FHD');
const [qtdNavegadores, setQtdNavegadores] = useState<number>(1);

const captchaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleCaptchaInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
  setCaptchaInput(value);
  if (captchaTimeout.current) clearTimeout(captchaTimeout.current);
  if (value.length === 5) {
    captchaTimeout.current = setTimeout(() => {
      enviarCaptchaParaBackend(value);
    }, 500); // 500ms debounce
  }
}

return (
  <div className="validador-container">
    <div className="validador-top-row">
      <div className="validador-header-info">
        <h1 className="validador-titulo">{empresa.nome}</h1>
        <div className="validador-empresa-dados">
          <span><strong>CNPJ:</strong> {empresa.cnpj}</span>
          <span><strong>Clientes:</strong> {empresa.clientes}</span>
        </div>
      </div>
      <div>
        <input
          id="input-planilha"
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button onClick={handleImportarClick} className="validador-importar-btn">
          Importar Planilha
        </button>
      </div>
    </div>

    <div className="validador-actions-bar">
      <div className="validador-actions-left">
        <label className="validador-label-modo">
          <span>Modo:</span>
          {/* automático / manual */}
          <select
            className="validador-select-modo"
            value={modoLogin}
            onChange={e => setModoLogin(e.target.value as 'automatico' | 'manual')}
          >
            <option value="automatico">Automático</option>
            <option value="manual">Manual</option>
          </select>
          {/* resolução */}
          <select
            className="validador-select-modo"
            value={resolucao}
            onChange={e => setResolucao(e.target.value as 'FHD' | 'QHD')}
          >
            <option value="FHD">FHD</option>
            <option value="QHD">QHD</option>
          </select>
          {/* quantidade de navegadores */}
          <select
            className="validador-select-modo"
            value={qtdNavegadores}
            onChange={e => setQtdNavegadores(parseInt(e.target.value, 10))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </label>
        {/* Exibe o card de captcha somente se modoLogin for 'manual' */}
        {modoLogin === 'manual' && (
          <div className="validador-captcha-card">
            <span className="validador-captcha-label">Captcha:</span>
            <div className="validador-captcha-img-area">
              {captchaImgBase64 ? (
                <img src={`data:image/png;base64,${captchaImgBase64}`} alt="captcha" />
              ) : (
                <span style={{ color: "#2563eb", opacity: 0.7, fontWeight: 600, fontSize: 13 }}></span>
              )}
            </div>
            <input
              className="validador-captcha-input"
              type="text"
              maxLength={5}
              pattern="[0-9]*"
              inputMode="numeric"
              value={captchaInput}
              onChange={handleCaptchaInputChange}
              placeholder="00000"
            />
          </div>
        )}
      </div>
      <div className="validador-actions-center">
          {/* Progresso global */}
          <div className="validador-global-progress">
            <div className="validador-progress-track">
              <div
                className={`validador-progress-bar ${globalProgress >= 100 ? 'sucesso' : globalProgress === 0 ? 'carregando' : 'carregando'}`}
                style={{ width: `${Math.max(0, Math.min(100, globalProgress))}%` }}
              />
            </div>
            <span className="validador-progress-label">{globalProgress}%</span>
          </div>
          <button className="validador-btn-executar" type="button" onClick={executarValidacao}>
            Executar
          </button>
        <button className="validador-btn-executar" type="button" onClick={salvarNoBackend}>
          Salvar
        </button>
      </div>
      <div className="validador-actions-right">
        <button
          className="validador-btn-exportar"
          type="button"
        >
          Exportar PDF
        </button>
        <button
          className="validador-btn-executar"
          type="button"
          style={{ marginTop: 12 }}
          onClick={async () => {
            await fetch(`${API_BASE_URL}/api/pausar-automacao`, { method: "POST" });
            alert("Automação pausada!");
          }}
        >
          Pausar Automação
        </button>
        <button
          className="validador-btn-executar"
          type="button"
          style={{ marginTop: 12 }}
          onClick={async () => {
            await fetch(`${API_BASE_URL}/api/parar-automacao`, { method: "POST" });
            alert("Automação parada!");
          }}
        >
          Parar Automação
        </button>
      </div>
    </div>

    <div className="validador-tabela-dupla">
      <div>{renderTabela(linhasAtivas)}</div>
      <div>{renderTabelaErros(linhasComErro)}</div>
    </div>
  </div>
);
}