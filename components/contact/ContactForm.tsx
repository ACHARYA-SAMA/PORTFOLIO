"use client";

import { useId, useState, type FormEvent } from "react";
import { CONTACT } from "@/lib/content";
import { LIMITS, mailtoHref, validateContact, type ContactErrors } from "@/lib/contact";
import s from "./form.module.css";

type Status = { kind: "idle" | "sending" | "sent" | "error"; text: string };

const MESSAGES: Record<string, string> = {
  "not-configured": `The form isn’t connected to a mail service yet, so nothing was sent. Email ${CONTACT.email} directly instead.`,
  "rate-limited": "That’s a few messages in a row. Try again in ten minutes, or use email.",
  "send-failed": "The mail service didn’t accept it. Please use email instead.",
  invalid: "A couple of fields need another look.",
  "bad-request": "Something went wrong with the request. Please use email instead.",
};

/** Optional message form. Collapsed by default so the section reads exactly as before. */
export default function ContactForm() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const check = validateContact(data);
    setErrors(check.errors);
    if (!check.value) {
      setStatus({ kind: "error", text: MESSAGES.invalid });
      return;
    }
    setStatus({ kind: "sending", text: "Sending…" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...check.value, website: data.website ?? "" }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: ContactErrors };
      if (res.ok && json.ok) {
        setStatus({ kind: "sent", text: "Sent. Thanks, I’ll reply by email." });
        form.reset();
        return;
      }
      if (json.errors) setErrors(json.errors);
      setStatus({ kind: "error", text: MESSAGES[json.error ?? ""] ?? MESSAGES["bad-request"] });
    } catch {
      setStatus({ kind: "error", text: MESSAGES["bad-request"] });
    }
  };

  const field = (name: "name" | "email" | "message") => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-err` : undefined,
  });

  return (
    <div className={s.wrap}>
      <div className={s.toggleRow}>
        <button type="button" className={`label ${s.toggle}`} aria-expanded={open} aria-controls={`${id}-form`} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide the form" : "Or send a message"} <span aria-hidden="true">{open ? "↑" : "↓"}</span>
        </button>
        <a className={`label ${s.mailto}`} href={mailtoHref()}>
          Open your mail app ↗
        </a>
      </div>

      {open ? (
        <form id={`${id}-form`} className={s.form} onSubmit={submit} noValidate>
          <div className={s.row}>
            <label className={`label ${s.lbl}`} htmlFor={`${id}-name`}>
              Name
            </label>
            <input {...field("name")} className={s.input} autoComplete="name" maxLength={LIMITS.name} required />
            {errors.name ? (
              <span id={`${id}-name-err`} className={`label ${s.err}`}>
                {errors.name}
              </span>
            ) : null}
          </div>
          <div className={s.row}>
            <label className={`label ${s.lbl}`} htmlFor={`${id}-email`}>
              Email
            </label>
            <input {...field("email")} type="email" className={s.input} autoComplete="email" maxLength={LIMITS.email} required />
            {errors.email ? (
              <span id={`${id}-email-err`} className={`label ${s.err}`}>
                {errors.email}
              </span>
            ) : null}
          </div>
          <div className={`${s.row} ${s.wide}`}>
            <label className={`label ${s.lbl}`} htmlFor={`${id}-message`}>
              Message
            </label>
            <textarea {...field("message")} className={s.input} rows={5} maxLength={LIMITS.message} required />
            {errors.message ? (
              <span id={`${id}-message-err`} className={`label ${s.err}`}>
                {errors.message}
              </span>
            ) : null}
          </div>
          {/* Honeypot, hidden from people and assistive tech. */}
          <input name="website" tabIndex={-1} autoComplete="off" className={s.trap} aria-hidden="true" />
          <div className={`${s.row} ${s.wide} ${s.foot}`}>
            <button type="submit" className={`label ${s.send}`} disabled={status.kind === "sending"}>
              {status.kind === "sending" ? "Sending…" : "Send"}
            </button>
            <p className={s.status} role="status" aria-live="polite" data-kind={status.kind}>
              {status.text}
            </p>
          </div>
        </form>
      ) : null}
    </div>
  );
}
