import Script from "next/script";

export const metadata = {
  metadataBase: new URL("https://caretrack.website"),
  title: "CareTrack - Secure Medical Records Management",
  description: "CareTrack is a secure medical records management system for authorized clinic staff.",
  icons: {
    icon: "/assets/img/logo.png",
    shortcut: "/assets/img/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeBootScript = `
  (function () {
    try {
      var saved = window.localStorage && window.localStorage.getItem("caretrack-theme");
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var theme = saved === "light" || saved === "dark" ? saved : (prefersDark ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="stylesheet" href="/assets/css/caretrack.css" />
      </head>
      <body className="public-page">
        {children}
        <Script src="/assets/js/caretrack-runtime.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
