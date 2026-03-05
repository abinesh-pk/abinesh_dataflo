import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const revealsRef = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.2 },
    );

    revealsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page">
      {/* Section 1: Navigation */}
      <nav className={`nav ${isScrolled ? "scrolled" : ""}`}>
        <div className="nav-logo">
          <div className="logo-mark"></div>
          Live Transcript
        </div>
        <div className="nav-links">
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("features");
            }}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("how-it-works");
            }}
          >
            How It Works
          </a>
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("demo");
            }}
          >
            Demo
          </a>
          <a
            href="#use-cases"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("use-cases");
            }}
          >
            Use Cases
          </a>
        </div>
        <button className="btn-launch" onClick={() => navigate("/app")}>
          Launch App →
        </button>
      </nav>

      {/* Section 2: Try It Yourself */}
      <section
        id="demo"
        className="try-demo reveal"
        ref={(el) => (revealsRef.current[0] = el)}
      >
        <div className="try-content">
          <span className="label">LIVE DEMO</span>
          <h2>Try Live Transcript Right Now</h2>
          <p>
            No signup required. Upload a video file or paste any stream URL and
            see real-time AI transcription in action.
          </p>
          <button className="btn-open-live" onClick={() => navigate("/app")}>
            Open Live App →
          </button>
          <div className="trust-indicators">
            <div className="trust-item">✓ YouTube Live & Twitch supported</div>
            <div className="trust-item">✓ 30+ languages</div>
            <div className="trust-item">✓ Instant keyword alerts</div>
          </div>
        </div>
        <div className="app-mockup">
          <img
            src="/app-mockup.png"
            alt="Live Transcript App Mockup"
            className="mockup-img"
          />
          
        </div>
      </section>

      {/* Section 3: Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <div className="pulse-dot"></div>
            LIVE — Real-Time Broadcast Monitoring
          </div>
          <h1>
            Monitor the Floor.
            <br />
            <span className="gradient-text">Capture Every Bill.</span>
          </h1>
          <p className="hero-subtext">
            AI-powered transcription and keyword monitoring for Legislative
            Assemblies, Parliamentary sessions, and local government meetings.
            Instant alerts, speaker diarization, and multilingual support.
          </p>
          <div className="hero-actions">
            <button
              className="btn-hero-primary"
              onClick={() => navigate("/app")}
            >
              Launch App →
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() =>
                window.open(
                  "https://github.com/adithyacd/adithya_dataflo",
                  "_blank",
                )
              }
            >
              View on GitHub
            </button>
          </div>
          <div className="sidebar-stats">
            <span className="stat-pill">&lt; 300ms Live Latency</span>
            <span className="stat-pill">Nova-2 STT Model</span>
            <span className="stat-pill">Groq LPU Inference</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="shape-circle-lg"></div>
          <div className="shape-rect"></div>
          <div className="shape-circle-sm"></div>
        </div>
      </section>

      {/* Section 4: Features */}
      <section
        id="features"
        className="features reveal"
        ref={(el) => (revealsRef.current[1] = el)}
      >
        <div className="section-head">
          <h2>Intelligence for Every Legislative Session</h2>
          <p>
            Built for parliamentary staff, government analysts, policy
            researchers, and public transparency teams.
          </p>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: "🎙️",
              title: "Real-Time Transcription",
              desc: "Word-level timestamp synchronization using Deepgram nova-2 model at 3x processing speed",
            },
            {
              icon: "🚨",
              title: "Keyword Monitoring",
              desc: "Dual-pass exact and fuzzy matching catches mispronunciations — alerts fire in under 100ms",
            },
            {
              icon: "👥",
              title: "Speaker Diarization",
              desc: "Automatically identify and label every individual speaker throughout the broadcast",
            },
            {
              icon: "🌍",
              title: "Multilingual Support",
              desc: "Transcribe in 30+ languages with real-time translation powered by Groq Llama 3.3",
            },
            {
              icon: "✨",
              title: "AI Summary",
              desc: "Generate intelligent session summaries using Groq's LPU-accelerated inference engine",
            },
            {
              icon: "📧",
              title: "Multi-Channel Alerts",
              desc: "Simultaneous browser push notifications, email via SendGrid, and on-screen alert cards",
            },
            {
              icon: "🗄️",
              title: "Session History",
              desc: "MongoDB Atlas stores every session with full transcript, alerts, and TXT export",
            },
          ].map((f, i) => (
            <div
              className="feature-card reveal"
              key={i}
              ref={(el) => (revealsRef.current[i + 2] = el)}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: How It Works */}
      <section
        id="how-it-works"
        className="how-it-works reveal"
        ref={(el) => (revealsRef.current[9] = el)}
      >
        <div className="section-head">
          <h2>From Debate to Document in Seconds</h2>
        </div>
        <div className="step-container">
          {[
            {
              num: "01",
              icon: "🔗",
              title: "Connect the Session",
              desc: "Upload local session recordings or paste any live stream URL — Assembly Live, YouTube, or HLS feeds",
            },
            {
              num: "02",
              icon: "🤖",
              title: "AI Transcribes in Real Time",
              desc: "FFmpeg extracts audio, Deepgram nova-2 transcribes with word-level timestamps at 3x speed",
            },
            {
              num: "03",
              icon: "🚨",
              title: "Monitor and Alert",
              desc: "Keywords trigger instant multi-channel alerts. AI generates summaries. Everything saved to session history.",
            },
          ].map((s, i) => (
            <React.Fragment key={i}>
              <div
                className="step-card reveal"
                ref={(el) => (revealsRef.current[10 + i] = el)}
              >
                <div className="step-watermark">{s.num}</div>
                <div className="step-emoji">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              {i < 2 && (
                <div className="arrow-divider">
                  →<div className="arrow-dot"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Section 6: Architecture */}
      <section
        className="architecture reveal"
        ref={(el) => (revealsRef.current[13] = el)}
      >
        <div className="section-head">
          <h2>Transparent Government powered by AI</h2>
        </div>
        <div className="diag-container">
          <div className="diag-row">
            <div className="diag-node">
              <span className="node-tech">📺 Stream</span>
              <span className="node-label">Source</span>
            </div>
            <div className="diag-arrow">
              <div className="shimmer-line"></div>
            </div>
            <div className="diag-node">
              <span className="node-tech">⚙️ FFmpeg</span>
              <span className="node-label">extraction</span>
            </div>
            <div className="diag-arrow">
              <div className="shimmer-line"></div>
            </div>
            <div className="diag-node">
              <span className="node-tech">🧠 Deepgram</span>
              <span className="node-label">Nova-2 STT</span>
            </div>
            <div className="diag-arrow">
              <div className="shimmer-line"></div>
            </div>
            <div className="diag-node">
              <span className="node-tech">🔍 RapidFuzz</span>
              <span className="node-label">Keywords</span>
            </div>
            <div className="diag-arrow">
              <div className="shimmer-line"></div>
            </div>
            <div className="diag-node">
              <span className="node-tech">🔔 Alerts</span>
              <span className="node-label">Notify</span>
            </div>
          </div>
          <div className="diag-branch">
            <div className="diag-node">
              <span className="node-tech">🦙 Groq</span>
              <span className="node-label">Llama 3.3 AI</span>
            </div>
            <div className="diag-node">
              <span className="node-tech">🍃 MongoDB</span>
              <span className="node-label">Atlas History</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Use Cases */}
      <section
        id="use-cases"
        className="use-cases reveal"
        ref={(el) => (revealsRef.current[14] = el)}
      >
        <div className="section-head">
          <h2>Built for Modern Governance</h2>
        </div>
        <div className="use-case-grid">
          {[
            {
              icon: "🏛️",
              title: "Parliamentary Monitoring",
              desc: "Monitor live assembly floor debates for mentions of specific bills, constituencies, or members in real time",
              tag: "Assembly Staff & Analysts",
              color: "blue",
            },
            {
              icon: "⚖️",
              title: "Policy Compliance",
              desc: "Ensure all legislative procedures and disclosure requirements are met during committee hearings",
              tag: "Legal & Policy Teams",
              color: "amber",
            },
            {
              icon: "📜",
              title: "Public Transparency",
              desc: "Make legislative sessions accessible with real-time transcription and instant multiligual translation",
              tag: "Transparency NGOs",
              color: "red",
            },
            {
              icon: "�",
              title: "Legislative Research",
              desc: "Analyze years of session recordings with AI-powered search, speaker indexing, and topic tracking",
              tag: "Researchers & Academics",
              color: "green",
            },
          ].map((u, i) => (
            <div
              className="use-case-card reveal"
              key={i}
              ref={(el) => (revealsRef.current[15 + i] = el)}
            >
              <div className={`uc-icon-box ${u.color}`}>{u.icon}</div>
              <h3>{u.title}</h3>
              <p>{u.desc}</p>
              <div className="uc-tag">For: {u.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 8: Final CTA */}
      <section
        className="final-cta reveal"
        ref={(el) => (revealsRef.current[19] = el)}
      >
        <div className="cta-deco cta-deco-1"></div>
        <div className="cta-deco cta-deco-2"></div>
        <h2>Start Monitoring in Seconds</h2>
        <p>
          No signup required. Works with any video source. Deployed and ready.
        </p>
        <button className="btn-launch-large" onClick={() => navigate("/app")}>
          Launch Live Transcript →
        </button>
        <div className="final-cta-footer">
          Deployed on Render · Powered by Deepgram & Groq · Built for the
          Hackathon
        </div>
      </section>

      {/* Section 9: Footer */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <h2>Live Transcript</h2>
            <p>Real-time legislative monitoring</p>
          </div>
          <div className="footer-links">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/app");
              }}
            >
              Launch App
            </a>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("features");
              }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("how-it-works");
              }}
            >
              How It Works
            </a>
            <a
              href="#use-cases"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("use-cases");
              }}
            >
              Use Cases
            </a>
          </div>
          <div className="tech-stack">
            <span className="tech-pill">Deepgram</span>
            <span className="tech-pill">Groq</span>
            <span className="tech-pill">MongoDB</span>
            <span className="tech-pill">FastAPI</span>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Live Transcript · Built for the Hackathon
        </div>
      </footer>
    </div>
  );
};

export default Landing;
