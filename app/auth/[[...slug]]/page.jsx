"use client";

import { useEffect, useState } from "react";
import {
  auth,
  browserLocalPersistence,
  browserSessionPersistence,
  functions,
  get,
  httpsCallable,
  onAuthStateChanged,
  ref,
  rtdb,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  update,
} from "../../lib/firebase-client";

const logoUrl = "/assets/img/logo.png";

function registrationPaths(uid) {
  return [
    `registration/admin/${uid}`,
    `registration/doctors/${uid}`,
    `registration/receptionist/${uid}`,
    `registration/nurses/${uid}`,
    `registration/clinicks/doctor/${uid}`,
    `registration/clinicks/nurse/${uid}`,
    `registration/clinicks/reception/${uid}`,
  ];
}

async function findRegistration(uid) {
  const lookups = await Promise.all(
    registrationPaths(uid).map(async (path) => {
      try {
        const snapshot = await get(ref(rtdb, path));
        return snapshot.exists() ? { path, value: snapshot.val() } : null;
      } catch (error) {
        console.warn("CareTrack registration lookup skipped", error);
        return null;
      }
    }),
  );
  return lookups.find(Boolean) || null;
}

function nextTarget() {
  if (typeof window === "undefined") return "/admin";
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return "/admin";
  return requested.startsWith("/") ? requested : "/admin";
}

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !new URLSearchParams(window.location.search).has("stay")) {
        window.history.replaceState(null, "", nextTarget());
        window.location.href = nextTarget();
      }
    });
    return unsubscribe;
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const registration = await findRegistration(credential.user.uid);

      if (!registration) {
        await signOut(auth);
        setMessage("This staff account is not registered in CareTrack access records.");
        return;
      }

      if (registration.value.active !== true && registration.value.status !== "active") {
        await signOut(auth);
        setMessage("This staff account is disabled. Contact the clinic administrator.");
        return;
      }

      try {
        await update(ref(rtdb, registration.path), {
          lastLoginAt: Date.now(),
          lastLoginEmail: credential.user.email,
        });
      } catch (error) {
        console.warn("CareTrack last-login update skipped", error);
      }

      try {
        await httpsCallable(functions, "syncOwnAccessClaims")();
        await credential.user.getIdToken(true);
      } catch (error) {
        console.warn("CareTrack claim sync failed", error);
      }

      window.location.href = nextTarget();
    } catch (error) {
      setMessage(error.message || "Unable to sign in. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your staff email first, then request a password reset.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent if the staff account exists.");
    } catch (error) {
      setMessage(error.message || "Could not send password reset email.");
    }
  }

  return (
    <main className="auth-layout auth-page">
      <section className="auth-brand">
        <a className="ct-logo ct-logo-full" href="/" aria-label="CareTrack">
          <img className="ct-logo-image" src={logoUrl} width="172" height="58" alt="CareTrack" />
        </a>
        <div>
          <p className="eyebrow">Authorized Staff</p>
          <h1>Secure clinic access</h1>
          <p>Sign in once and move through CareTrack without full-page reloads.</p>
        </div>
      </section>
      <section className="auth-card-wrap">
        <form className="auth-card auth-form" id="loginForm" onSubmit={handleSubmit}>
          <img className="ct-logo-image auth-card-logo" src={logoUrl} width="154" height="58" alt="CareTrack" />
          <h2>Staff Login</h2>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <label className="check-row">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            Keep me signed in
          </label>
          {message ? <div className="auth-error show" id="authError">{message}</div> : <div className="auth-error" id="authError" />}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Checking access..." : "Sign In"}</button>
          <a href="#reset" id="resetPassword" onClick={resetPassword}>Reset password</a>
        </form>
      </section>
    </main>
  );
}
