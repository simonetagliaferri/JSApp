export default function CardList({ cards, hideIndex = false }) {
  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <article className="card" key={card.id}>
          <img src={card.imageUrl} alt={card.title} />
          <h4>{card.title}</h4>
          {!hideIndex && <p>Bad luck index: <strong>{card.badLuckIndex}</strong></p>}
        </article>
      ))}
    </div>
  );
}
