import { ChevronRight } from "lucide-react";
import { COMPANY, formatAddress, whatsappLink } from "./company";

export default function StoreFooter() {
  const address = formatAddress();
  const whatsapp = whatsappLink();
  return (
    <footer className="store-footer" id="suporte">
      <div className="footer-main">
        <div className="footer-brand">
          <img src="/highparts-logo.png" alt="HighParts" />
          <p>Performance, confiança e a peça certa para o seu carro.</p>
          <span>Compatibilidade técnica para comprar com mais segurança.</span>
        </div>
        <div className="footer-column">
          <b>COMPRAR</b>
          <a href="/catalogo">Catálogo completo</a>
          <a href="/#compatibilidade">Buscar pela placa</a>
          <a href="/conta">Minha conta</a>
          <a href="/conta">Meus pedidos</a>
        </div>
        <div className="footer-column">
          <b>ATENDIMENTO</b>
          <a href={`mailto:${COMPANY.supportEmail}`}>Fale com a HighParts</a>
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          <a href="/trocas-e-devolucoes">Trocas e devoluções</a>
          <a href="/privacidade">Política de privacidade</a>
          <a href="/termos">Termos de uso</a>
        </div>
        <div className="footer-contact">
          <b>PRECISA DE AJUDA?</b>
          <h3>Confirme antes de comprar.</h3>
          <p>Nossa equipe ajuda a verificar a aplicação correta para o seu veículo.{COMPANY.hours && ` ${COMPANY.hours}.`}</p>
          <a href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail} <ChevronRight />
          </a>
          {COMPANY.phone && <a href={`tel:${COMPANY.phone.replace(/\D/g, "")}`}>{COMPANY.phone} <ChevronRight /></a>}
        </div>
      </div>
      {/* Seller identification required by Decreto 7.962/2013, art. 2. */}
      <div className="footer-legal">
        <small>
          <b>{COMPANY.legalName}</b>
          {COMPANY.cnpj && <> · CNPJ {COMPANY.cnpj}</>}
          {address && <> · {address}</>}
        </small>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} {COMPANY.tradeName}. Todos os direitos reservados.</small>
        <small>Preços e disponibilidade sujeitos a alteração. Imagens ilustrativas.</small>
      </div>
    </footer>
  );
}
