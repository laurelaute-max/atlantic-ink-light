import "./global.css";

export const metadata = {
  title: "Atlantic Pulse",
  description: "Exploration de l’océan Atlantique",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

