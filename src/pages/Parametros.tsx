import { useState, useEffect } from "react";
import { Save, Settings, Monitor, CheckCircle, Play as PlayIcon, Plus, Trash2 } from "lucide-react";
import "../styles/Parametros.scss";
import { useConfiguracaoAutomacao, type ParametrosValidacao, type ParametrosAutomacao } from "../hooks/useConfiguracaoAutomacao";

export default function Parametros() {
  const {
    configuracaoAtiva,
    setConfiguracaoAtiva,
    configuracoes,
    obterConfiguracaoAtiva,
    salvarConfiguracao,
    adicionarConfiguracao,
    removerConfiguracao,
    criarPayloadExecucao
  } = useConfiguracaoAutomacao();

  const [parametrosValidacao, setParametrosValidacao] = useState<ParametrosValidacao>(
    obterConfiguracaoAtiva()?.validacao || {
      modoExecucao: 'manual',
      numeroNavegadores: 1,
      timeoutCaptcha: 30000,
      tentativasMaximas: 3,
      modoDepuracao: false,
      tipoMonitor: 'FHD'
    }
  );

  const [parametrosAutomacao, setParametrosAutomacao] = useState<ParametrosAutomacao>(
    obterConfiguracaoAtiva()?.automacao || {
      modoExecucao: 'automatico',
      numeroNavegadores: 2,
      timeoutCaptcha: 30000,
      tentativasMaximas: 3,
      modoDepuracao: false,
      tipoMonitor: 'FHD',
      retryEmCasoDeErro: true,
      maximoRetries: 2
    }
  );

  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<string>('');
  const [novaConfiguracao, setNovaConfiguracao] = useState<string>('');
  const [mostrarFormNovaConfig, setMostrarFormNovaConfig] = useState(false);

  // Sincroniza parâmetros quando a configuração ativa muda
  useEffect(() => {
    const configAtiva = obterConfiguracaoAtiva();
    if (configAtiva) {
      setParametrosValidacao(configAtiva.validacao);
      setParametrosAutomacao(configAtiva.automacao);
    }
  }, [configuracaoAtiva, obterConfiguracaoAtiva]);

  // Salvar configuração atual
  const salvarConfiguracaoAtual = () => {
    salvarConfiguracao(parametrosValidacao, parametrosAutomacao);
    
    // Mostrar feedback de sucesso
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.textContent = 'Configuração salva com sucesso!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  // Criar nova configuração
  const criarNovaConfiguracao = () => {
    if (!novaConfiguracao.trim()) {
      alert('Por favor, informe um nome para a nova configuração');
      return;
    }

    if (configuracoes[novaConfiguracao]) {
      alert('Já existe uma configuração com este nome');
      return;
    }

    adicionarConfiguracao(novaConfiguracao, parametrosValidacao, parametrosAutomacao);
    setConfiguracaoAtiva(novaConfiguracao);
    setNovaConfiguracao('');
    setMostrarFormNovaConfig(false);
    
    // Mostrar feedback de sucesso
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.textContent = 'Nova configuração criada com sucesso!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  // Gerar preview do payload
  const gerarPreviewPayload = () => {
    const payload = criarPayloadExecucao(
      'a-partir', // modo padrão para preview
      [2, 3, 4, 5], // linhas de exemplo
      2, // linha inicial
      5, // linha final
      undefined, // linhas selecionadas
      'Empresa Exemplo', // empresa de exemplo
      '12.345.678/0001-90' // CNPJ de exemplo
    );
    
    setPayloadPreview(JSON.stringify(payload, null, 2));
    setMostrarPreview(true);
  };

  // Resetar para valores padrão
  const resetarParaPadrao = () => {
    const configPadrao = configuracoes.padrao;
    if (configPadrao) {
      setParametrosValidacao(configPadrao.validacao);
      setParametrosAutomacao(configPadrao.automacao);
    }
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
            onClick={() => setMostrarFormNovaConfig(true)}
          >
            <Plus size={16} />
            Nova Configuração
          </button>
          <button 
            className="btn btn-secondary"
            onClick={resetarParaPadrao}
          >
            Resetar Padrão
          </button>
          <button 
            className="btn btn-primary"
            onClick={salvarConfiguracaoAtual}
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
          
          {configuracaoAtiva !== 'padrao' && (
            <button
              className="btn btn-danger btn-small"
              onClick={() => removerConfiguracao(configuracaoAtiva)}
              title="Remover configuração"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Formulário para nova configuração */}
        {mostrarFormNovaConfig && (
          <div className="nova-config-form">
            <div className="form-group">
              <label htmlFor="nomeNovaConfig">Nome da Nova Configuração:</label>
              <input
                id="nomeNovaConfig"
                type="text"
                value={novaConfiguracao}
                onChange={(e) => setNovaConfiguracao(e.target.value)}
                placeholder="Digite o nome da configuração"
              />
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-primary"
                onClick={criarNovaConfiguracao}
              >
                Criar
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setMostrarFormNovaConfig(false);
                  setNovaConfiguracao('');
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

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
