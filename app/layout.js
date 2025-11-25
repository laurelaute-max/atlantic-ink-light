import './global.css';

export const metadata = {
  title: 'Ocean Project',
  description: 'Exploration interactive de l’océan Atlantique',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
