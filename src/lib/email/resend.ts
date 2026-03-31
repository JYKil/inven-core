import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

// HTML 특수문자 이스케이프
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// super_admin 이메일 조회
async function getSuperAdminEmails(): Promise<string[]> {
  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'super_admin')
    .eq('is_active', true)

  return data?.map((p) => p.email) ?? []
}

// 새 가입자 알림 메일을 super_admin에게 발송
export async function sendNewUserNotification(userEmail: string, userName: string) {
  try {
    const adminEmails = await getSuperAdminEmails()
    if (adminEmails.length === 0) {
      console.warn('[email] super_admin 이메일을 찾을 수 없습니다')
      return
    }

    const safeName = escapeHtml(userName)
    const safeEmail = escapeHtml(userEmail)
    // subject에서 개행문자 제거 (email header injection 방지)
    const safeSubjectName = userName.replace(/[\r\n]/g, '').slice(0, 100)
    const safeSubjectEmail = userEmail.replace(/[\r\n]/g, '').slice(0, 100)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'inven-core <noreply@resend.dev>',
      to: adminEmails,
      subject: `[inven-core] 새 가입 요청: ${safeSubjectName} (${safeSubjectEmail})`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="font-size: 18px; color: #1A1714; margin-bottom: 16px;">새 사용자 가입 요청</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #6B6158; font-size: 14px;">이름</td>
              <td style="padding: 8px 0; color: #1A1714; font-size: 14px; font-weight: 500;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B6158; font-size: 14px;">이메일</td>
              <td style="padding: 8px 0; color: #1A1714; font-size: 14px; font-weight: 500;">${safeEmail}</td>
            </tr>
          </table>
          <p style="font-size: 14px; color: #6B6158; line-height: 1.6;">
            관리자 페이지의 <strong>전체 사용자 관리</strong>에서 회사와 역할을 지정해주세요.
          </p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/users"
             style="display: inline-block; margin-top: 16px; padding: 8px 20px; background: #D4642A; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
            사용자 관리 열기
          </a>
        </div>
      `,
    })
  } catch (error) {
    // 이메일 실패 시 가입은 성공 처리 (best-effort)
    console.error('[email] 알림 메일 발송 실패:', error)
  }
}
