import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
})

function userFor(email: string) {
  return new CognitoUser({ Username: email, Pool: userPool })
}

export interface Session {
  email: string | null
  accessToken: string
}

export function signUp(email: string, password: string, name?: string): Promise<void> {
  const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })]
  if (name) attributes.push(new CognitoUserAttribute({ Name: 'name', Value: name }))

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributes, [], (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userFor(email).confirmRegistration(code, true, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userFor(email).resendConfirmationCode((err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export function signIn(email: string, password: string): Promise<Session> {
  const authDetails = new AuthenticationDetails({ Username: email, Password: password })
  const user = userFor(email)

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        resolve({
          email: result.getIdToken().payload.email ?? null,
          accessToken: result.getAccessToken().getJwtToken(),
        })
      },
      onFailure: reject,
    })
  })
}

export function signOut(): void {
  userPool.getCurrentUser()?.signOut()
}

/**
 * Returns the current session (refreshing tokens if needed), or null when the
 * user is signed out. The refresh token is persisted in localStorage by the
 * SDK, so this survives page reloads.
 */
export function getSession(): Promise<Session | null> {
  const user = userPool.getCurrentUser()
  if (!user) return Promise.resolve(null)

  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: import('amazon-cognito-identity-js').CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null)
      resolve({
        email: session.getIdToken().payload.email ?? null,
        accessToken: session.getAccessToken().getJwtToken(),
      })
    })
  })
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.accessToken ?? null
}
