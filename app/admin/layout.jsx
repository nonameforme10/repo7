export const metadata = {
  title: "CareTrack MRMS - Staff Dashboard",
  description: "Protected CareTrack medical records dashboard for authorized clinic staff.",
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

export default function AdminLayout({ children }) {
  return children;
}
