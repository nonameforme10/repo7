export const metadata = {
  title: "CareTrack - Staff Login",
  description: "Authorized CareTrack clinic staff login.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({ children }) {
  return children;
}
