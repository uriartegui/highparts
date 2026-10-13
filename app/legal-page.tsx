import { Mail } from "lucide-react";
import SiteShell from "./site-shell";
import { PageHero } from "./ui";
import LegalToc from "./legal-toc";

export default function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <SiteShell>
      <PageHero eyebrow={eyebrow} title={title} text="Informações claras sobre como a HighParts funciona e trata seus dados." />
      <section className="hp-legal">
        <div className="hp-legal-grid hp-container">
          <LegalToc />
          <article id="hp-legal-article" className="hp-legal-article hp-card hp-reveal">
            <p className="hp-legal-date">Versão vigente desde 8 de outubro de 2026</p>
            {children}
            <div className="hp-legal-contact">
              <span>
                <b>Ficou com alguma dúvida?</b>
                <small>Nossa equipe responde por e-mail.</small>
              </span>
              <a className="hp-btn hp-btn-dark" href="mailto:alisson@highparts.com.br"><Mail /> Falar com a HighParts</a>
            </div>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
