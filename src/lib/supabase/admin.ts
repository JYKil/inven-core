import { createClient } from './client'

export function createAdminSupabaseClient() {
  return {
    ...createClient(),
    auth: {
      admin: {
        async createUser(_input?: unknown) {
          return { data: { user: { id: '' } }, error: new Error('Better Auth invite migration is pending') }
        },
        async deleteUser(_id?: unknown) {
          return { error: null }
        },
      },
    },
  }
}
