import { Barcode, ChevronRight, CreditCard, Mail, MapPin, Phone, QrCode, ShieldCheck } from "lucide-react";
import { COMPANY, formatAddress, whatsappLink } from "./company";

const paymentMethods = [
  { icon: QrCode, label: "Pix", detail: "aprovação rápida" },
  { icon: CreditCard, label: "Cartões", detail: "crédito e débito" },
  { icon: Barcode, label: "Boleto", detail: "pagamento bancário" },
  { icon: ShieldCheck, label: "Mercado Pago", detail: "ambiente protegido" },
];

function InstagramMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
}

export default function StoreFooter() {
  const address = formatAddress();
  const whatsapp = whatsappLink();
  const instagram = COMPANY.instagram;
  return (
    <footer className="store-footer" id="suporte">
      <div className="footer-main">
        <div className="footer-brand">
          <img src="/highparts-logo.png" alt="HighParts" />
          <p>Performance, confiança e a peça certa para o seu carro.</p>
          <span>Compatibilidade técnica para comprar com mais segurança.</span>
          <div className="footer-social">
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram da HighParts">
                <InstagramMark />
                <span><b>Instagram</b><small>Acompanhe a HighParts</small></span>
              </a>
            ) : (
              <div title="Adicione o perfil oficial em app/company.ts">
                <InstagramMark />
                <span><b>Instagram</b><small>Perfil oficial em breve</small></span>
              </div>
            )}
          </div>
        </div>
        <div className="footer-column">
          <b>COMPRAR</b>
          <a href="/catalogo">Catálogo completo</a>
          <a href="/#compatibilidade">Buscar pela placa</a>
          <a href="/conta">Minha conta</a>
          <a href="/conta">Meus pedidos</a>
        </div>
        <div className="footer-column">
          <b>INSTITUCIONAL</b>
          <a href={`mailto:${COMPANY.supportEmail}`}>Fale com a HighParts</a>
          <a href="/trocas-e-devolucoes">Trocas e devoluções</a>
          <a href="/privacidade">Política de privacidade</a>
          <a href="/termos">Termos de uso</a>
        </div>
        <div className="footer-contact">
          <b>ATENDIMENTO</b>
          <h3>Fale com quem entende.</h3>
          <p>Confirme a aplicação correta da peça antes de comprar.{COMPANY.hours && ` ${COMPANY.hours}.`}</p>
          {whatsapp && <a className="footer-contact-primary" href={whatsapp} target="_blank" rel="noopener noreferrer"><Phone /> WhatsApp <ChevronRight /></a>}
          <a href={`mailto:${COMPANY.supportEmail}`}><Mail /> {COMPANY.supportEmail} <ChevronRight /></a>
          {COMPANY.phone && <a href={`tel:${COMPANY.phone.replace(/\D/g, "")}`}><Phone /> {COMPANY.phone} <ChevronRight /></a>}
        </div>
      </div>
      <section className="footer-payments" aria-labelledby="footer-payment-title">
        <div className="footer-payment-heading">
          <span><ShieldCheck /></span>
          <div><b id="footer-payment-title">PAGAMENTO SEGURO</b><p>Escolha a melhor forma de pagar</p></div>
        </div>
        <div className="footer-payment-list">
          {paymentMethods.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="footer-payment-method"><Icon /><span><b>{label}</b><small>{detail}</small></span></div>
          ))}
        </div>
        <p className="footer-payment-note">Pagamentos processados pelo Mercado Pago. A HighParts não armazena os dados do seu cartão.</p>
      </section>
      {/* Seller identification required by Decreto 7.962/2013, art. 2. */}
      <div className="footer-legal">
        <small>
          <b>{COMPANY.legalName}</b>
          {COMPANY.cnpj && <> · CNPJ {COMPANY.cnpj}</>}
          {address && <><br /><MapPin /> {address}</>}
        </small>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} {COMPANY.tradeName}. Todos os direitos reservados.</small>
        <small>Preços e disponibilidade sujeitos a alteração. Imagens ilustrativas.</small>
      </div>
    </footer>
  );
}
