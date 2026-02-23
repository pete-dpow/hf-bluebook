import "./globals.css";
import { Cormorant_Garamond, IBM_Plex_Sans } from "next/font/google";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ProfileDrawer from "@/components/ProfileDrawer";
import HelpDrawer from "@/components/HelpDrawer";
import AboutDrawer from "@/components/AboutDrawer";
import ProjectsPanel from "@/components/ProjectsPanel";
import AuthGuard from "@/components/AuthGuard";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

export const metadata = {
  title: "hf.bluebook",
  description: "Fire Protection Product Intelligence by Harmony Fire",
  icons: {
    icon: "/hf_logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${ibmPlex.variable}`}>
      <body style={{ background: "#FCFCFA", color: "#111" }}>
        <LeftSidebar />
        <ProjectsPanel />
        <RightSidebar />
        <ProfileDrawer />
        <HelpDrawer />
        <AboutDrawer />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}

