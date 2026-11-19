export const CORPORATE_DOMAIN = "nexo.com.br";

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

export type LoginValidation =
  | { success: true; data: LoginInput }
  | { success: false; errors: LoginErrors };

export function validateLogin(input: LoginInput): LoginValidation {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const errors: LoginErrors = {};

  if (!email) {
    errors.email = "Informe seu e-mail corporativo.";
  } else if (!EMAIL_FORMAT.test(email)) {
    errors.email = "Digite um e-mail válido.";
  } else if (!email.endsWith(`@${CORPORATE_DOMAIN}`)) {
    errors.email = `Use seu e-mail corporativo @${CORPORATE_DOMAIN}.`;
  }

  if (!password) {
    errors.password = "Informe sua senha.";
  }

  if (errors.email || errors.password) {
    return { success: false, errors };
  }

  return { success: true, data: { email, password } };
}
