import LegalPage from "../legal-page";
import CompanyId from "../company-id";

export default function Page() {
  return (
    <LegalPage eyebrow="CONDIÇÕES DA LOJA" title="Termos de uso e compra" intro="As regras para usar o site, criar sua conta e comprar na HighParts.">
      <h2>1. Quem somos</h2>
      <p>Este site é operado pela empresa abaixo, responsável pelas vendas realizadas por ele:</p>
      <CompanyId />
      <p>Ao usar o site ou concluir uma compra, você concorda com estes termos, com a <a href="/privacidade">Política de privacidade</a> e com a política de <a href="/trocas-e-devolucoes">Trocas e devoluções</a>.</p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>Para comprar é preciso ter conta, ser maior de 18 anos e confirmar o e-mail.</li>
        <li>Os dados informados devem ser verdadeiros e mantidos atualizados. Cada e-mail e cada telefone podem estar ligados a uma única conta.</li>
        <li>A senha é pessoal. Avise-nos imediatamente se suspeitar de uso indevido da sua conta.</li>
        <li>Podemos suspender contas usadas para fraude, abuso do site ou em desacordo com estes termos.</li>
      </ul>

      <h2>3. Produtos, compatibilidade e imagens</h2>
      <p>As aplicações por veículo vêm do catálogo técnico dos fabricantes. A consulta pela placa é uma ferramenta de apoio: antes de comprar, confira o código da peça, o ano, a versão, a motorização e equipamentos como ABS. Em caso de dúvida, fale com o nosso atendimento antes de finalizar o pedido.</p>
      <p>As imagens são ilustrativas e podem não representar exatamente cor, acabamento ou embalagem do produto. As especificações técnicas descritas prevalecem sobre a imagem.</p>

      <h2>4. Preços, estoque e pedidos</h2>
      <ul>
        <li>Os preços estão em reais (R$) e podem mudar sem aviso, valendo o preço exibido no momento da criação do pedido.</li>
        <li>Ao criar o pedido, os itens são reservados no estoque. O pedido só é confirmado depois da aprovação do pagamento.</li>
        <li>Erros evidentes de preço, estoque ou cadastro podem levar ao cancelamento do pedido, com aviso e devolução integral de qualquer valor pago.</li>
      </ul>

      <h2>5. Pagamento</h2>
      <p>Os pagamentos são processados pelo Mercado Pago, em ambiente próprio e seguro. A HighParts não recebe nem armazena os dados do seu cartão. A confirmação do pagamento é feita diretamente pelo Mercado Pago. Pedidos que não forem pagos podem ser cancelados e ter o estoque liberado.</p>

      <h2>6. Entrega</h2>
      <p>O prazo e o valor do frete são informados antes do pagamento. O prazo começa a contar a partir da confirmação do pagamento. Confira o endereço de entrega: entregas que retornarem por endereço incorreto ou ausência do destinatário podem ter novo frete cobrado. O código de rastreio é enviado por e-mail e fica disponível na sua conta.</p>

      <h2>7. Trocas, devoluções e garantia</h2>
      <p>Seus direitos de arrependimento, troca e garantia seguem o Código de Defesa do Consumidor e estão detalhados na página de <a href="/trocas-e-devolucoes">Trocas e devoluções</a>.</p>

      <h2>8. Instalação</h2>
      <p>Muitas das nossas peças, como discos, tambores e cilindros de freio, são itens de segurança. Recomendamos que a instalação seja feita por um profissional qualificado, seguindo as orientações do fabricante do veículo e da peça. Problemas causados por instalação inadequada não caracterizam defeito do produto, sem prejuízo dos direitos previstos em lei.</p>

      <h2>9. Uso do site</h2>
      <p>Não é permitido usar o site para fraudes, tentar acessar áreas ou dados de outras pessoas, sobrecarregar os sistemas, nem copiar o catálogo de forma automatizada. Marcas, textos, imagens e o layout do site pertencem à HighParts ou aos seus licenciantes.</p>

      <h2>10. Alterações e foro</h2>
      <p>Estes termos podem ser atualizados; a versão vigente é sempre a publicada nesta página, com a data indicada acima, e vale para os pedidos feitos a partir dela. Fica eleito o foro do domicílio do consumidor para resolver qualquer questão relacionada a estes termos, conforme o Código de Defesa do Consumidor.</p>
    </LegalPage>
  );
}
