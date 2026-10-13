import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";
export const metadata:Metadata={title:"HighParts | Autopeças de alta performance",description:"Peças automotivas selecionadas para performance, segurança e confiança.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
