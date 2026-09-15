import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your CivicLense account" },
      {
        name: "description",
        content:
          "Join CivicLense to report local problems, confirm existing issues and follow what happens next.",
      },
      { property: "og:title", content: "Create your CivicLense account" },
      { property: "og:description", content: "Report, confirm and follow local issues." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  surname: z.string().trim().min(1, "Surname is required").max(60),
  email: z.string().trim().email("Enter a valid email address").max(255),
  postcode: z
    .string()
    .trim()
    .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, "Enter a valid UK postcode"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    email: "",
    postcode: "",
    password: "",
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: parsed.data.firstName,
          surname: parsed.data.surname,
          postcode: parsed.data.postcode.toUpperCase(),
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/" });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Logo />
        <div className="civic-card mt-6 w-full max-w-sm p-6 text-center">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent a confirmation link to <strong>{form.email}</strong>. Click it to activate
            your CivicLense account.
          </p>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/">Back to the map</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Logo />
      <div className="civic-card mt-6 w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publicly you'll only ever appear as your first name and postcode district, e.g. Kayne ·
          SO15.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={form.firstName} onChange={set("firstName")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="surname">Surname</Label>
              <Input id="surname" value={form.surname} onChange={set("surname")} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" value={form.postcode} onChange={set("postcode")} required />
            <p className="text-xs text-muted-foreground">Kept private — never shown publicly.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
