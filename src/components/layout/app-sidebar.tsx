'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Warehouse,
  Package,
  ClipboardList,
  PackageCheck,
  CreditCard,
  Wrench,
  ShoppingCart,
  BarChart3,
  ArrowLeftRight,
  FileText,
  Settings,
  Building2,
  UserCog,
  Shield,
  BookOpen,
  PanelLeftClose,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const navGroups = [
  {
    label: '',
    items: [
      { title: '대시보드', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: '기초 마스터',
    items: [
      { title: '기준정보', href: '/reference-codes', icon: BookOpen },
      { title: '업체정보', href: '/vendors', icon: Users },
      { title: '고객정보', href: '/customers', icon: UserCheck },
      { title: '창고', href: '/warehouses', icon: Warehouse },
      { title: '품목 관리', href: '/items', icon: Package },
    ],
  },
  {
    label: '구매·입고',
    items: [
      { title: '발주서(PO)', href: '/purchase-orders', icon: ClipboardList },
      { title: '입고 처리', href: '/goods-receipts', icon: PackageCheck },
      { title: '지급 관리', href: '/po-payments', icon: CreditCard },
    ],
  },
  {
    label: '생산',
    items: [
      { title: '조립 지시', href: '/assembly-orders', icon: Wrench },
    ],
  },
  {
    label: '영업·출고',
    items: [
      { title: '판매 주문', href: '/sales-orders', icon: ShoppingCart },
    ],
  },
  {
    label: '재고',
    items: [
      { title: '재고 현황', href: '/inventory', icon: BarChart3 },
      { title: '창고 이동', href: '/warehouse-transfers', icon: ArrowLeftRight },
    ],
  },
  {
    label: '보고서',
    items: [
      { title: '재고 수불부', href: '/reports/inventory-ledger', icon: FileText },
      { title: '창고별 재고', href: '/reports/warehouse-stock', icon: FileText },
      { title: '매출 보고서', href: '/reports/sales', icon: FileText },
    ],
  },
  {
    label: '설정',
    items: [
      { title: '회사 설정', href: '/settings', icon: Settings },
      { title: '사용자 관리', href: '/settings/users', icon: UserCog },
    ],
  },
]

// super_admin 전용 메뉴
const adminGroup = {
  label: '관리',
  items: [
    { title: '회사 관리', href: '/admin/companies', icon: Building2 },
    { title: '전체 사용자', href: '/admin/users', icon: Shield },
  ],
}

function SidebarCollapseButton() {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      onClick={toggleSidebar}
      className="ml-auto shrink-0 flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer group-data-[collapsible=icon]:hidden"
      aria-label="사이드바 접기"
    >
      <PanelLeftClose className="h-4 w-4" />
    </button>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from('profiles')
        .select('display_name, email, role, company_id')
        .eq('id', user.id)
        .single()
      if (!data) return null
      return {
        displayName: data.display_name || data.email,
        email: data.email,
        role: data.role,
        company_id: data.company_id,
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  })

  // super_admin은 관리 메뉴만 표시 (일반 업무 메뉴 불필요)
  const groups = useMemo(
    () => profile?.role === 'super_admin' ? [adminGroup] : navGroups,
    [profile?.role],
  )

  return (
    <Sidebar collapsible="icon">
      <div
        data-slot="sidebar-header"
        data-sidebar="header"
        className="flex flex-row gap-0 p-2 h-12 items-center border-b border-border group-data-[collapsible=icon]:border-b-0 px-2"
      >
        <Link href="/" className="flex items-center gap-2 px-2 min-w-0">
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <span className="font-heading font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            inven-core
          </span>
        </Link>
        <SidebarCollapseButton />
      </div>
      <SidebarContent>
        <nav aria-label="메인 메뉴">
        {groups.map((group) => (
          <SidebarGroup key={group.label || 'home'}>
            {group.label && (
              <SidebarGroupLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
