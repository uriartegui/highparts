import { ChevronRight } from "lucide-react";

export default function StoreFooter() {
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
          <a href="mailto:alisson@highparts.com.br">Fale com a HighParts</a>
          <a href="/trocas-e-devolucoes">Trocas e devoluções</a>
          <a href="/privacidade">Política de privacidade</a>
          <a href="/termos">Termos de uso</a>
        </div>
        <div className="footer-contact">
          <b>PRECISA DE AJUDA?</b>
          <h3>Confirme antes de comprar.</h3>
          <p>Nossa equipe ajuda a verificar a aplicação correta para o seu veículo.</p>
          <a href="mailto:alisson@highparts.com.br">
            alisson@highparts.com.br <ChevronRight />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <small>© 2026 HighParts. Todos os direitos reservados.</small>
        <small>Catálogo sujeito à disponibilidade de estoque.</small>
      </div>
    </footer>
  );
}
