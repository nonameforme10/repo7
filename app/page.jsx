const stats = [
  { tone: "cyan", label: "Doctors", value: "48", note: "Clinical profiles" },
  { tone: "teal", label: "Patients", value: "2.8K", note: "Protected records" },
  { tone: "blue", label: "Diagnoses", value: "312", note: "Active cases" },
  { tone: "rose", label: "Critical", value: "8", note: "Needs review" },
];

const features = [
  {
    title: "Doctor Management",
    body: "Maintain doctor profiles, departments, contact details, room assignments, and availability.",
  },
  {
    title: "Patient Records",
    body: "Register patients, manage demographics, emergency contacts, and doctor assignments securely.",
  },
  {
    title: "Diagnosis Tracking",
    body: "Link ICD-coded diagnosis records, severity, clinical notes, and follow-ups to patient profiles.",
  },
  {
    title: "Role-Based Security",
    body: "Administrator, clinician, doctor, nurse, and receptionist access is controlled through Firebase Auth and RTD registration.",
  },
];

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <nav className="public-nav">
        <a className="ct-logo ct-logo-full" href="/" aria-label="CareTrack">
          <img className="ct-logo-image" src="/assets/img/logo.png" width="168" height="64" alt="CareTrack" />
        </a>
        <a className="btn primary" href="/auth">
          Staff Login
        </a>
      </nav>

      <main className="public-hero">
        <section className="hero-copy">
          <p className="eyebrow">Private Clinic Management</p>
          <h1>Secure Medical Records Management for Modern Clinics</h1>
          <p>
            CareTrack helps authorized clinic staff manage doctors, patient records, diagnoses, schedules, reports,
            and role-based access from one secure healthcare dashboard.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="/auth">
              <LockIcon />
              Staff Login
            </a>
            <a className="btn" href="#features">
              Learn More
            </a>
          </div>
        </section>

        <section className="hero-dashboard" aria-label="CareTrack dashboard preview">
          <div className="hero-dashboard-top">
            <span className="badge cyan">Administrator</span>
            <span className="badge green">Secure Access</span>
          </div>
          <div className="hero-dashboard-body">
            <div className="grid stats">
              {stats.map((stat) => (
                <div className={`stat-card ${stat.tone}`} key={stat.label}>
                  <div className="stat-top">
                    <span className="stat-label">{stat.label}</span>
                  </div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-note">{stat.note}</div>
                </div>
              ))}
            </div>
            <div className="pulse-line" style={{ margin: "24px 0 0" }} />
          </div>
        </section>
      </main>

      <section className="public-hero" id="features" style={{ minHeight: "auto", display: "block", paddingTop: 0 }}>
        <div className="hero-feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="public-footer">
        CareTrack MRMS is for authorized clinic staff only. Patient/public registration is not available from this site.
      </footer>
    </>
  );
}
