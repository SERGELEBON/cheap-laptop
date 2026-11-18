"use client";
/* Static pages rendered from the site's own content (pages.json), with fallbacks */
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Catalog } from "@/lib/types";
import { Breadcrumb } from "./chrome";
import { FileText, Send, MapPin, Phone, MessageCircle } from "lucide-react";

export function StaticPageView({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const page = catalog.pagesBySlug[slug];
  if (!page || (!page.content && !page.title)) {
    return (
      <div className="max-w-[900px] mx-auto px-3 py-16 text-center">
        <FileText size={44} className="mx-auto text-gray-300" />
        <h1 className="text-xl font-bold mt-4">Page not found</h1>
        <a href="#/" className="text-[var(--em-red)] font-semibold mt-2 inline-block">← Back to home</a>
      </div>
    );
  }
  return (
    <div>
      <Breadcrumb trail={[{ label: page.title }]} />
      <div className="max-w-[1000px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-5">{page.title}</h1>
        {slug === "contact-us" ? <ContactForm /> : null}
        <div
          className="em-page-content bg-white border rounded-lg p-5 md:p-8 text-[14px] text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page.content || "<p>Content coming soon.</p>" }}
        />
      </div>
    </div>
  );
}

function ContactForm() {
  const { toast } = useStore();
  const [f, setF] = useState({ name: "", email: "", subject: "", msg: "" });
  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <h2 className="font-bold text-[16px] text-[#232630] mb-1">Send us a message</h2>
      <p className="text-[13px] text-gray-500 mb-4">We usually respond within 24 hours.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name *" className="border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
        <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Your email *" className="border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
        <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Subject *" className="border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)] sm:col-span-2" />
        <textarea value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} placeholder="Your message *" rows={4} className="border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)] sm:col-span-2" />
      </div>
      <button
        onClick={() => {
          if (!f.name || !f.email || !f.msg) { toast("Please fill in the required fields", "err"); return; }
          toast("Message sent — our team will contact you shortly");
          setF({ name: "", email: "", subject: "", msg: "" });
        }}
        className="mt-4 bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white font-bold text-[14px] px-6 py-3 rounded flex items-center gap-2 transition-colors"
      >
        <Send size={15} /> Send message
      </button>
      <div className="mt-6 grid sm:grid-cols-3 gap-4 text-[13px] text-gray-600">
        <div className="flex items-center gap-2.5"><Phone size={16} className="text-[var(--em-red)]" /> <a href="tel:0240999979" className="hover:text-[var(--em-red)]">0240 999979 / 0208 699 988</a></div>
        <div className="flex items-center gap-2.5"><MessageCircle size={16} className="text-[var(--em-red)]" /> <a href="https://wa.me/233240999979" target="_blank" rel="noreferrer" className="hover:text-[var(--em-red)]">WhatsApp us</a></div>
        <div className="flex items-center gap-2.5"><MapPin size={16} className="text-[var(--em-red)]" /> <a href="#/page/locations" className="hover:text-[var(--em-red)]">Our stores</a></div>
      </div>
    </div>
  );
}
