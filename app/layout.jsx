import Script from "next/script";
import "../assets/css/caretrack.css";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="public-page">
        {children}
        <Script src="/assets/js/caretrack-runtime.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
