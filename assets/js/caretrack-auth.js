import {
  auth,
  browserLocalPersistence,
  browserSessionPersistence,
  functions,
  get,
  httpsCallable,
  ref,
  rtdb,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  update,
} from "./firebase-config.js";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("authError");
const resetLink = document.getElementById("resetPassword");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("show");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.remove("show");
}

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
  const lookups = await Promise.all(registrationPaths(uid).map(async (path) => {
    try {
      const snapshot = await get(ref(rtdb, path));
      if (snapshot.exists()) return { path, value: snapshot.val() };
    } catch (error) {
      console.warn("CareTrack registration lookup skipped", error);
    }
    return null;
  }));
  for (const registration of lookups) {
    if (registration) return registration;
  }
  return null;
}

function nextTarget() {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return "../admin/admin.html";
  return requested.startsWith("/") ? requested : `../admin/admin.html`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true;
  submit.textContent = "Checking access...";

  const email = form.email.value.trim();
  const password = form.password.value;
  const remember = form.remember.checked;

  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const registration = await findRegistration(credential.user.uid);

    if (!registration) {
      await signOut(auth);
      showError("This staff account is not registered in CareTrack RTD access records.");
      return;
    }

    if (registration.value.active !== true && registration.value.status !== "active") {
      await signOut(auth);
      showError("This staff account is disabled. Contact the clinic administrator.");
      return;
    }

    try {
      await update(ref(rtdb, registration.path), {
        lastLoginAt: Date.now(),
        lastLoginEmail: credential.user.email,
      });
    } catch (loginStampError) {
      console.warn("CareTrack last-login update skipped", loginStampError);
    }

    try {
      await httpsCallable(functions, "syncOwnAccessClaims")();
      await credential.user.getIdToken(true);
    } catch (claimError) {
      console.warn("CareTrack claim sync failed", claimError);
    }

    window.location.href = nextTarget();
  } catch (error) {
    showError(error.message || "Unable to sign in. Check your credentials and try again.");
  } finally {
    submit.disabled = false;
    submit.textContent = "Sign In";
  }
});

resetLink?.addEventListener("click", async (event) => {
  event.preventDefault();
  clearError();
  const email = form.email.value.trim();
  if (!email) {
    showError("Enter your staff email first, then request a password reset.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showError("Password reset email sent if the staff account exists.");
  } catch (error) {
    showError(error.message || "Could not send password reset email.");
  }
});
