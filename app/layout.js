import "./globals.css";
import { Inter, Source_Serif_4 } from "next/font/google";
import { APP_NAME } from "../lib/config.js";

const inter = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata = {
  title: APP_NAME,
  description: "A personal AI assistant for learning digital marketing.",
};

// Applies the stored theme before first paint to avoid a flash of the wrong theme.
const themeBoot = `try{var t=localStorage.getItem("rachits-assistant-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}`;

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the theme boot script sets data-theme before React hydrates.
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        {children}
      </body>
    </html>
  );
}
