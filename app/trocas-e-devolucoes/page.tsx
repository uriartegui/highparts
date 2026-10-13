import LegalPage from "../legal-page";
import CompanyId from "../company-id";
import { COMPANY, whatsappLink } from "../company";

export default function Page() {
  const whatsapp = whatsappLink("Olá, HighParts! Quero solicitar uma troca ou devolução.");
  return (
    <LegalPage eyebrow="ATENDIMENTO AO CLIENTE" title="Trocas e devoluções" intro="Como desistir de uma compra, trocar uma peça ou acionar a garantia, conforme o Código de Defesa do Consumidor.">
      <h2>1. Como solicitar</h2>
      <p>
        Fale com o nosso atendimento pelo e-mail <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
        {whatsapp && <> ou pelo <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}, informando:
      </p>
      <ul>
        <li>o número do pedido (por exemplo, HP-XXXXXXXX);</li>
        <li>o motivo da solicitação;</li>
        <li>fotos da peça e da embalagem, quando houver defeito, avaria ou divergência.</li>
      </ul>
      <p>Respondemos com as instruções de envio. Não envie a peça sem antes falar conosco, para que a devolução seja identificada corretamente.</p>
      <p>Confirmamos o recebimento da solicitação pelo mesmo meio utilizado pelo cliente e prestamos uma resposta em até 5 dias, sem prejuízo de prazos menores previstos em lei.</p>

      <h2>2. Direito de arrependimento (7 dias)</h2>
      <p>Você pode desistir da compra em até <b>7 dias corridos a partir do recebimento</b>, sem precisar justificar (art. 49 do Código de Defesa do Consumidor).</p>
      <ul>
        <li>O frete de devolução fica por nossa conta.</li>
        <li>Devolvemos o valor integral pago, incluindo o frete da entrega.</li>
        <li>Para que possamos conferir a peça, pedimos que ela seja devolvida com a embalagem original, os acessórios e, de preferência, sem sinais de instalação.</li>
      </ul>

      <h2>3. Peça errada ou diferente do anunciado</h2>
      <p>Se enviamos um item diferente do pedido, ou se a peça não corresponde à descrição ou à aplicação informada no site, fazemos a troca ou devolvemos o valor <b>sem custo nenhum para você</b>, incluindo os fretes.</p>
      <p>Se a peça foi escolhida errado na compra, você pode usar o direito de arrependimento em até 7 dias. Depois desse prazo, a troca pode ser feita mediante análise, desde que a peça esteja sem uso e na embalagem original.</p>

      <h2>4. Defeito e garantia</h2>
      <ul>
        <li><b>Garantia legal:</b> 90 dias a partir do recebimento, por se tratar de bem durável (art. 26 do CDC). Se o defeito não for aparente, o prazo começa quando ele é percebido.</li>
        <li><b>Garantia do fabricante:</b> quando houver, soma-se à garantia legal, nas condições do fabricante.</li>
        <li><b>Análise:</b> a peça passa por avaliação técnica. Confirmado o defeito, temos até 30 dias para resolver o problema. Se ele não for resolvido nesse prazo, você escolhe entre a troca por outra peça igual, a devolução do valor pago ou o abatimento proporcional do preço (art. 18 do CDC).</li>
        <li>Desgaste natural de uso, instalação inadequada, acidentes e uso fora da especificação do fabricante não caracterizam defeito.</li>
      </ul>

      <h2>5. Avaria no transporte</h2>
      <p>Se a embalagem chegar violada ou danificada, você pode recusar o recebimento. Se perceber a avaria só depois, avise-nos em até 7 dias, com fotos da embalagem e da peça, e resolveremos com prioridade.</p>

      <h2>6. Reembolso</h2>
      <ul>
        <li>O reembolso é feito pelo mesmo meio de pagamento usado na compra, depois do recebimento e da conferência da peça.</li>
        <li><b>Pix:</b> devolução para a conta de origem.</li>
        <li><b>Cartão de crédito:</b> estorno solicitado ao Mercado Pago. O crédito aparece na fatura conforme o prazo da operadora do cartão, normalmente em até duas faturas.</li>
        <li><b>Boleto:</b> devolução por Pix ou transferência para uma conta do titular da compra.</li>
      </ul>

      <h2>7. Nossos dados</h2>
      <CompanyId />
    </LegalPage>
  );
}
