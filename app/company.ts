// Single source of truth for the company identification that Brazilian
// e-commerce law (Decreto 7.962/2013, art. 2) requires on the site, and for the
// contact details used by the footer and the legal pages.
// Empty fields are simply not rendered, so fill them in before publishing.
export const COMPANY = {
  tradeName: "HighParts",
  legalName: "HIGHPARTS AUTOPECAS LTDA",
  cnpj: "", // e.g. "00.000.000/0001-00"
  address: {
    street: "", // e.g. "Rua Exemplo, 123"
    complement: "",
    district: "",
    city: "",
    state: "", // UF
    postalCode: "", // e.g. "88000-000"
  },
  supportEmail: "alisson@highparts.com.br",
  phone: "", // e.g. "(48) 0000-0000"
  whatsapp: "", // digits only with country code, e.g. "5548999999999"
  hours: "", // e.g. "Segunda a sexta, das 9h às 18h"
  privacyContact: {
    // Encarregado pelo tratamento de dados pessoais (LGPD, art. 41).
    name: "",
    email: "alisson@highparts.com.br",
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
