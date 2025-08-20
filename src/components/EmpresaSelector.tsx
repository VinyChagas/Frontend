import { useState, useEffect, useRef } from 'react';
import { useEmpresa } from '../contexts/EmpresaContext';
import axios from 'axios';
import { type Empresa } from '../contexts/EmpresaContext';

export default function EmpresaSelector() {
  const { empresaSelecionada, selecionarEmpresa } = useEmpresa();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carrega a lista de empresas
    axios.get("http://localhost:4000/api/empresas")
      .then(res => setEmpresas(res.data))
      .catch(err => {
        console.error("Erro ao buscar empresas", err);
        setEmpresas([]);
      });
  }, []);

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEmpresaSelect = (empresa: Empresa) => {
    selecionarEmpresa(empresa);
    setShowDropdown(false);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="empresa-selector" ref={dropdownRef}>
      <button 
        className={`empresa-selector-button ${empresaSelecionada ? 'has-empresa' : ''}`}
        onClick={toggleDropdown}
        type="button"
      >
        <span className="empresa-selector-text">
          {empresaSelecionada ? empresaSelecionada.nome : 'Clique para selecionar...'}
        </span>
        <span className="empresa-selector-arrow">
          {showDropdown ? '▲' : '▼'}
        </span>
      </button>

      {showDropdown && (
        <div className="empresa-dropdown">
          {empresas.length === 0 ? (
            <div className="empresa-dropdown-empty">
              Nenhuma contabilidade encontrada
            </div>
          ) : (
            empresas.map((empresa) => (
              <button
                key={empresa.id}
                className={`empresa-dropdown-item ${
                  empresaSelecionada?.id === empresa.id ? 'selected' : ''
                }`}
                onClick={() => handleEmpresaSelect(empresa)}
                type="button"
              >
                <div className="empresa-dropdown-info">
                  <div className="empresa-dropdown-nome">{empresa.nome}</div>
                  <div className="empresa-dropdown-cnpj">{empresa.cnpj}</div>
                </div>
                {empresaSelecionada?.id === empresa.id && (
                  <span className="empresa-dropdown-check">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
