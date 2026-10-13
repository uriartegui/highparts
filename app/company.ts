// Single source of truth for the company identification that Brazilian
// e-commerce law (Decreto 7.962/2013, art. 2) requires on the site, and for the
// contact details used by the footer and the legal pages.
// Required identification fields must be filled before publishing these pages.
export const COMPANY = {
  tradeName: "HighParts",
  legalName: "HIGHPARTS AUTOPECAS LTDA",
  cnpj: "69.510.025/0001-31",
  address: {
    street: "Servidão Hermann Vieira, 100",
    complement: "Galpão 01",
    district: "Bom Viver",
    city: "Biguaçu",
    state: "SC",
    postalCode: "88160-710",
  },
  supportEmail: "contato@highparts.com.br",
  phone: "(48) 9160-0517",
  whatsapp: "", // digits only with country code, e.g. "5548999999999"
  hours: "", // e.g. "Segunda a sexta, das 9h às 18h"
  privacyContact: {
    // Encarregado pelo tratamento de dados pessoais (LGPD, art. 41).
    name: "",
    email: "contato@highparts.com.br",
  },
  legalVersion: "13 de outubro de 2026",
};

export function formatAddress() {
  const a = COMPANY.address;
  const line1 = [a.street, a.complement].filter(Boolean).join(", ");
  const line2 = [a.district, a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state].filter(Boolean).join(" · ");
  return [line1, line2, a.postalCode && `CEP ${a.postalCode}`].filter(Boolean).join(" · ");
}

export function whatsappLink(text = "Olá, HighParts! Preciso de ajuda com uma peça.") {
  return COMPANY.whatsapp ? `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(text)}` : "";
}

export function companyIdentificationIsComplete() {
  const a = COMPANY.address;
  return Boolean(
    COMPANY.legalName &&
    COMPANY.cnpj &&
    a.street &&
    a.district &&
    a.city &&
    a.state &&
    a.postalCode &&
    COMPANY.supportEmail,
  );
}
