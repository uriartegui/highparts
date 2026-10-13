import { Mail } from "lucide-react";
import SiteShell from "./site-shell";
import { PageHero } from "./ui";
import LegalToc from "./legal-toc";
import { COMPANY } from "./company";

export default function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <SiteShell>
      <PageHero eyebrow={eyebrow} title={title} text={intro ?? "Informações claras sobre como a HighParts funciona e trata seus dados."} />
      <section className="hp-legal">
        <div className="hp-legal-grid hp-container">
          <LegalToc />
          <article id="hp-legal-article" className="hp-legal-article hp-card hp-reveal">
            <p className="hp-legal-date">Versão vigente desde {COMPANY.legalVersion}</p>
            {children}
            <div className="hp-legal-contact">
              <span>
                <b>Ficou com alguma dúvida?</b>
                <small>Nossa equipe responde por e-mail.</small>
              </span>
              <a className="hp-btn hp-btn-dark" href={`mailto:${COMPANY.supportEmail}`}><Mail /> Falar com a HighParts</a>
            </div>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
