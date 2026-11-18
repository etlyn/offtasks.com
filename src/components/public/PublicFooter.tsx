import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
  { label: "Terms", href: "/terms" },
];

export const PublicFooter = () => (
  <footer className="pub-foot">
    <p>© {new Date().getFullYear()} Offtasks</p>
    <nav aria-label="Footer links">
      {footerLinks.map((link) => (
        <Link key={link.href} to={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  </footer>
);
