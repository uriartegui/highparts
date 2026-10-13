import LegalPage from "../legal-page";
import CompanyId from "../company-id";
import { COMPANY } from "../company";

export default function Page() {
  return (
    <LegalPage eyebrow="LGPD E PRIVACIDADE" title="Política de privacidade" intro="Quais dados tratamos, por quê, com quem compartilhamos e como você exerce seus direitos.">
      <h2>1. Quem é responsável pelos seus dados</h2>
      <p>O controlador dos dados pessoais tratados neste site é:</p>
      <CompanyId role="Controlador" />
      <p>
        Encarregado pelo tratamento de dados pessoais (LGPD, art. 41):{" "}
        {COMPANY.privacyContact.name ? <b>{COMPANY.privacyContact.name}</b> : "atendimento HighParts"}, pelo e-mail{" "}
        <a href={`mailto:${COMPANY.privacyContact.email}`}>{COMPANY.privacyContact.email}</a>.
      </p>

      <h2>2. Quais dados tratamos</h2>
      <ul>
        <li><b>Cadastro:</b> nome, e-mail e telefone. A senha é protegida por derivação criptográfica (hash) e não é armazenada em texto legível.</li>
        <li><b>Dados do veículo:</b> placa, marca, modelo, ano, versão e respostas de compatibilidade quando você utilizar a consulta de placa, o assistente ou informar um veículo em um pedido.</li>
        <li><b>Endereços e pedidos:</b> endereços de entrega, itens comprados, valores, status, transportadora e código de rastreio.</li>
        <li><b>Carrinho:</b> os itens escolhidos, salvos na sua conta e no seu navegador.</li>
        <li><b>Pagamento:</b> recebemos do Mercado Pago apenas a identificação, o status, o valor e a moeda do pagamento. Dados de cartão não passam pela HighParts.</li>
        <li><b>Consulta pela placa:</b> quando a consulta automática estiver habilitada, a placa informada é enviada ao provedor de dados veiculares para identificar o veículo. O retorno usado pela HighParts não deve conter dados do proprietário. Para reduzir consultas repetidas, o resultado fica em cache por até 30 dias, associado a um hash da placa.</li>
        <li><b>Segurança:</b> eventos de criação de conta, autenticação, falhas e bloqueios, com identificadores protegidos por hash quando aplicável, além de dados técnicos processados pela verificação anti-robô (Cloudflare Turnstile).</li>
      </ul>

      <h2>3. Para que usamos e com qual base legal</h2>
      <ul>
        <li><b>Execução do contrato</b> (art. 7º, V): criar e manter sua conta, processar pedidos, pagamentos e entregas, e prestar atendimento.</li>
        <li><b>Cumprimento de obrigação legal</b> (art. 7º, II): emissão de documentos fiscais, guarda de registros exigida pelo Marco Civil da Internet e atendimento a autoridades.</li>
        <li><b>Legítimo interesse</b> (art. 7º, IX): prevenir fraudes, proteger contas contra acessos indevidos, identificar peças compatíveis e melhorar a loja.</li>
      </ul>
      <p>Enviamos apenas e-mails necessários à sua conta e aos seus pedidos, como confirmação de e-mail, recuperação de senha e atualizações de status. Não enviamos publicidade sem o seu consentimento.</p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Não vendemos dados pessoais. Compartilhamos somente o necessário com prestadores que operam a loja em nosso nome:</p>
      <ul>
        <li><b>Cloudflare:</b> hospedagem do site, banco de dados, segurança e verificação anti-robô.</li>
        <li><b>Resend:</b> envio dos e-mails da conta e dos pedidos.</li>
        <li><b>Mercado Pago:</b> processamento dos pagamentos.</li>
        <li><b>Provedor de dados veiculares:</b> identificação do veículo a partir da placa.</li>
        <li><b>Transportadoras e Correios:</b> entrega dos pedidos.</li>
        <li><b>Contabilidade e emissão fiscal:</b> cumprimento de obrigações fiscais.</li>
        <li><b>Autoridades públicas:</b> quando exigido por lei ou ordem judicial.</li>
      </ul>
      <p>Alguns prestadores podem processar dados fora do Brasil. A HighParts deve limitar o compartilhamento ao necessário e adotar os mecanismos aplicáveis para transferência internacional previstos na LGPD.</p>

      <h2>5. Cookies e armazenamento no navegador</h2>
      <ul>
        <li><b>Cookie de sessão</b> (<code>highparts_session</code>): mantém você conectado por até 30 dias. É essencial, protegido contra acesso por scripts e só é enviado por conexão segura.</li>
        <li><b>Armazenamento local:</b> guarda o seu carrinho neste navegador.</li>
        <li><b>Verificação anti-robô:</b> o Cloudflare Turnstile pode usar dados técnicos do navegador para diferenciar pessoas de robôs nas telas de login e cadastro.</li>
      </ul>
      <p>Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li><b>Conta:</b> enquanto ela estiver ativa e, depois disso, pelo período necessário ao cumprimento de obrigações legais ou ao exercício regular de direitos.</li>
        <li><b>Pedidos e documentos fiscais:</b> durante os prazos legais aplicáveis à relação de consumo e às obrigações fiscais.</li>
        <li><b>Eventos de segurança:</b> pelo tempo necessário para prevenção de fraude, proteção das contas e cumprimento das obrigações legais aplicáveis.</li>
        <li><b>Consultas de placa:</b> até 30 dias.</li>
      </ul>

      <h2>7. Como protegemos</h2>
      <p>Conexão criptografada (HTTPS) em todo o site, senhas protegidas por derivação criptográfica, sessões e links de recuperação com validade limitada, limite de tentativas de login, verificação anti-robô e acesso administrativo restrito.</p>

      <h2>8. Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
        <li>portabilidade dos dados;</li>
        <li>informação sobre com quem compartilhamos;</li>
        <li>exclusão dos dados, observados os prazos legais de guarda.</li>
      </ul>
      <p>Para exercer seus direitos, escreva para <a href={`mailto:${COMPANY.privacyContact.email}`}>{COMPANY.privacyContact.email}</a>. Podemos pedir uma confirmação de identidade para proteger a sua conta. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</p>

      <h2>9. Menores de idade</h2>
      <p>A loja é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de crianças e adolescentes.</p>

      <h2>10. Alterações</h2>
      <p>Esta política pode ser atualizada. A versão vigente é sempre a publicada nesta página, com a data indicada acima. Mudanças relevantes serão comunicadas no site ou por e-mail.</p>
    </LegalPage>
  );
}
