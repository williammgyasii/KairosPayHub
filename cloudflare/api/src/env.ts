export interface Env {
  API: DurableObjectNamespace<KairosApiContainer>
  RATE_LIMIT_AUTH: RateLimit
  RATE_LIMIT_JOIN: RateLimit
  RATE_LIMIT_API: RateLimit
  RATE_LIMIT_HUBS: RateLimit
  PAGES_ORIGIN: string
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
  WEB_PUSH_PUBLIC_KEY?: string
  WEB_PUSH_PRIVATE_KEY?: string
  WEB_PUSH_SUBJECT?: string
  TURNSTILE_SECRET?: string
  TURNSTILE_ALLOWED_HOSTNAMES?: string
  FEATURE_FLAG_SERVICE_RECORDINGS_ENABLED?: string
  FEATURE_FLAG_SERVICE_RECORDINGS_ALLOWED_CHURCH_IDS?: string
  BUNNY_STREAM_LIBRARY_ID?: string
  BUNNY_STREAM_API_KEY?: string
  BUNNY_STREAM_TOKEN_SECURITY_KEY?: string
  BUNNY_STREAM_WEBHOOK_SECRET?: string
  OUTREACH_OPEN_PLACES_API_KEY?: string
  OUTREACH_OPENAI_API_KEY?: string
  OUTREACH_SMTP_HOST?: string
  OUTREACH_SMTP_PORT?: string
  OUTREACH_SMTP_USERNAME?: string
  OUTREACH_SMTP_PASSWORD?: string
  OUTREACH_FROM_ADDRESS?: string
  OUTREACH_FROM_NAME?: string
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
  if (env.WEB_PUSH_PUBLIC_KEY) vars.WebPush__PublicKey = env.WEB_PUSH_PUBLIC_KEY
  if (env.WEB_PUSH_PRIVATE_KEY) vars.WebPush__PrivateKey = env.WEB_PUSH_PRIVATE_KEY
  if (env.WEB_PUSH_SUBJECT) vars.WebPush__Subject = env.WEB_PUSH_SUBJECT
  if (env.TURNSTILE_SECRET) vars.Turnstile__Secret = env.TURNSTILE_SECRET
  if (env.TURNSTILE_ALLOWED_HOSTNAMES) {
    vars.Turnstile__AllowedHostnames = env.TURNSTILE_ALLOWED_HOSTNAMES
  }

  if (env.CORS_ORIGIN_SECONDARY) {
    vars['Cors__Origins__1'] = env.CORS_ORIGIN_SECONDARY
  }

  vars['FeatureFlags__ServiceRecordings__Enabled'] =
    env.FEATURE_FLAG_SERVICE_RECORDINGS_ENABLED ?? 'false'
  if (env.FEATURE_FLAG_SERVICE_RECORDINGS_ALLOWED_CHURCH_IDS) {
    vars['FeatureFlags__ServiceRecordings__AllowedChurchIds'] =
      env.FEATURE_FLAG_SERVICE_RECORDINGS_ALLOWED_CHURCH_IDS
  }
  if (env.BUNNY_STREAM_LIBRARY_ID) {
    vars.BunnyStream__LibraryId = env.BUNNY_STREAM_LIBRARY_ID
  }
  if (env.BUNNY_STREAM_API_KEY) {
    vars.BunnyStream__ApiKey = env.BUNNY_STREAM_API_KEY
  }
  if (env.BUNNY_STREAM_TOKEN_SECURITY_KEY) {
    vars.BunnyStream__TokenSecurityKey = env.BUNNY_STREAM_TOKEN_SECURITY_KEY
  }
  if (env.BUNNY_STREAM_WEBHOOK_SECRET) {
    vars.BunnyStream__WebhookSecret = env.BUNNY_STREAM_WEBHOOK_SECRET
  }
  if (env.OUTREACH_OPEN_PLACES_API_KEY) {
    vars.Outreach__OpenPlacesApiKey = env.OUTREACH_OPEN_PLACES_API_KEY
  }
  if (env.OUTREACH_OPENAI_API_KEY) {
    vars.Outreach__OpenAiApiKey = env.OUTREACH_OPENAI_API_KEY
  }
  if (env.OUTREACH_SMTP_HOST) {
    vars.Outreach__Smtp__Host = env.OUTREACH_SMTP_HOST
  }
  if (env.OUTREACH_SMTP_PORT) {
    vars.Outreach__Smtp__Port = env.OUTREACH_SMTP_PORT
  }
  if (env.OUTREACH_SMTP_USERNAME) {
    vars.Outreach__Smtp__Username = env.OUTREACH_SMTP_USERNAME
  }
  if (env.OUTREACH_SMTP_PASSWORD) {
    vars.Outreach__Smtp__Password = env.OUTREACH_SMTP_PASSWORD
  }
  if (env.OUTREACH_FROM_ADDRESS) {
    vars.Outreach__FromAddress = env.OUTREACH_FROM_ADDRESS
  }
  if (env.OUTREACH_FROM_NAME) {
    vars.Outreach__FromName = env.OUTREACH_FROM_NAME
  }

  return vars
}
