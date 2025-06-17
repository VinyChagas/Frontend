import "../styles/Validador.scss";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";

const socket = io("http://localhost:4000");

export default function Validador() {
  const [empresa, setEmpresa] = useState({ nome: "", cnpj: "", clientes: 0 });
  const [linhasAtivas, setLinhasAtivas] = useState<any[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<any[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("http://localhost:4000/empresas")
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) setEmpresa(data[0]);
      });
  }, []);

  useEffect(() => {
    socket.on("progresso", (info) => {
      setLinhasAtivas((prev) => {
        const atualizada = prev.map((l) =>
          l.linha === info.linha
            ? {
                ...l,
                status: info.status,
                captchaImg: info.captchaBase64 || l.captchaImg,
              }
            : l
        );
        const removida = atualizada.filter((l) => {
          if (info.status.toLowerCase().includes("sucesso")) return true;
          if (!info.status.toLowerCase().includes("sucesso")) {
            setLinhasComErro((erroAntigo) => [
              ...erroAntigo,
              { ...l, status: info.status },
            ]);
            return false;
          }
        });
        return removida;
      });
    });

    return () => {
      socket.off("progresso");
    };
  }, []);

  function handleImportarClick() {
    document.getElementById("input-planilha")?.click();
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

        const linhasProcessadas = rows.map((row: any, index: number) => ({
          linha: index + 2,
          Procurador: row["Procurador"]?.toUpperCase() || "",
          Presumido: row["Presumido"]?.toUpperCase() || "",
          empresa: row["empresa"] || "",
          CNPJ: row["CNPJ"] || "",
          usuario: row["usuario"] || "",
          senha: row["senha"] || "",
          status: "carregando",
          captchaImg: "", // Adiciona a propriedade captchaImg
        }));

        setLinhasAtivas(linhasProcessadas);
        linhasProcessadas[0].status = "captcha";
        linhasProcessadas[0].captchaImg = "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EsOTDHZQZdReq1cWyjnsEob8XiVOZswLppOjbFRalu1WKgjj/Z3tw2y/1aw31+oAJUAJAMJNYzLxW71vf+/ru7t7tVqtUvGvXr26fvJUQqOPP7394mc+c6F3NoqjStUBAKNVnB5t7m3GZOI4TunElNLBYHC3f8tftmorzqPB3eHw6IknnqjVbQBbSlmayK+yK+7jN7bf+8m119unK5tbm+++++7yhe4LX7ziOu7ewV4hImMgQAV3LeLSspxxbksptdac28hC1BWWZYPm8XAviuLe4iJZP7X61FNP+J6rQXJC4zRxXEdp/foP3lg/dWp3f7darx6ODiWUTsUxKPzRO3/bC1Ay3HexaVU9qvVkcGRb1js/fYdTHkcxpaweNERZImN++PaPJuPw8698aXFpFSEGgOMknc2j6zduzebRo0d7jlNRCm1v725s7DDqdLtL9+/fX15aYpaNAUshKWUIk3Aeff/7/x6G0ec+90dVv2px+9bNW9d+c+2F51/427/95v7+wa1bt2/evBXHSa0W5HlOKfn+97/31JXL/cODvf3dsixu3bpRqXh//ud//otf/LLZanfaPcqtWrVOCE2znDH25ltvVmvViu+VotBGATKEYoz0v/zjN9fWltq9hXA2Jv/wT3+30GzFSRhFoVQySVPOuV+pnjl7xrEdZjHXcdyK41YcQlBRTl2rYEiODoe9dm+pu2pzT2vq+/WzZy8E9YVmq0uZ5ThemmZpmt24fns8Ca9efa4eNCllADiK44c7D9MkS9Psa//1v33+86+ePXu+3eo+fLj38OGjq888e+LkmudVABChjDIOCD/a3f3Zf/x8Z+fhyuqJz/3R52u1+ngymc3DMIo/vXOnUvFfevmlVru9ubW5t7d34eLFpcWleTS/evUqwWQym2xsbdy5e6fZar36hVeXesu253XaPQAkjUIYGwANBjBaO3kyqAZZmU3nMwOaMpJmyXA4qPrO6ul1IJgzQnsLXaGE53mO45RlyYSYzmYIIc/xSllWKhUA4JQfk3YeZoS2RkdpmlcI66aZrRVOc04ioAQxRkajcbVaHU8jx/Gv3/xEaHPq1Onz5x+zLA6gS1E2G81nn332lc+/UooSYzydzhbaHYLZ/n7/448/+fX7773yyh8pMJPZxHEcxti9e/euXbt28+bN559//uWXX3YrvgLIpbi/tRll6RNP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"

      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = "";
  }

  function enviarCaptcha(linha: number) {
    const codigo = respostaCaptcha[linha];
    fetch("http://localhost:4000/api/resolver-captcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linha, codigo }),
    });
  }

  function renderTabela(linhas: any[]) {
    // Verifica se alguma linha está em status captcha
    const mostrarStatus = linhas.some(linha => linha.status === 'captcha');
    return (
      <table className="validador-tabela">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Procurador</th>
            <th>Presumido</th>
            <th>Empresa</th>
            <th>CNPJ</th>
            {/* Renderiza o cabeçalho Status apenas se necessário */}
            {mostrarStatus && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, idx) => (
            <tr key={idx}>
              <td><div className="validador-tabela-circulo">{linha.linha}</div></td>
              <td><span className={`icone-status ${linha.Procurador === 'SIM' ? 'verde' : 'cinza'}`}>{linha.Procurador === 'SIM' ? '✔' : '●'}</span></td>
              <td><span className={`icone-status ${linha.Presumido === 'SIM' ? 'verde' : 'cinza'}`}>{linha.Presumido === 'SIM' ? '✔' : '●'}</span></td>
              <td>{linha.empresa?.toString().slice(0, 23)}</td>
              <td>{linha.CNPJ}</td>
              {/* Renderiza a célula Status apenas se necessário */}
              {mostrarStatus && (
                <td className={linha.status === 'captcha' ? 'validador-status-animado' : ''}>
                  {linha.status === 'captcha' ? (
                    <div className="validador-captcha-container">
                      <img
                        src={`data:image/png;base64,${linha.captchaImg}`}
                        alt="captcha"
                        width={100}
                        height={30}
                      />
                      <input
                        type="text"
                        maxLength={5}
                        onChange={(e) =>
                          setRespostaCaptcha((prev) => ({
                            ...prev,
                            [linha.linha]: e.target.value,
                          }))
                        }
                        className="validador-captcha-input"
                      />
                      <button
                        onClick={() => enviarCaptcha(linha.linha)}
                        className="validador-captcha-btn"
                      >
                        Enviar
                      </button>
                    </div>
                  ) : (
                    // Célula vazia para manter alinhamento
                    <span></span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
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
            onChange={handleFileChange}
          />
          <button onClick={handleImportarClick} className="validador-importar-btn">
            Importar Planilha
          </button>
        </div>
      </div>

      <div className="validador-tabela-dupla">
        <div>{renderTabela(linhasAtivas)}</div>
        <div>{renderTabela(linhasComErro)}</div>
      </div>
    </div>
  );
}
