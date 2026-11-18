import { recordConversion } from "@/analytics";
import { useState, type FormEvent } from "react";
import { submitContactMessage } from "@/lib/supabase";

interface ContactFormProps {
  source?: string;
}

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
      recordConversion("contact_submit");
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
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form-pair">
        <label className="ot-visually-hidden" htmlFor={`${source}-contact-name`}>
          Name
        </label>
        <input
          id={`${source}-contact-name`}
          className="ot-input"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
          autoComplete="name"
          required
        />
        <label className="ot-visually-hidden" htmlFor={`${source}-contact-email`}>
          Email
        </label>
        <input
          id={`${source}-contact-email`}
          className="ot-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          autoComplete="email"
          required
        />
      </div>
      <label className="ot-visually-hidden" htmlFor={`${source}-contact-message`}>
        Message
      </label>
      <textarea
        id={`${source}-contact-message`}
        className="ot-input"
        placeholder="How can we help?"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isSubmitting}
        maxLength={2000}
        required
      />
      <div className="contact-form-foot">
        <button type="submit" className="ot-button" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send message"}
        </button>
        {status === "success" ? (
          <p role="status">Message sent.</p>
        ) : status === "validation-error" || status === "submit-error" ? (
          <p role="alert" data-error="">
            {status === "validation-error"
              ? "Fill out every field and try again."
              : "We couldn't send that message. Please try again."}
          </p>
        ) : null}
      </div>
    </form>
  );
};
