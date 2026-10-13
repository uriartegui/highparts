import { COMPANY, formatAddress } from "./company";

// Seller / data controller identification block used inside legal texts.
export default function CompanyId({ role }: { role?: string }) {
  const address = formatAddress();
  return (
    <ul className="hp-company-id">
      <li><span>{role ?? "Empresa"}</span><b>{COMPANY.legalName}</b></li>
      {COMPANY.cnpj && <li><span>CNPJ</span><b>{COMPANY.cnpj}</b></li>}
      {address && <li><span>Endereço</span><b>{address}</b></li>}
      <li><span>E-mail</span><b><a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></b></li>
      {COMPANY.phone && <li><span>Telefone</span><b>{COMPANY.phone}</b></li>}
      {COMPANY.hours && <li><span>Atendimento</span><b>{COMPANY.hours}</b></li>}
    </ul>
  );
}
