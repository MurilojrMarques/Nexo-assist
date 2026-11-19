import type { Metadata } from "next";
import { ConsoleScreen } from "@/features/console/components/console-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Conversas",
};

export default function ConsolePage() {
  return <ConsoleScreen />;
}
