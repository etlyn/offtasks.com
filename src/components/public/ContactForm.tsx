import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { submitContactMessage } from "@/lib/supabase";

interface ContactFormProps {
  source?: string;
}

const inputClassName =
  "h-11 w-full rounded-2xl border border-[#e4e7ee] bg-white/86 px-4 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#009689]/50 focus:ring-4 focus:ring-[#99f6e4]/30 disabled:cursor-not-allowed disabled:opacity-60";

export const ContactForm = ({ source = "landing" }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "validation-error" | "submit-error">(
    "idle",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("validation-error");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");

    try {
      await submitContactMessage({ name, email, message, source });
      setName("");
      setEmail("");
      setMessage("");
      setStatus("success");
    } catch {
      setStatus("submit-error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sr-only" htmlFor={`${source}-contact-name`}>
          Name
        </label>
        <input
          id={`${source}-contact-name`}
          className={inputClassName}
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
          autoComplete="name"
          required
        />

        <label className="sr-only" htmlFor={`${source}-contact-email`}>
          Email
        </label>
        <input
          id={`${source}-contact-email`}
          className={inputClassName}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          autoComplete="email"
          required
        />
      </div>

      <label className="sr-only" htmlFor={`${source}-contact-message`}>
        Message
      </label>
      <textarea
        id={`${source}-contact-message`}
        className="min-h-28 w-full resize-none rounded-2xl border border-[#e4e7ee] bg-white/86 px-4 py-3 text-sm leading-6 text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#009689]/50 focus:ring-4 focus:ring-[#99f6e4]/30 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="How can we help?"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isSubmitting}
        maxLength={2000}
        required
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-full bg-[#09090b] px-5 text-sm font-semibold text-white hover:bg-[#18181b]"
        >
          {isSubmitting ? "Sending..." : "Send message"}
        </Button>

        {status === "success" ? (
          <p className="text-sm font-semibold text-[#009689]">Message sent.</p>
        ) : status === "validation-error" || status === "submit-error" ? (
          <p className="text-sm font-semibold text-[#b42318]">
            {status === "validation-error"
              ? "Fill out every field and try again."
              : "We couldn't send that message. Please try again."}
          </p>
        ) : null}
      </div>
    </form>
  );
};
