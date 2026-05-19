import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="mb-6 font-heading text-xl font-semibold">Sign in</h1>
      <LoginForm />
    </div>
  );
}
