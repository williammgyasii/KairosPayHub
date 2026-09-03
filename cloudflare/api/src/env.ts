export interface Env {
  API: DurableObjectNamespace<KairosApiContainer>
  DB_CONNECTION_STRING: string
  JWT_SIGNING_KEY: string
  EMAIL_SMTP_HOST: string
  EMAIL_SMTP_PORT: string
  EMAIL_SMTP_USERNAME: string
  EMAIL_SMTP_PASSWORD: string
  EMAIL_SMTP_USE_TLS: string
  EMAIL_FROM_ADDRESS: string
  EMAIL_FROM_NAME: string
  EMAIL_FRONTEND_BASE_URL: string
  R2_BUCKET_NAME: string
  R2_PUBLIC_BASE_URL: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_ENDPOINT: string
  JWT_ISSUER: string
  JWT_AUDIENCE: string
  CORS_ORIGIN_PRIMARY: string
  CORS_ORIGIN_SECONDARY?: string
}

import type { KairosApiContainer } from './container'

export function buildContainerEnv(env: Env): Record<string, string> {
  const vars: Record<string, string> = {
    ASPNETCORE_ENVIRONMENT: 'Production',
    ASPNETCORE_URLS: 'http://+:8080',
    DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE: 'false',
    ConnectionStrings__Default: env.DB_CONNECTION_STRING,
    Database__MigrateOnStartup: 'true',
    Jwt__Issuer: env.JWT_ISSUER,
    Jwt__Audience: env.JWT_AUDIENCE,
    Jwt__SigningKey: env.JWT_SIGNING_KEY,
    Email__FrontendBaseUrl: env.EMAIL_FRONTEND_BASE_URL,
    Email__FromAddress: env.EMAIL_FROM_ADDRESS,
    Email__FromName: env.EMAIL_FROM_NAME,
    'Email__Smtp__Host': env.EMAIL_SMTP_HOST,
    'Email__Smtp__Port': env.EMAIL_SMTP_PORT,
    'Email__Smtp__Username': env.EMAIL_SMTP_USERNAME,
    'Email__Smtp__Password': env.EMAIL_SMTP_PASSWORD,
    'Email__Smtp__UseTls': env.EMAIL_SMTP_USE_TLS,
    R2__BucketName: env.R2_BUCKET_NAME,
    R2__PublicBaseUrl: env.R2_PUBLIC_BASE_URL,
    R2__AccessKeyId: env.R2_ACCESS_KEY_ID,
    R2__SecretAccessKey: env.R2_SECRET_ACCESS_KEY,
    R2__Endpoint: env.R2_ENDPOINT,
    'Cors__Origins__0': env.CORS_ORIGIN_PRIMARY,
  }

  if (env.CORS_ORIGIN_SECONDARY) {
    vars['Cors__Origins__1'] = env.CORS_ORIGIN_SECONDARY
  }

  return vars
}
