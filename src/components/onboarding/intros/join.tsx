"use client";

export function Join() {
  return (
    <div className="card k-join h-full">
      <div className="poster">
        <div className="prohibition" />
        <div className="poster-title">
          <p className="top">NOT FOR</p>
          <p className="bottom">EVERYONE</p>
        </div>
        <svg
          className="illustration"
          viewBox="0 0 300 300"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Three figures helping each other climb"
        >
          <g fill="#111" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <g className="figure">
              <circle cx="118" cy="204" r="8" stroke="none" />
              <path d="M118 212V240M118 240L108 258M118 240L130 258M118 222L134 198" fill="none" />
            </g>
            <g className="figure">
              <circle cx="150" cy="170" r="8" stroke="none" />
              <path d="M150 178L140 196M140 196L132 200M140 196L152 204M148 182L164 156" fill="none" />
            </g>
            <g className="figure">
              <circle cx="196" cy="128" r="7" stroke="none" />
              <path d="M190 132L170 144L154 140M184 134L204 142" fill="none" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default Join;
