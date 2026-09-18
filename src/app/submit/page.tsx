import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { SubmitForm } from "@/components/forms/SubmitForm";

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function SubmitPage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const defaultType = params.type || "story";

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-text mb-8">Submit a Story</h1>
        <SubmitForm defaultType={defaultType} />
      </div>
    </>
  );
}
