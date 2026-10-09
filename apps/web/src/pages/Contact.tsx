import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Input, PageHeader, Textarea } from "../components";
import { api } from "../api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string; subject?: string; message?: string };

/**
 * Contact page — reaches the tool's operator.
 * Messages are sent to POST /api/contact (public, rate-limited, spam-filtered)
 * and stored in the service database so the operator can read and respond.
 * A direct support email address will be published here once configured.
 */
export default function Contact({ go }: { go: (page: "privacy" | "terms") => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans leave it empty
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = "Please enter your name.";
    else if (name.trim().length > 100) e.name = "Name is too long (max 100 characters).";
    if (!email.trim()) e.email = "Please enter your email address.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Please enter a valid email address.";
    if (!subject.trim()) e.subject = "Please enter a subject.";
    else if (subject.trim().length > 200) e.subject = "Subject is too long (max 200 characters).";
    if (!message.trim()) e.message = "Please enter your message.";
    else if (message.trim().length > 5000) e.message = "Message is too long (max 5,000 characters).";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (sending) return;
    const e = validate();
    setErrors(e);
    setSendError(null);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    try {
      await api.contactSend({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        // Sent but expected empty — bots fill it, the server silently discards them.
        website,
      });
      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setWebsite("");
      setErrors({});
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send your message — try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Contact Us"
        sub="Questions, feedback, or bug reports about Digital Mazdur — send a message below."
      />

      <div className="grid-responsive" style={{ ["--dm-cols" as string]: 2 }}>
        <Card title="How to reach us" sub="The fastest way is the form on this page.">
          <div className="contact-method">
            <div className="contact-method-label">Contact form</div>
            <div className="contact-method-value">Right on this page</div>
            <p className="stat-note">
              Every submitted message is saved to the service&rsquo;s database and reviewed by
              the operator. Replies go to the email address you provide.
            </p>
          </div>
          <div className="contact-method">
            <div className="contact-method-label">Support email</div>
            <div className="contact-method-value">asadfarooq7985@gmail.com</div>
            <p className="stat-note">
              A direct support email address will be added here soon. Until then, the form
              above is the way to reach us.
            </p>
          </div>
        </Card>

        <Card title="Send a message" sub="We read everything — replies go to the email you provide.">
          {sent && (
            <Alert tone="success">
              <strong>Message sent.</strong> Thanks for reaching out — your message has been
              saved and will be reviewed.
            </Alert>
          )}
          {sendError && (
            <Alert tone="error">
              <strong>Couldn&rsquo;t send.</strong> {sendError}
            </Alert>
          )}
          <form onSubmit={submit} noValidate>
            {/* Honeypot: hidden from humans, irresistible to bots. */}
            <div aria-hidden="true" style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              placeholder="Your email address"
              error={errors.email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              error={errors.subject}
            />
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your question or issue…"
              rows={6}
              error={errors.message}
              hint={`${message.trim().length.toLocaleString()} / 5,000 characters`}
            />
            <Button type="submit" loading={sending}>
              Send message
            </Button>
          </form>
        </Card>
      </div>

      <Card title="Your privacy" className="contact-privacy">
        <p className="stat-note" style={{ margin: 0 }}>
          Submitting this form stores your name, email, subject, and message on the
          service&rsquo;s server so the operator can respond — it is never sold or shared
          with third parties. Read the full{" "}
          <button type="button" className="link-btn" onClick={() => go("privacy")}>
            Privacy Policy
          </button>{" "}
          and{" "}
          <button type="button" className="link-btn" onClick={() => go("terms")}>
            Terms &amp; Conditions
          </button>
          .
        </p>
      </Card>
    </div>
  );
}
