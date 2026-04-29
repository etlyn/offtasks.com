import { Apple } from "lucide-react";
import QRCode from "react-qr-code";
import { Link } from "react-router-dom";
import { ContactForm } from "@/components/public/ContactForm";
import { Button } from "@/components/ui/button";
import { IOS_APP_STORE_URL } from "@/config/publicSite";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
  { label: "Terms", href: "/terms" },
];

export const PublicFooter = () => (
  <footer id="contact" className="mt-20 pb-8 sm:mt-24">
    <div className="grid gap-4 rounded-[34px] border border-white/70 bg-white/64 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.3)] backdrop-blur-2xl lg:grid-cols-[minmax(0,1fr)_220px] md:p-6">
      <div className="rounded-[28px] bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#009689]">
            Contact
          </p>
          <h2 className="mt-3 font-['Sora',_sans-serif] text-3xl font-semibold tracking-[-0.055em] text-[#0f172a]">
            Send a message.
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#64748b]">
            Questions, support, or account requests.
          </p>
        </div>

        <div className="mt-5">
          <ContactForm source="footer" />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/70 bg-white/82 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
        <a
          href={IOS_APP_STORE_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Open Offtasks App Store download link"
          className="rounded-[22px] border border-[#e4e7ee] bg-white p-3 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.4)]"
        >
          <QRCode
            value={IOS_APP_STORE_URL}
            size={124}
            bgColor="transparent"
            fgColor="#09090b"
            level="M"
          />
        </a>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#009689]">
          QR download
        </p>
        <p className="mt-2 text-sm font-medium text-[#64748b]">
          Scan with iPhone.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-4 h-11 rounded-full bg-[#09090b] px-5 text-sm font-semibold text-white hover:bg-[#18181b]"
        >
          <a
            href={IOS_APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Download Offtasks on the App Store"
          >
            <Apple className="size-4" />
            App Store
          </a>
        </Button>
      </div>
    </div>

    <div className="mt-5 flex flex-col gap-3 rounded-[26px] border border-white/70 bg-white/58 px-5 py-4 text-sm text-[#64748b] shadow-[0_18px_42px_-36px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <p>© {new Date().getFullYear()} Offtasks</p>
      <nav className="flex flex-wrap gap-4" aria-label="Footer links">
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="font-semibold text-[#0f172a] transition hover:text-[#009689]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);
