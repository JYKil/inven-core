'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { X, Search, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/common/page-header'
import { useItemSearch } from '@/hooks/use-items'
import { useCreateBom } from '@/hooks/use-bom'

type MaterialLine = {
  material_item_id: string
  quantity: number
  code: string
  name: string
  unit: string
}

export default function NewBomPage() {
  const router = useRouter()
  const createBom = useCreateBom()

  // 결과품목 선택
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string; code: string; name: string; unit: string
  } | null>(null)
  const { data: productResults } = useItemSearch(productSearch)
  // 조립 유형 품목만 필터
  const assemblyItems = useMemo(
    () => (productResults ?? []).filter((i: any) => i.item_type === 'assembly'),
    [productResults],
  )

  // 재료 검색 + 라인
  const [materialSearch, setMaterialSearch] = useState('')
  const { data: materialResults } = useItemSearch(materialSearch)
  const [lines, setLines] = useState<MaterialLine[]>([])
  // 수량 유효성 에러 (material_item_id 기준)
  const [qtyErrors, setQtyErrors] = useState<Record<string, boolean>>({})

  const selectProduct = (item: { id: string; code: string; name: string; unit: string }) => {
    setSelectedProduct(item)
    setProductSearch('')
  }

  const addMaterial = (mat: { id: string; code: string; name: string; unit: string }) => {
    // 순환참조 방지: 결과품목 자신을 재료로 추가 불가
    if (selectedProduct && mat.id === selectedProduct.id) {
      toast.error('결과품목을 자신의 재료로 추가할 수 없습니다')
      return
    }
    // 중복 재료 방지
    if (lines.some((l) => l.material_item_id === mat.id)) {
      toast.error('이미 추가된 재료입니다')
      return
    }
    setLines((prev) => [...prev, {
      material_item_id: mat.id,
      quantity: 1,
      code: mat.code,
      name: mat.name,
      unit: mat.unit,
    }])
    setMaterialSearch('')
  }

  const removeMaterial = (materialId: string) => {
    setLines((prev) => prev.filter((l) => l.material_item_id !== materialId))
    setQtyErrors((prev) => {
      const next = { ...prev }
      delete next[materialId]
      return next
    })
  }

  const updateQuantity = (materialId: string, value: string) => {
    const num = parseFloat(value)
    const invalid = isNaN(num) || num <= 0
    setQtyErrors((prev) => ({ ...prev, [materialId]: invalid }))
    setLines((prev) => prev.map((l: any) => l.material_item_id === materialId ? { ...l, quantity: invalid ? 0 : num } : l))
  }

  const hasQtyError = Object.values(qtyErrors).some(Boolean) || lines.some((l) => l.quantity <= 0)

  const handleSubmit = async () => {
    if (!selectedProduct) {
      toast.error('결과품목을 선택해주세요')
      return
    }
    if (lines.length === 0) {
      toast.error('최소 1개의 재료를 추가해주세요')
      return
    }
    if (hasQtyError) {
      toast.error('수량을 올바르게 입력해주세요')
      return
    }

    try {
      await createBom.mutateAsync({
        product_item_id: selectedProduct.id,
        lines: lines.map((l, idx) => ({
          material_item_id: l.material_item_id,
          quantity: l.quantity,
          sort_order: idx,
        })),
      })
      toast.success('BOM 생성 완료')
      router.push('/bom')
    } catch (err) {
      toast.error(extractErrorMessage(err, 'BOM 생성 실패'))
    }
  }

  return (
    <div>
      <PageHeader title="BOM 생성" />
      <Card className="border-border">
        <CardContent className="pt-6 space-y-6">
          {/* 결과품목 선택 */}
          <div className="max-w-md">
            <Label htmlFor="product_search">결과품목 (조립 유형) *</Label>
            {selectedProduct ? (
              <div className="flex items-center gap-2 mt-1.5 px-3 py-2 border border-border rounded-md bg-background">
                <span className="font-data font-medium">{selectedProduct.code}</span>
                <span className="text-text-secondary">{selectedProduct.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{selectedProduct.unit}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-1"
                  onClick={() => { setSelectedProduct(null); setLines([]) }}
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="relative mt-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="product_search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="조립 품목 검색..."
                    className="h-9 pl-8"
                  />
                </div>
                {productSearch && assemblyItems.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-auto">
                    {assemblyItems.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                        onClick={() => selectProduct(item)}
                      >
                        <span className="font-data">{item.code}</span>
                        <span className="text-text-secondary">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {productSearch && productSearch.length > 0 && assemblyItems.length === 0 && productResults && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md p-3">
                    <p className="text-xs text-muted-foreground">
                      {productResults.length > 0
                        ? '조립 유형 품목만 선택 가능합니다. 품목 관리에서 유형을 확인해주세요.'
                        : '검색 결과가 없습니다'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 재료 목록 */}
          {selectedProduct && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-h3">재료 구성</h2>
              </div>

              {/* 재료 검색 */}
              <div className="relative mb-3 max-w-md">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="재료 품목 검색하여 추가..."
                    className="h-9 pl-8"
                  />
                </div>
                {materialSearch && materialResults && materialResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-auto">
                    {materialResults.map((mat: any) => (
                      <button
                        key={mat.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                        onClick={() => addMaterial(mat)}
                      >
                        <span className="font-data">{mat.code}</span>
                        <span className="text-text-secondary">{mat.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{mat.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {lines.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background/50">
                        <TableHead>코드</TableHead>
                        <TableHead>재료 품목</TableHead>
                        <TableHead>단위</TableHead>
                        <TableHead className="w-32">수량 *</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line: any) => (
                        <TableRow key={line.material_item_id}>
                          <TableCell className="font-data">{line.code}</TableCell>
                          <TableCell>{line.name}</TableCell>
                          <TableCell className="text-text-secondary">{line.unit}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              min="0.0001"
                              defaultValue={line.quantity}
                              onChange={(e) => updateQuantity(line.material_item_id, e.target.value)}
                              className={`h-8 w-24 font-data text-sm ${qtyErrors[line.material_item_id] ? 'border-destructive' : ''}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeMaterial(line.material_item_id)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">아직 추가된 재료가 없습니다</p>
                  <p className="text-xs text-text-muted mt-1">위 검색창에서 재료 품목을 검색하여 추가하세요</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedProduct || lines.length === 0 || hasQtyError || createBom.isPending}
              className="bg-primary hover:bg-primary-hover"
            >
              {createBom.isPending ? '생성 중...' : 'BOM 생성'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
