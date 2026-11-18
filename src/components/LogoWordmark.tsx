/** The lowercase wordmark with its small teal dot, as in the mobile app's header. */
export const Wordmark = ({ large }: { large?: boolean }) => (
  <span className={`ot-wordmark${large ? " ot-wordmark--large" : ""}`}>
    offtasks<i>.</i>
  </span>
);

/** Shown while a page decides where to go: the wordmark's letters settle one by one. */
export const WordmarkLoader = ({ label = "Loading Offtasks" }: { label?: string }) => (
  <span className="ot-loader" role="status" aria-label={label}>
    {Array.from("offtasks.").map((letter, index) => (
      <span key={index} aria-hidden="true" style={{ "--i": index } as React.CSSProperties}>
        {letter}
      </span>
    ))}
  </span>
);
