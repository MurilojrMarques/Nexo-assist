import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/features/auth/components/login-form";
import { LoginShowcase } from "@/features/auth/components/login-showcase";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-1">
      <LoginShowcase />

      <main className="flex flex-1 flex-col justify-between gap-12 px-6 py-10 sm:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
          <Logo className="text-ink lg:hidden" />
          <p className="flex flex-wrap gap-x-1.5 text-[13.5px] text-muted">
            Problema para entrar?
            <a href="tel:4000" className="font-semibold text-link hover:underline">
              Ligue no ramal 4000
            </a>
          </p>
        </header>

        <div className="flex justify-center">
          <Suspense fallback={<div className="h-[440px] w-full max-w-[380px]" />}>
            <LoginForm />
          </Suspense>
        </div>

        <footer className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-[12.5px] text-muted">
          <span>© 2026 Nexo · Service desk de TI</span>
          <a href="#" className="hover:underline">
            Privacidade e uso de dados
          </a>
        </footer>
      </main>
    </div>
  );
}
