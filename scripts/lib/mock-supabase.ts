type MockRow = Record<string, any>
type MockTables = Record<string, MockRow[]>

function cloneRow<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function rowMatchesFilters(row: MockRow, filters: Array<{ type: 'eq' | 'neq' | 'in'; field: string; value: any }>): boolean {
  return filters.every((filter) => {
    const actual = row[filter.field]
    if (filter.type === 'eq') return actual === filter.value
    if (filter.type === 'neq') return actual !== filter.value
    if (filter.type === 'in') return Array.isArray(filter.value) && filter.value.includes(actual)
    return true
  })
}

function nextId(tableName: string, table: MockRow[]): string {
  return `${tableName}-${table.length + 1}`
}

function prepareRow(tableName: string, table: MockRow[], row: MockRow): MockRow {
  const next = cloneRow(row)
  next.id ??= next.client_id ?? next.user_id ?? nextId(tableName, table)
  next.created_at ??= '2026-04-06T12:00:00.000Z'
  next.updated_at ??= next.created_at
  if (tableName === 'notifications' && typeof next.read === 'undefined') {
    next.read = false
  }
  return next
}

class MockQuery {
  private readonly filters: Array<{ type: 'eq' | 'neq' | 'in'; field: string; value: any }> = []
  private readonly orders: Array<{ field: string; ascending: boolean }> = []
  private limitCount: number | null = null
  private mode: 'select' | 'update' | 'delete' | 'insert' | 'upsert' = 'select'
  private payload: MockRow[] = []
  private onConflict = ''
  private singleMode: 'none' | 'single' | 'maybe-single' = 'none'
  private selectOptions: Record<string, any> = {}

  constructor(
    private readonly tableName: string,
    private readonly tables: MockTables,
  ) {}

  select(_columns = '*', options: Record<string, any> = {}) {
    this.selectOptions = options
    return this
  }

  insert(payload: MockRow | MockRow[]) {
    this.mode = 'insert'
    this.payload = Array.isArray(payload) ? payload : [payload]
    return this
  }

  upsert(payload: MockRow | MockRow[], options: { onConflict?: string } = {}) {
    this.mode = 'upsert'
    this.payload = Array.isArray(payload) ? payload : [payload]
    this.onConflict = options.onConflict ?? ''
    return this
  }

  update(payload: MockRow) {
    this.mode = 'update'
    this.payload = [payload]
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value })
    return this
  }

  neq(field: string, value: any) {
    this.filters.push({ type: 'neq', field, value })
    return this
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: 'in', field, value: values })
    return this
  }

  order(field: string, options: { ascending?: boolean } = {}) {
    this.orders.push({ field, ascending: options.ascending ?? true })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.singleMode = 'single'
    return this
  }

  maybeSingle() {
    this.singleMode = 'maybe-single'
    return this
  }

  private getTable(): MockRow[] {
    if (!this.tables[this.tableName]) {
      this.tables[this.tableName] = []
    }
    return this.tables[this.tableName]
  }

  private applySelect(rows: MockRow[]) {
    let selected = rows.filter((row) => rowMatchesFilters(row, this.filters)).map((row) => cloneRow(row))

    for (const order of this.orders) {
      selected = selected.sort((left, right) => {
        if (left[order.field] === right[order.field]) return 0
        if (left[order.field] > right[order.field]) return order.ascending ? 1 : -1
        return order.ascending ? -1 : 1
      })
    }

    if (typeof this.limitCount === 'number') {
      selected = selected.slice(0, this.limitCount)
    }

    if (this.selectOptions.head && this.selectOptions.count === 'exact') {
      return {
        data: null,
        count: selected.length,
        error: null,
      }
    }

    if (this.singleMode === 'single') {
      return {
        data: selected[0] ?? null,
        error: selected[0] ? null : new Error(`No rows found for ${this.tableName}`),
      }
    }

    if (this.singleMode === 'maybe-single') {
      return {
        data: selected[0] ?? null,
        error: null,
      }
    }

    return {
      data: selected,
      error: null,
    }
  }

  private applyUpdate(table: MockRow[]) {
    const rows = table.filter((row) => rowMatchesFilters(row, this.filters))
    for (const row of rows) {
      Object.assign(row, cloneRow(this.payload[0]), { updated_at: '2026-04-06T12:00:00.000Z' })
    }

    return {
      data: null,
      error: null,
    }
  }

  private applyDelete(table: MockRow[]) {
    const remaining = table.filter((row) => !rowMatchesFilters(row, this.filters))
    this.tables[this.tableName] = remaining
    return {
      data: null,
      error: null,
    }
  }

  private applyInsert(table: MockRow[]) {
    const inserted = this.payload.map((row) => prepareRow(this.tableName, table, row))
    table.push(...inserted)

    if (this.singleMode === 'single') {
      return {
        data: cloneRow(inserted[0] ?? null),
        error: null,
      }
    }

    return {
      data: cloneRow(inserted),
      error: null,
    }
  }

  private applyUpsert(table: MockRow[]) {
    const conflictColumns = this.onConflict.split(',').map((value) => value.trim()).filter(Boolean)
    const upserted: MockRow[] = []

    for (const row of this.payload) {
      const prepared = prepareRow(this.tableName, table, row)
      const match = table.find((candidate) => {
        if (conflictColumns.length === 0) {
          return candidate.id === prepared.id
        }

        return conflictColumns.every((column) => candidate[column] === prepared[column])
      })

      if (match) {
        Object.assign(match, prepared, { updated_at: '2026-04-06T12:00:00.000Z' })
        upserted.push(cloneRow(match))
      } else {
        table.push(prepared)
        upserted.push(cloneRow(prepared))
      }
    }

    if (this.singleMode === 'single') {
      return {
        data: upserted[0] ?? null,
        error: null,
      }
    }

    return {
      data: upserted,
      error: null,
    }
  }

  private execute() {
    const table = this.getTable()

    if (this.mode === 'update') return this.applyUpdate(table)
    if (this.mode === 'delete') return this.applyDelete(table)
    if (this.mode === 'insert') return this.applyInsert(table)
    if (this.mode === 'upsert') return this.applyUpsert(table)
    return this.applySelect(table)
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

export function createMockFrom(tables: MockTables) {
  return (tableName: string) => new MockQuery(tableName, tables)
}

export function createMockStorage() {
  const uploads = new Map<string, string>()

  return {
    from(bucket: string) {
      return {
        async upload(path: string, _file: any) {
          uploads.set(`${bucket}:${path}`, `https://example.com/storage/v1/object/public/${bucket}/${path}`)
          return { error: null }
        },
        getPublicUrl(path: string) {
          return {
            data: {
              publicUrl: uploads.get(`${bucket}:${path}`) ?? `https://example.com/storage/v1/object/public/${bucket}/${path}`,
            },
          }
        },
      }
    },
  }
}
