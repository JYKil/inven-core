'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
      { title: '거래처', href: '/partners', icon: Users },
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

export function AppSidebar() {
  const pathname = usePathname()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === 'super_admin') setIsSuperAdmin(true)
        })
    })
  }, [])

  const groups = isSuperAdmin ? [...navGroups, adminGroup] : navGroups

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 flex items-center justify-center border-b border-border">
        <Link href="/" className="flex items-center gap-2 px-2">
          <Building2 className="h-5 w-5 text-[#D4642A] shrink-0" />
          <span className="font-heading font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            inven-core
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label || 'home'}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
      </SidebarContent>
    </Sidebar>
  )
}
