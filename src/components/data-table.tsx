import * as React from "react";
import {
  ColumnDef,
  FooterContext,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  pageSize?: number;
  footerRenderers?: Record<
    string,
    (ctx: FooterContext<TData, unknown>) => React.ReactNode
  >;
};

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  footerRenderers = {},
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const responsiveClass =
                    (
                      header.column.columnDef.meta as
                        | { className?: string }
                        | undefined
                    )?.className ?? "";
                  return (
                    <TableHead
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`cursor-pointer select-none ${responsiveClass}`}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: "↑",
                            desc: "↓",
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    const responsiveClass =
                      (
                        cell.column.columnDef.meta as
                          | { className?: string }
                          | undefined
                      )?.className ?? "";
                    return (
                      <TableCell key={cell.id} className={responsiveClass}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {Object.keys(footerRenderers).length ? (
            <tfoot className="border-t bg-muted/40">
              <TableRow>
                {table.getFlatHeaders().map((header) => (
                  <TableCell key={header.id} className="text-sm font-medium">
                    {footerRenderers[header.column.id]
                      ? footerRenderers[header.column.id]!(header.getContext())
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            </tfoot>
          ) : null}
        </Table>
      </div>
      {data.length > pageSize ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {table.getState().pagination.pageIndex * pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              data.length,
            )}{" "}
            out of {data.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={`rounded-md border px-3 py-1 text-sm transition ${
                table.getCanPreviousPage()
                  ? "font-semibold text-foreground"
                  : "disabled:opacity-50"
              }`}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className={`rounded-md border px-3 py-1 text-sm transition ${
                table.getCanNextPage()
                  ? "font-semibold text-foreground"
                  : "disabled:opacity-50"
              }`}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
