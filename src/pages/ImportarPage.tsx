import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

import { authFetch } from '@/shared/http/authFetch'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

type Preview = {
  fileName: string
  sheetName: string
  rows: unknown[][]
  totalRows: number
}

function normalizeCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

export function ImportarPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const header = useMemo(() => {
    const rows = preview?.rows ?? []
    const maxCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0)
    return Array.from({ length: maxCols }, (_, i) => `Coluna ${i + 1}`)
  }, [preview])

  async function onPickFile(file: File | null) {
    setError(null)
    setSuccess(null)
    setPreview(null)
    setFile(file)
    if (!file) return

    try {
      setIsReading(true)
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      if (!firstSheetName) throw new Error('Arquivo sem abas/planilhas.')

      const ws = wb.Sheets[firstSheetName]
      if (!ws) throw new Error('Planilha inválida.')

      const raw = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
      }) as unknown[][]

      const rows = raw.slice(0, 30)
      setPreview({
        fileName: file.name,
        sheetName: firstSheetName,
        rows,
        totalRows: raw.length,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao ler arquivo.'
      setError(message)
    } finally {
      setIsReading(false)
    }
  }

  async function onImportar() {
    setError(null)
    setSuccess(null)
    if (!file) return

    try {
      setIsImporting(true)

      const form = new FormData()
      // Tenta cobrir os nomes mais comuns de campo.
      form.append('file', file)
      form.append('arquivo', file)

      const res = await authFetch('/clientes/importar', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        let message = `Erro ao importar (HTTP ${res.status}).`
        try {
          const data = (await res.json()) as unknown
          if (data && typeof data === 'object' && 'message' in data) {
            const m = (data as { message?: unknown }).message
            if (typeof m === 'string' && m.trim()) message = m
          }
        } catch {
          // ignore
        }
        setError(message)
        return
      }

      let totalImportado: number | null = null
      let backendMessage: string | null = null

      try {
        const data = (await res.json()) as unknown
        if (data && typeof data === 'object') {
          const obj = data as Record<string, unknown>
          const totalCandidate = obj.total_importado ?? obj.totalImportado ?? obj.total ?? obj.importados
          if (typeof totalCandidate === 'number' && Number.isFinite(totalCandidate)) {
            totalImportado = Math.max(0, Math.trunc(totalCandidate))
          } else if (typeof totalCandidate === 'string') {
            const n = Number(totalCandidate)
            if (Number.isFinite(n)) totalImportado = Math.max(0, Math.trunc(n))
          }

          if (typeof obj.message === 'string' && obj.message.trim()) backendMessage = obj.message.trim()
        }
      } catch {
        // backend pode retornar vazio/texto; nesse caso seguimos sem total
      }

      if (typeof totalImportado === 'number') {
        const msg = `Foram importados ${totalImportado} de clientes`
        setSuccess(backendMessage ?? msg)
      } else {
        const msg = backendMessage ?? 'Importação concluída com sucesso.'
        setSuccess(msg)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao importar.'
      setError(message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="importar-arquivo">Arquivo Excel</Label>
            <Input
              id="importar-arquivo"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={isReading || isImporting}
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="text-sm text-muted-foreground">
              {isReading
                ? 'Lendo arquivo...'
                : preview
                  ? `Arquivo: ${preview.fileName} (aba: ${preview.sheetName})`
                  : 'Selecione um .xlsx/.xls para visualizar uma prévia.'}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-md border border-emerald-600/40 bg-emerald-600/10 p-4 text-sm">
              {success}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="button" disabled={!file || isReading || isImporting} onClick={() => void onImportar()}>
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
            {preview ? (
              <div className="text-sm text-muted-foreground">
                Total no arquivo: {preview.totalRows}
              </div>
            ) : null}
          </div>

          {preview?.rows?.length ? (
            <div className="rounded-md border">
              <div className="flex items-center justify-between gap-3 border-b p-3">
                <div className="text-sm font-medium">Prévia (até 30 linhas)</div>
                <Button type="button" variant="outline" onClick={() => setPreview(null)}>
                  Limpar
                </Button>
              </div>
              <div className="max-h-[60dvh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {header.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((r, idx) => (
                      <TableRow key={idx}>
                        {header.map((_, colIdx) => (
                          <TableCell key={colIdx} className="whitespace-nowrap">
                            {normalizeCell(r[colIdx])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

