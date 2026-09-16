export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-stone-900 text-stone-400 py-12 text-center text-sm font-light">
      <p>© {year} Hayden Huan Kee Jiun. All rights reserved.</p>
    </footer>
  );
}
