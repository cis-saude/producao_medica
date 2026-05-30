import nodemailer from "nodemailer";

function createTransporter() {
  // Suporte a SMTP configurado via variáveis de ambiente
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "noreply@cissaude.com.br";

  if (host && user && pass) {
    return { transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
  }

  // Fallback: Ethereal (e-mail de teste, visível em https://ethereal.email)
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: { user: "test@ethereal.email", pass: "test" },
  });
  return { transporter, from: "noreply@cissaude.com.br" };
}

export async function enviarEmailRecuperacaoSenha(
  destinatario: string,
  nome: string,
  token: string,
  baseUrl: string
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const { transporter, from } = createTransporter();
  const link = `${baseUrl}/redefinir-senha?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: #1a5c3a; padding: 24px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Grupo CIS — Recuperação de Senha</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 15px;">Olá, <strong>${nome}</strong>!</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta no 
            <strong>Dashboard de Gestão de Plantões Médicos</strong>.
          </p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>2 horas</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" 
               style="background: #1a5c3a; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="color: #888; font-size: 12px; line-height: 1.6;">
            Se você não solicitou a redefinição de senha, ignore este e-mail. 
            Sua senha permanece a mesma.
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 16px;">
            Ou copie e cole este link no seu navegador:<br>
            <span style="color: #1a5c3a; word-break: break-all;">${link}</span>
          </p>
        </div>
        <div style="background: #f9f9f9; padding: 16px 32px; border-top: 1px solid #eee;">
          <p style="color: #aaa; font-size: 11px; margin: 0; text-align: center;">
            © ${new Date().getFullYear()} Grupo CIS — Soluções Integradas em Saúde
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Grupo CIS" <${from}>`,
      to: destinatario,
      subject: "Redefinição de Senha — Dashboard de Plantões",
      html,
    });

    // Se for Ethereal, retorna URL de preview para debug
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log(`[Mailer] Preview URL (Ethereal): ${previewUrl}`);
    }

    return { success: true, previewUrl: previewUrl || undefined };
  } catch (error: any) {
    console.error("[Mailer] Erro ao enviar e-mail:", error.message);
    return { success: false, error: error.message };
  }
}

export async function enviarEmailBoasVindas(
  destinatario: string,
  nome: string,
  senhaTemporaria: string,
  baseUrl: string
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const { transporter, from } = createTransporter();
  const link = `${baseUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: #1a5c3a; padding: 24px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Grupo CIS — Bem-vindo ao Sistema!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 15px;">Olá, <strong>${nome}</strong>!</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Sua conta no <strong>Dashboard de Gestão de Plantões Médicos</strong> foi criada com sucesso.
          </p>
          <div style="background: #f0f7f4; border: 1px solid #c3e0d1; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #333; font-size: 14px;"><strong>Seus dados de acesso:</strong></p>
            <p style="margin: 4px 0; color: #555; font-size: 14px;">E-mail: <strong>${destinatario}</strong></p>
            <p style="margin: 4px 0; color: #555; font-size: 14px;">Senha temporária: <strong>${senhaTemporaria}</strong></p>
          </div>
          <p style="color: #e65c00; font-size: 13px; font-weight: bold;">
            ⚠️ Por segurança, altere sua senha após o primeiro acesso.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" 
               style="background: #1a5c3a; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
              Acessar o Sistema
            </a>
          </div>
        </div>
        <div style="background: #f9f9f9; padding: 16px 32px; border-top: 1px solid #eee;">
          <p style="color: #aaa; font-size: 11px; margin: 0; text-align: center;">
            © ${new Date().getFullYear()} Grupo CIS — Soluções Integradas em Saúde
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Grupo CIS" <${from}>`,
      to: destinatario,
      subject: "Bem-vindo ao Dashboard de Plantões — Grupo CIS",
      html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) console.log(`[Mailer] Preview URL (Ethereal): ${previewUrl}`);
    return { success: true, previewUrl: previewUrl || undefined };
  } catch (error: any) {
    console.error("[Mailer] Erro ao enviar e-mail:", error.message);
    return { success: false, error: error.message };
  }
}
