import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";
import { Header } from "@/components/layout/Header";

export default function LoginPage() {
  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-text mb-8">Login</h1>
        <LoginForm />
        <p className="text-sm text-text-secondary mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </>
  );
}
