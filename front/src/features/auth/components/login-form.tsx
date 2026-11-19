"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { InputField } from "@/components/ui/input-field";
import { isApiError } from "@/lib/api/api-error";
import { postLoginPath } from "@/features/auth/lib/home-path";
import { validateLogin, type LoginErrors } from "@/features/auth/lib/validate-login";
import { useSession } from "@/features/auth/session/session-provider";

function loginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "E-mail ou senha inválidos.";
    }

    if (error.status === 429) {
      return error.message;
    }

    if (error.status === 0) {
      return "Não foi possível conectar ao servidor. Tente de novo em instantes.";
    }
  }

  return "Não foi possível entrar agora. Tente de novo em instantes.";
}

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { status, user, login } = useSession();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(postLoginPath(user.role, next));
    }
  }, [status, user, next, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const result = validateLogin({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    setFormError(null);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await login(result.data.email, result.data.password);
    } catch (error) {
      setFormError(loginErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className="flex w-full max-w-[380px] flex-col gap-7"
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[40px]/[44px] tracking-[-0.8px] text-ink">Entrar</h1>
        <p className="text-[15.5px]/[23px] text-muted">
          Use seu e-mail corporativo e a senha da rede Nexo.
        </p>
      </div>

      <div className="flex flex-col gap-[18px]">
        <InputField
          id="email"
          name="email"
          type="email"
          label="E-mail corporativo"
          icon={Mail}
          placeholder="ana.souza@nexo.com.br"
          autoComplete="username"
          maxLength={254}
          error={errors.email}
        />

        <InputField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Senha"
          icon={LockKeyhole}
          autoComplete="current-password"
          maxLength={256}
          error={errors.password}
          className={showPassword ? "" : "tracking-[2px]"}
          labelAction={
            <a href="#" className="text-[13.5px] font-medium text-link hover:underline">
              Esqueci minha senha
            </a>
          }
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="flex size-[30px] shrink-0 items-center justify-center rounded-md text-muted hover:bg-ink/5"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />

        <label className="flex w-fit cursor-pointer items-center gap-[9px] pt-0.5 text-[13.5px] text-ink-soft">
          <span className="relative flex size-[18px] shrink-0">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="peer size-full cursor-pointer appearance-none rounded-md border border-ink/20 bg-white checked:border-primary checked:bg-primary"
            />
            <Check
              aria-hidden="true"
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 peer-checked:opacity-100"
            />
          </span>
          Manter conectado neste computador
        </label>
      </div>

      {formError && (
        <p role="alert" className="-mt-2 rounded-lg bg-danger/8 px-3.5 py-2.5 text-[13.5px] text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[15.5px] font-semibold text-white shadow-[0_1px_2px_#0062c433,0_6px_16px_#0062c426] transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? "Entrando…" : "Entrar"}
        {!submitting && <ArrowRight aria-hidden="true" className="size-4" />}
      </button>

      <div className="h-[30px] border-t border-line" />
    </form>
  );
}
