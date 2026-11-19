import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileAccount } from "@/features/profile/components/profile-account";

export const instant = false;

export const metadata: Metadata = {
  title: "Meu perfil",
};

export default function ProfilePage() {
  return (
    <>
      <PageHeader trail={["Service desk de TI"]} current="Meu perfil" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-12 md:px-0">
        <div className="mx-auto flex w-full flex-col gap-7 md:w-[50.85%]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.4px] text-ink">Meu perfil</h1>
            <p className="text-[14.5px] text-muted">Seus dados de acesso ao service desk de TI.</p>
          </div>
          <ProfileAccount />
        </div>
      </div>
    </>
  );
}
