import { useState, useEffect, useCallback } from "react";

const STORAGE_KEYS = {
  squad: "matchday:squad",
  fixtures: "matchday:fixtures",
  payments: "matchday:payments",
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Matchday() {
  const [squad, setSquad] = useState([]);
  const [fixtures, setFixtures] = useState(null); // { items: [...], bye, createdAt } | null
  const [payments, setPayments] = useState([]);

  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [payPlayer, setPayPlayer] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  // ---------- load ----------
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [squadRes, fixturesRes, paymentsRes] = await Promise.allSettled([
          window.storage.get(STORAGE_KEYS.squad, true),
          window.storage.get(STORAGE_KEYS.fixtures, true),
          window.storage.get(STORAGE_KEYS.payments, true),
        ]);
        if (!mounted) return;

        if (squadRes.status === "fulfilled" && squadRes.value) {
          setSquad(JSON.parse(squadRes.value.value));
        }
        if (fixturesRes.status === "fulfilled" && fixturesRes.value) {
          setFixtures(JSON.parse(fixturesRes.value.value));
        }
        if (paymentsRes.status === "fulfilled" && paymentsRes.value) {
          setPayments(JSON.parse(paymentsRes.value.value));
        }
      } catch (e) {
        setError("Couldn't load saved data. Starting fresh.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (key, value) => {
    setSaving(true);
    try {
      const res = await window.storage.set(key, JSON.stringify(value), true);
      if (!res) throw new Error("no result");
    } catch (e) {
      setError("Save failed — your last change may not be visible to others.");
    } finally {
      setSaving(false);
    }
  }, []);

  // ---------- squad ----------
  function addPlayer(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    const next = [...squad, { id: uid(), name }];
    setSquad(next);
    setNameInput("");
    persist(STORAGE_KEYS.squad, next);
  }

  function removePlayer(id) {
    const next = squad.filter((p) => p.id !== id);
    setSquad(next);
    persist(STORAGE_KEYS.squad, next);
  }

  function clearSquad() {
    if (!squad.length) return;
    if (!window.confirm("Clear the whole squad list? Fixtures and money stay untouched.")) return;
    setSquad([]);
    persist(STORAGE_KEYS.squad, []);
  }

  // ---------- fixtures ----------
  function drawFixtures() {
    if (squad.length < 2) return;
    const names = shuffle(squad.map((p) => p.name));
    const items = [];
    let bye = null;
    for (let i = 0; i < names.length; i += 2) {
      if (i + 1 < names.length) {
        items.push({ id: uid(), home: names[i], away: names[i + 1] });
      } else {
        bye = names[i];
      }
    }
    const next = { items, bye, createdAt: new Date().toISOString() };
    setFixtures(next);
    persist(STORAGE_KEYS.fixtures, next);
  }

  function clearFixtures() {
    if (!fixtures) return;
    if (!window.confirm("Clear the saved fixtures? Everyone will lose this draw.")) return;
    setFixtures(null);
    persist(STORAGE_KEYS.fixtures, null);
  }

  // ---------- payments ----------
  function addPayment(e) {
    e.preventDefault();
    const name = payPlayer.trim();
    const amount = parseFloat(payAmount);
    if (!name || !amount || amount <= 0) return;
    const entry = {
      id: uid(),
      name,
      amount,
      note: payNote.trim(),
      timestamp: new Date().toISOString(),
    };
    const next = [...payments, entry];
    setPayments(next);
    persist(STORAGE_KEYS.payments, next);
    setPayAmount("");
    setPayNote("");
  }

  function removePayment(id) {
    const next = payments.filter((p) => p.id !== id);
    setPayments(next);
    persist(STORAGE_KEYS.payments, next);
  }

  const totals = payments.reduce((acc, p) => {
    acc[p.name] = (acc[p.name] || 0) + p.amount;
    return acc;
  }, {});
  const grandTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "radial-gradient(ellipse at top, #0e2c1c 0%, #0a1f14 70%)",
        color: "#eef7ef",
        fontFamily: "'Arial Narrow','Helvetica Neue',Arial,sans-serif",
        padding: "28px 14px 60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 600 }}>
        {/* HEADER */}
        <header style={{ marginBottom: 24, position: "relative", paddingBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#c8ff3d",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: "#c8ff3d",
                clipPath: "polygon(0 0,100% 0,100% 100%)",
                display: "inline-block",
              }}
            />
            Kickoff Draw
            {saving && <span style={{ color: "#7fa896", fontWeight: 400, letterSpacing: "0.1em" }}>· saving…</span>}
          </div>
          <h1
            style={{
              fontFamily: "'Arial Black','Helvetica Neue',sans-serif",
              fontWeight: 900,
              fontSize: "clamp(36px,10vw,54px)",
              lineHeight: 0.88,
              margin: 0,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              fontStyle: "italic",
              transform: "skewX(-3deg)",
            }}
          >
            MATCH<span style={{ color: "#c8ff3d" }}>DAY</span>
          </h1>
          <p style={{ marginTop: 12, fontSize: 13, color: "#7fa896", maxWidth: 440, lineHeight: 1.55, fontStyle: "normal" }}>
            Shared squad, shared draw, shared money — everyone who opens this page sees the same thing.
          </p>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, #c8ff3d 0%, #c8ff3d 40%, transparent 40%, transparent 60%, #3de8e0 60%, #3de8e0 100%)",
            }}
          />
        </header>

        {error && (
          <div
            style={{
              background: "rgba(214,96,74,0.15)",
              border: "1px solid #d6604a",
              color: "#ffb4a3",
              fontSize: 12,
              padding: "10px 14px",
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={panelEmptyStyle}>Loading shared data…</div>
        ) : (
          <>
            {/* SQUAD PANEL */}
            <Panel title="Squad List" countLabel={`${squad.length} ${squad.length === 1 ? "PLAYER" : "PLAYERS"}`}>
              <form onSubmit={addPlayer} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter player name…"
                  maxLength={40}
                  autoComplete="off"
                  style={inputStyle}
                />
                <button type="submit" style={btnStyle}>
                  Add
                </button>
              </form>

              {squad.length === 0 ? (
                <p style={{ fontSize: 13, color: "#7fa896", padding: "6px 2px 10px" }}>
                  Squad's empty — add at least two players to draw fixtures.
                </p>
              ) : (
                <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {squad.map((p, i) => (
                    <li
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "rgba(0,0,0,0.25)",
                        borderLeft: "3px solid #c8ff3d",
                        padding: "10px 14px",
                        fontSize: 14,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Arial Black',sans-serif",
                          fontStyle: "italic",
                          fontSize: 13,
                          color: "#0a1f14",
                          background: "#3de8e0",
                          minWidth: 26,
                          height: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </span>
                      <button
                        onClick={() => removePlayer(p.id)}
                        aria-label={`Remove ${p.name}`}
                        style={removeBtnStyle}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={drawFixtures}
                  disabled={squad.length < 2}
                  style={{ ...btnStyle, ...fullBtnStyle, ...(squad.length < 2 ? disabledBtnStyle : {}) }}
                >
                  Kick Off Draw
                </button>
                <button onClick={clearSquad} style={ghostBtnStyle}>
                  Clear
                </button>
              </div>
            </Panel>

            {/* FIXTURES */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
              {fixtures ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
                    <span
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "#ffcf4d",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fixtures.items.length} {fixtures.items.length === 1 ? "Fixture" : "Fixtures"}
                    </span>
                    <span style={{ flex: 1, height: 1, background: "#1d4a32" }} />
                    <button onClick={clearFixtures} style={{ ...ghostBtnStyle, padding: "6px 10px", fontSize: 10 }}>
                      Clear draw
                    </button>
                  </div>

                  {fixtures.items.map((f, idx) => (
                    <div key={f.id}>
                      <div
                        style={{
                          background: "linear-gradient(135deg, #123726 0%, #0d2118 100%)",
                          border: "1px solid #1d4a32",
                          boxShadow: "0 10px 0 rgba(0,0,0,0.35)",
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "stretch",
                          clipPath: "polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div style={slotStyle}>
                          <span style={{ ...tagStyle, color: "#c8ff3d" }}>Home</span>
                          <span style={fnameStyle}>{f.home}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0,0,0,0.35)",
                            padding: "0 14px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Arial Black',sans-serif",
                              fontStyle: "italic",
                              fontWeight: 900,
                              color: "#ffcf4d",
                              fontSize: 16,
                            }}
                          >
                            VS
                          </span>
                          <span style={{ fontSize: 9, color: "#7fa896", letterSpacing: "0.15em", marginTop: 2 }}>FT</span>
                        </div>
                        <div style={slotStyle}>
                          <span style={{ ...tagStyle, color: "#3de8e0" }}>Away</span>
                          <span style={fnameStyle}>{f.away}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.2em",
                          color: "#7fa896",
                          textTransform: "uppercase",
                          padding: "4px 2px 0",
                          fontWeight: 700,
                        }}
                      >
                        Fixture {idx + 1}
                      </div>
                    </div>
                  ))}

                  {fixtures.bye && (
                    <div
                      style={{
                        background: "rgba(0,0,0,0.22)",
                        border: "1px dashed #1d4a32",
                        padding: "14px 16px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "#7fa896",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      On the bench this round
                      <span
                        style={{
                          display: "block",
                          fontFamily: "'Arial Black',sans-serif",
                          fontStyle: "italic",
                          fontWeight: 900,
                          fontSize: 18,
                          color: "#ffcf4d",
                          textTransform: "uppercase",
                          marginTop: 5,
                        }}
                      >
                        {fixtures.bye}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div style={panelEmptyStyle}>No fixtures yet.<br />Build the squad list above, then kick off the draw.</div>
              )}
            </div>

            {/* MONEY PANEL */}
            <Panel title="Collected Money" countLabel={`${formatMoney(grandTotal)} TOTAL`}>
              <form onSubmit={addPayment} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <input
                  list="matchday-player-names"
                  value={payPlayer}
                  onChange={(e) => setPayPlayer(e.target.value)}
                  placeholder="Player name…"
                  style={{ ...inputStyle, flex: "1 1 140px" }}
                />
                <datalist id="matchday-player-names">
                  {squad.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ ...inputStyle, flex: "0 1 100px" }}
                />
                <input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Note (optional)"
                  style={{ ...inputStyle, flex: "1 1 120px" }}
                />
                <button type="submit" style={btnStyle}>
                  Add
                </button>
              </form>

              {sortedTotals.length === 0 ? (
                <p style={{ fontSize: 13, color: "#7fa896", padding: "6px 2px 10px" }}>
                  No money collected yet — log a payment above.
                </p>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#7fa896",
                      fontWeight: 700,
                      marginBottom: 8,
                      paddingLeft: 2,
                    }}
                  >
                    By Player
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {sortedTotals.map(([name, total]) => (
                      <div
                        key={name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(0,0,0,0.25)",
                          borderLeft: "3px solid #3de8e0",
                          padding: "10px 14px",
                          fontSize: 14,
                        }}
                      >
                        <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>{name}</span>
                        <span style={{ fontFamily: "'Arial Black',sans-serif", fontStyle: "italic", color: "#ffcf4d", fontWeight: 900 }}>
                          {formatMoney(total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#7fa896",
                      fontWeight: 700,
                      marginBottom: 8,
                      paddingLeft: 2,
                    }}
                  >
                    Payment Log
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto" }}>
                    {payments
                      .slice()
                      .reverse()
                      .map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: "rgba(0,0,0,0.18)",
                            padding: "8px 12px",
                            fontSize: 12.5,
                            border: "1px solid #1d4a32",
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <strong style={{ textTransform: "uppercase" }}>{p.name}</strong>
                            {p.note ? <span style={{ color: "#7fa896" }}> — {p.note}</span> : null}
                          </span>
                          <span style={{ color: "#c8ff3d", fontWeight: 700, flexShrink: 0 }}>{formatMoney(p.amount)}</span>
                          <button onClick={() => removePayment(p.id)} aria-label="Remove payment" style={removeBtnStyle}>
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Panel>
          </>
        )}

        <footer style={{ marginTop: 32, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#4d6b5b", textAlign: "center" }}>
          Fair Draw — Fisher–Yates Shuffle · Shared with everyone viewing this page
        </footer>
      </div>
    </div>
  );
}

function Panel({ title, countLabel, children }) {
  return (
    <div
      style={{
        background: "linear-gradient(165deg, #123726, #0d2118)",
        border: "1px solid #1d4a32",
        boxShadow: "0 10px 0 rgba(0,0,0,0.35), inset 0 0 40px rgba(200,255,61,0.03)",
        marginBottom: 26,
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          background: "rgba(0,0,0,0.25)",
          borderBottom: "1px solid #1d4a32",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            color: "#0a1f14",
            background: "#c8ff3d",
            fontWeight: 900,
            padding: "3px 9px",
            fontSize: 11,
            letterSpacing: "0.05em",
            clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
            whiteSpace: "nowrap",
          }}
        >
          {countLabel}
        </span>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>{children}</div>
    </div>
  );
}

const panelEmptyStyle = {
  textAlign: "center",
  padding: "40px 18px",
  border: "1px dashed #1d4a32",
  color: "#7fa896",
  fontSize: 13,
  lineHeight: 1.6,
  background: "rgba(0,0,0,0.12)",
};

const inputStyle = {
  flex: 1,
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 700,
  padding: "12px 14px",
  border: "1px solid #1d4a32",
  background: "rgba(0,0,0,0.3)",
  color: "#eef7ef",
  outline: "none",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  minWidth: 0,
};

const btnStyle = {
  fontFamily: "inherit",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 13,
  fontStyle: "italic",
  border: "none",
  background: "#c8ff3d",
  color: "#0a1f14",
  padding: "12px 18px",
  cursor: "pointer",
  clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
  whiteSpace: "nowrap",
};

const fullBtnStyle = { flex: 1, padding: "14px 18px", fontSize: 15, textAlign: "center" };

const disabledBtnStyle = {
  background: "#3a4a42",
  color: "#6f8579",
  cursor: "not-allowed",
};

const ghostBtnStyle = {
  ...btnStyle,
  background: "transparent",
  color: "#7fa896",
  border: "1px solid #1d4a32",
};

const removeBtnStyle = {
  background: "none",
  border: "none",
  color: "#d6604a",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 15,
  lineHeight: 1,
  padding: "2px 4px",
  fontFamily: "inherit",
  flexShrink: 0,
};

const slotStyle = {
  textAlign: "center",
  minWidth: 0,
  padding: "20px 12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const tagStyle = {
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const fnameStyle = {
  fontFamily: "'Arial Black','Helvetica Neue',sans-serif",
  fontWeight: 900,
  fontStyle: "italic",
  fontSize: "clamp(16px,4.6vw,21px)",
  textTransform: "uppercase",
  lineHeight: 1.1,
  wordBreak: "break-word",
  color: "#eef7ef",
};
