"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { InputField } from "@/components/ui/input-field";
import { homePathFor } from "@/features/auth/lib/home-path";
import { validateLogin, type LoginErrors } from "@/features/auth/lib/validate-login";

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const result = validateLogin({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    router.push(homePathFor(result.data.email));
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-[380px] flex-col gap-7">
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
          error={errors.email}
        />

        <InputField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Senha"
          icon={LockKeyhole}
          autoComplete="current-password"
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

      <button
        type="submit"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[15.5px] font-semibold text-white shadow-[0_1px_2px_#0062c433,0_6px_16px_#0062c426] transition-colors hover:bg-primary/90"
      >
        Entrar
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>

      <div className="h-[30px] border-t border-line" />
    </form>
  );
}
