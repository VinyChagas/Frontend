import "../styles/Home.scss";

const cards = [
  {
    title: "SCS",
    subtitle: "Contabilidade",
    // futuros dados: empresas, erros, status
  },
  {
    title: "ABC",
    subtitle: "Consultoria",
    // futuros dados: empresas, erros, status
  },
  {
    title: "XYZ",
    subtitle: "Financeiro",
    // futuros dados: empresas, erros, status
  },
];

export default function Home() {
  return (
    <div className="home-cards-container">
      {cards.map((card, idx) => (
        <div className="home-card" key={idx}>
          <div className="home-card-header">
            <div className="home-card-logo" />
            <div className="home-card-title-group">
              <span className="home-card-title">{card.title}</span>
              <span className="home-card-subtitle">{card.subtitle}</span>
            </div>
          </div>
          <div className="home-card-divider" />
          <div className="home-card-indicators">
            <div className="home-card-indicator">
              <span className="home-card-indicator-label">Empresas</span>
              <div className="home-card-indicator-value home-card-indicator-value--wide" />
            </div>
            <div className="home-card-indicator">
              <span className="home-card-indicator-label">Erros</span>
              <div className="home-card-indicator-value home-card-indicator-value--wide" />
            </div>
            <div className="home-card-indicator">
              <span className="home-card-indicator-label">Status</span>
              <div className="home-card-indicator-status home-card-indicator-status--wide" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
