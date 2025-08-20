import { useEmpresa } from '../contexts/EmpresaContext';
import { useNavigate } from 'react-router-dom';

export default function EmpresaSelector() {
  const { empresaSelecionada, limparEmpresaSelecionada } = useEmpresa();
  const navigate = useNavigate();

  if (!empresaSelecionada) {
    return null;
  }

  const handleTrocarEmpresa = () => {
    limparEmpresaSelecionada();
    navigate('/home');
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      padding: '1rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '1px solid #e5e7eb',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Empresa Atual:</strong>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontWeight: 600, color: '#1f2937' }}>
          {empresaSelecionada.nome}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          CNPJ: {empresaSelecionada.cnpj}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Clientes: {empresaSelecionada.clientes}
        </div>
      </div>
      <button
        onClick={handleTrocarEmpresa}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500
        }}
      >
        Trocar Empresa
      </button>
    </div>
  );
}
