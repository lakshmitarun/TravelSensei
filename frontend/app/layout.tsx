import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelSensei - AI-Powered Personalized Travel Recommendation & Planning Platform",
  description: "Discover destinations, build personalized itineraries, and plan your entire trip around your interests, dates, and budget — powered by state-of-the-art travel AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}

