import { useState, useEffect } from "react";
import { Save, Settings, Monitor, CheckCircle, Play as PlayIcon } from "lucide-react";
import "../styles/Parametros.scss";

// Tipos para os parâmetros de configuração
interface ParametrosValidacao {
  modoExecucao: 'manual' | 'automatico';
  numeroNavegadores: number;
  timeoutCaptcha: number;
  tentativasMaximas: number;
  modoDepuracao: boolean;
  tipoMonitor: 'FHD' | 'QHD';
}

interface ParametrosAutomacao {
  modoExecucao: 'manual' | 'automatico';
  numeroNavegadores: number;
  timeoutCaptcha: number;
  tentativasMaximas: number;
  modoDepuracao: boolean;
  tipoMonitor: 'FHD' | 'QHD';
  retryEmCasoDeErro: boolean;
  maximoRetries: number;
}



export default function Parametros() {
  const [configuracaoAtiva, setConfiguracaoAtiva] = useState<string>('padrao');
  const [configuracoes, setConfiguracoes] = useState<Record<string, any>>({
    padrao: {
      nome: 'Configuração Padrão',
      validacao: {
        modoExecucao: 'manual',
        numeroNavegadores: 1,
        timeoutCaptcha: 30000,
        tentativasMaximas: 3,
        modoDepuracao: false,
        tipoMonitor: 'FHD'
      },
      automacao: {
        modoExecucao: 'automatico',
        numeroNavegadores: 2,
        timeoutCaptcha: 30000,
        tentativasMaximas: 3,
        modoDepuracao: false,
        tipoMonitor: 'FHD',
        retryEmCasoDeErro: true,
        maximoRetries: 2
      }
    }
  });

  const [parametrosValidacao, setParametrosValidacao] = useState<ParametrosValidacao>(
    configuracoes[configuracaoAtiva]?.validacao || configuracoes.padrao.validacao
  );

  const [parametrosAutomacao, setParametrosAutomacao] = useState<ParametrosAutomacao>(
    configuracoes[configuracaoAtiva]?.automacao || configuracoes.padrao.automacao
  );

  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<string>('');

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const configsSalvas = localStorage.getItem('configuracoesSistema');
    const ativaSalva = localStorage.getItem('configuracaoAtiva');
    if (configsSalvas) {
      try {
        const configs = JSON.parse(configsSalvas);
        setConfiguracoes(configs);
        if (ativaSalva && configs[ativaSalva]) {
          setConfiguracaoAtiva(ativaSalva);
          setParametrosValidacao(configs[ativaSalva].validacao);
          setParametrosAutomacao(configs[ativaSalva].automacao);
          return;
        }
        if (configs[configuracaoAtiva]) {
          setParametrosValidacao(configs[configuracaoAtiva].validacao);
          setParametrosAutomacao(configs[configuracaoAtiva].automacao);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  // Sincroniza parâmetros quando a configuração ativa muda e persiste no localStorage
  useEffect(() => {
    const cfg = configuracoes[configuracaoAtiva];
    if (cfg) {
      setParametrosValidacao(cfg.validacao);
      setParametrosAutomacao(cfg.automacao);
    }
    localStorage.setItem('configuracaoAtiva', configuracaoAtiva);
  }, [configuracaoAtiva, configuracoes]);

  // Salvar configurações no localStorage
  const salvarConfiguracao = () => {
    const novaConfig = {
      ...configuracoes,
      [configuracaoAtiva]: {
        nome: configuracoes[configuracaoAtiva]?.nome || 'Nova Configuração',
        validacao: parametrosValidacao,
        automacao: parametrosAutomacao,
        ultimaModificacao: new Date().toISOString()
      }
    };
    
    setConfiguracoes(novaConfig);
    localStorage.setItem('configuracoesSistema', JSON.stringify(novaConfig));
    
    // Mostrar feedback de sucesso
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.textContent = 'Configuração salva com sucesso!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  // Gerar preview do payload
  const gerarPreviewPayload = () => {
    const payload = {
      configuracao: configuracaoAtiva,
      timestamp: new Date().toISOString(),
      validacao: parametrosValidacao,
      automacao: parametrosAutomacao
    };
    
    setPayloadPreview(JSON.stringify(payload, null, 2));
    setMostrarPreview(true);
  };

  

  // Resetar para valores padrão
  const resetarParaPadrao = () => {
    setParametrosValidacao(configuracoes.padrao.validacao);
    setParametrosAutomacao(configuracoes.padrao.automacao);
  };

  return (
    <div className="parametros-container">
      <div className="parametros-header">
        <div className="header-content">
          <Settings size={32} className="header-icon" />
          <div>
            <h1>Configuração de Parâmetros</h1>
            <p>Configure os modelos de execução para validação e automação</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={resetarParaPadrao}
          >
            Resetar Padrão
          </button>
          <button 
            className="btn btn-primary"
            onClick={salvarConfiguracao}
          >
            <Save size={16} />
            Salvar Configuração
          </button>
        </div>
      </div>

      <div className="parametros-content">
        {/* Seletor de Configuração */}
        <div className="config-selector">
          <label htmlFor="configSelect">Configuração Ativa:</label>
          <select
            id="configSelect"
            value={configuracaoAtiva}
            onChange={(e) => setConfiguracaoAtiva(e.target.value)}
          >
            {Object.keys(configuracoes).map(key => (
              <option key={key} value={key}>
                {configuracoes[key].nome}
              </option>
            ))}
          </select>
        </div>

        <div className="parametros-grid">
          {/* Parâmetros de Validação */}
          <div className="parametros-section">
            <div className="section-header">
              <CheckCircle size={24} />
              <h2>Parâmetros de Validação</h2>
            </div>
            
            <div className="parametros-form">
              <div className="form-group">
                <label>Modo de Execução:</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="modoValidacao"
                      value="manual"
                      checked={parametrosValidacao.modoExecucao === 'manual'}
                      onChange={(e) => setParametrosValidacao({
                        ...parametrosValidacao,
                        modoExecucao: e.target.value as 'manual' | 'automatico'
                      })}
                    />
                    <span>Manual</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="modoValidacao"
                      value="automatico"
                      checked={parametrosValidacao.modoExecucao === 'automatico'}
                      onChange={(e) => setParametrosValidacao({
                        ...parametrosValidacao,
                        modoExecucao: e.target.value as 'manual' | 'automatico'
                      })}
                    />
                    <span>Automático</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="navValidacao">Número de Navegadores:</label>
                <input
                  id="navValidacao"
                  type="number"
                  min="1"
                  max="10"
                  value={parametrosValidacao.numeroNavegadores}
                  onChange={(e) => setParametrosValidacao({
                    ...parametrosValidacao,
                    numeroNavegadores: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="timeoutValidacao">Timeout Captcha (ms):</label>
                <input
                  id="timeoutValidacao"
                  type="number"
                  min="5000"
                  step="1000"
                  value={parametrosValidacao.timeoutCaptcha}
                  onChange={(e) => setParametrosValidacao({
                    ...parametrosValidacao,
                    timeoutCaptcha: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tentativasValidacao">Tentativas Máximas:</label>
                <input
                  id="tentativasValidacao"
                  type="number"
                  min="1"
                  max="10"
                  value={parametrosValidacao.tentativasMaximas}
                  onChange={(e) => setParametrosValidacao({
                    ...parametrosValidacao,
                    tentativasMaximas: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={parametrosValidacao.modoDepuracao}
                    onChange={(e) => setParametrosValidacao({
                      ...parametrosValidacao,
                      modoDepuracao: e.target.checked
                    })}
                  />
                  <span>Modo de Depuração</span>
                </label>
                <small className="form-help">
                  Quando ativado, os navegadores serão exibidos visualmente para monitoramento. 
                  Quando desativado, executam em modo headless (sem interface gráfica).
                </small>
              </div>

              {parametrosValidacao.modoDepuracao && (
                <div className="form-group">
                  <label htmlFor="tipoMonitorValidacao">Tipo de Monitor:</label>
                  <select
                    id="tipoMonitorValidacao"
                    value={parametrosValidacao.tipoMonitor}
                    onChange={(e) => setParametrosValidacao({
                      ...parametrosValidacao,
                      tipoMonitor: e.target.value as 'FHD' | 'QHD'
                    })}
                  >
                    <option value="FHD">FHD (1920x1080)</option>
                    <option value="QHD">QHD (2560x1440)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Parâmetros de Automação */}
          <div className="parametros-section">
                      <div className="section-header">
            <PlayIcon size={24} />
            <h2>Parâmetros de Automação</h2>
          </div>
            
            <div className="parametros-form">
              <div className="form-group">
                <label>Modo de Execução:</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="modoAutomacao"
                      value="manual"
                      checked={parametrosAutomacao.modoExecucao === 'manual'}
                      onChange={(e) => setParametrosAutomacao({
                        ...parametrosAutomacao,
                        modoExecucao: e.target.value as 'manual' | 'automatico'
                      })}
                    />
                    <span>Manual</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="modoAutomacao"
                      value="automatico"
                      checked={parametrosAutomacao.modoExecucao === 'automatico'}
                      onChange={(e) => setParametrosAutomacao({
                        ...parametrosAutomacao,
                        modoExecucao: e.target.value as 'manual' | 'automatico'
                      })}
                    />
                    <span>Automático</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="navAutomacao">Número de Navegadores:</label>
                <input
                  id="navAutomacao"
                  type="number"
                  min="1"
                  max="10"
                  value={parametrosAutomacao.numeroNavegadores}
                  onChange={(e) => setParametrosAutomacao({
                    ...parametrosAutomacao,
                    numeroNavegadores: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="timeoutAutomacao">Timeout Captcha (ms):</label>
                <input
                  id="timeoutAutomacao"
                  type="number"
                  min="5000"
                  step="1000"
                  value={parametrosAutomacao.timeoutCaptcha}
                  onChange={(e) => setParametrosAutomacao({
                    ...parametrosAutomacao,
                    timeoutCaptcha: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tentativasAutomacao">Tentativas Máximas:</label>
                <input
                  id="tentativasAutomacao"
                  type="number"
                  min="1"
                  max="10"
                  value={parametrosAutomacao.tentativasMaximas}
                  onChange={(e) => setParametrosAutomacao({
                    ...parametrosAutomacao,
                    tentativasMaximas: parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={parametrosAutomacao.modoDepuracao}
                    onChange={(e) => setParametrosAutomacao({
                      ...parametrosAutomacao,
                      modoDepuracao: e.target.checked
                    })}
                  />
                  <span>Modo de Depuração</span>
                </label>
                <small className="form-help">
                  Quando ativado, os navegadores serão exibidos visualmente para monitoramento. 
                  Quando desativado, executam em modo headless (sem interface gráfica).
                </small>
              </div>

              {parametrosAutomacao.modoDepuracao && (
                <div className="form-group">
                  <label htmlFor="tipoMonitorAutomacao">Tipo de Monitor:</label>
                  <select
                    id="tipoMonitorAutomacao"
                    value={parametrosAutomacao.tipoMonitor}
                    onChange={(e) => setParametrosAutomacao({
                      ...parametrosAutomacao,
                      tipoMonitor: e.target.value as 'FHD' | 'QHD'
                    })}
                  >
                    <option value="FHD">FHD (1920x1080)</option>
                    <option value="QHD">QHD (2560x1440)</option>
                  </select>
                </div>
              )}

              <div className="form-group checkbox-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={parametrosAutomacao.retryEmCasoDeErro}
                    onChange={(e) => setParametrosAutomacao({
                      ...parametrosAutomacao,
                      retryEmCasoDeErro: e.target.checked
                    })}
                  />
                  <span>Retry em Caso de Erro</span>
                </label>
              </div>

              {parametrosAutomacao.retryEmCasoDeErro && (
                <div className="form-group">
                  <label htmlFor="maximoRetries">Máximo de Retries:</label>
                  <input
                    id="maximoRetries"
                    type="number"
                    min="1"
                    max="5"
                    value={parametrosAutomacao.maximoRetries}
                    onChange={(e) => setParametrosAutomacao({
                      ...parametrosAutomacao,
                      maximoRetries: parseInt(e.target.value)
                    })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="parametros-actions">
          <button 
            className="btn btn-secondary"
            onClick={gerarPreviewPayload}
          >
            <Monitor size={16} />
            Preview do Payload
          </button>
          
          
        </div>

        {/* Preview do Payload */}
        {mostrarPreview && (
          <div className="payload-preview">
            <div className="preview-header">
              <h3>Preview do Payload</h3>
              <button 
                className="btn-close"
                onClick={() => setMostrarPreview(false)}
              >
                ×
              </button>
            </div>
            <pre className="payload-content">
              {payloadPreview}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
