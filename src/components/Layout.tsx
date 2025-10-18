import Head from "next/head";
import React from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export const Layout = ({ children, title }: LayoutProps) => (
  <div className="flex min-h-screen w-full flex-col">
    <Head>
      <title>{title}</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    </Head>

    <div className="w-full pb-4">
      <Header />
    </div>

    <main className="flex-grow">{children}</main>

    <div className="w-full">
      <Footer />
    </div>
  </div>
);
