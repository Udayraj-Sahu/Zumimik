"use client";

const FIGHTS =
  "BEAT THE CLOCK • BEAT THE CLOCK • BEAT THE CLOCK • BEAT THE CLOCK • BEAT THE CLOCK • ";

export function Fight1() {
  return (
    <main className="card k-fight1 h-full">
      <div className="eyebrow">Beat the clock</div>

      <h1 className="headline">
        <span>Every</span>
        <span>second</span>
        <span>counts</span>
        <span className="highlight">to win.</span>
      </h1>

      <div className="stopwatch">
        <i />
      </div>

      <svg
        className="duel"
        viewBox="0 0 300 90"
        role="img"
        aria-label="Two players facing each other in a timed challenge"
      >
        <g stroke="#141413" strokeWidth="5" strokeLinecap="round" fill="none">
          <g className="fighter">
            <circle cx="70" cy="22" r="9" fill="#141413" />
            <path d="M70 32V62M70 62L58 86M70 62L84 86M70 40L96 46" />
          </g>
          <g className="fighter">
            <circle cx="230" cy="22" r="9" fill="#141413" />
            <path d="M230 32V62M230 62L216 86M230 62L242 86M230 40L204 46" />
          </g>
        </g>
        <circle className="left-player" cx="100" cy="47" r="9" fill="#ff72be" stroke="#141413" strokeWidth="4" />
        <circle className="right-player" cx="200" cy="47" r="9" fill="#ff72be" stroke="#141413" strokeWidth="4" />
      </svg>

      <div className="ticker">
        <span>{FIGHTS}</span>
        <span aria-hidden="true">{FIGHTS}</span>
      </div>
    </main>
  );
}

export default Fight1;
