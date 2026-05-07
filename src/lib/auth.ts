import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // 역할: pending(승인 대기) → normal / company_admin / super_admin
      role: {
        type: 'string',
        required: false,
        defaultValue: 'pending',
        input: false,
      },
      // 소속 회사 ID (super_admin은 null)
      companyId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
})

export type AppUser = typeof auth.$Infer.Session.user
export type AppSession = typeof auth.$Infer.Session
