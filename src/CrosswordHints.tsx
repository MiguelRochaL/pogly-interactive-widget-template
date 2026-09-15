export const HintSection = ({ heading, children }: any) => {
  return (
    <section className="hints-section">
      <h2 className="hints-heading">{heading}</h2>
      <ul className="hint-list" role="list">
        {children}
      </ul>
    </section>
  );
};

export const Hint = ({ num, children }: any) => {
  return (
    <li className="hint">
      <span className="hint-num" aria-hidden>
        {num}
      </span>
      <span id={num + "_hint-text"} className="hint-text">
        {children}
      </span>
    </li>
  );
};
