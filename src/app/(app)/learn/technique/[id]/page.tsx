import { getAllTechniques } from "@/lib/mock/techniques";
import { ClientTechniquePage } from "./client-page";

export function generateStaticParams() {
  return getAllTechniques().map((t) => ({ id: t.id }));
}

export default function TechniquePageWrapper() {
  return <ClientTechniquePage />;
}
