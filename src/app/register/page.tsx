import Link from "next/link";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { Header } from "@/components/layout/Header";

export default function RegisterPage() {
  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-text mb-8">Create Account</h1>
        <RegisterForm />
        <p className="text-sm text-text-secondary mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}
