import { Uuid } from "@nillion/client-vms";
import { FC, useEffect, useState } from "react";
import { useAsync } from "react-use";
import { delSecret, getSecrets, upsertSecret } from "../actions";
import { Secret } from "../types";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DialogView } from "./DialogView";
import { DialogUpdate } from "./DialogUpdate";
import { DialogDeleteSecret } from "./DialogDeleteSecret";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DialogCreate } from "./DialogCreate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SortHeaderButton } from "./SortHeaderButton";

export const SecretsTable: FC<{ userSeed: Uuid }> = ({ userSeed }) => {
  const initialData = useAsync(async () => await getSecrets(userSeed));

  const [data, setData] = useState<Secret[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  const { toast } = useToast();

  useEffect(() => {
    if (initialData.value) {
      if (typeof initialData.value === "string") {
        console.log(initialData.value);

        toast({
          title: "Error when loading data",
          description: initialData.value,
        });
      } else {
        setData(initialData.value);
      }
    }
  }, [initialData]);

  const columns: ColumnDef<Secret>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortHeaderButton name="Name" column={column} />,
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "creationDate",
      header: ({ column }) => (
        <SortHeaderButton name="Creation Date" column={column} />
      ),
      cell: ({ row }) => (
        <div className="">{format(row.getValue("creationDate"), "PP")}</div>
      ),
    },
    {
      accessorKey: "expirationDate",
      header: ({ column }) => (
        <SortHeaderButton name="Expiration Date" column={column} />
      ),
      cell: ({ row }) => (
        <div className="">{format(row.getValue("expirationDate"), "PP")}</div>
      ),
    },
    {
      accessorKey: "permissions",
      header: "User IDs with access",
      cell: ({ row }) => {
        const perms = row.original.permissions;

        return (
          <div className="w-full flex flex-col items-stretch space-y-1">
            {perms.length > 0 ? (
              perms.map((p) => (
                <div
                  key={p.uid}
                  className="flex flex-row justify-stretch items-center space-x-2 mr-auto"
                >
                  <Badge
                    variant="outline"
                    className="mx-0 overflow-ellipsis rounded-sm min-w-80"
                  >
                    {p.uid}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex flex-row justify-stretch items-center space-x-2 mr-auto">
                None
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const secret = row.original;

        return (
          <div className="flex-col justify-start lg:flex-row lg:justify-center lg:space-x-1 items-center mx-auto">
            <DialogView secret={secret} />

            <DialogUpdate
              secret={secret}
              onUpdated={(secret) =>
                setTimeout(async () => {
                  const res = await upsertSecret(userSeed, secret);

                  if (res) {
                    console.log("upsert secret result:", res);

                    toast({
                      title: "Error",
                      description: res,
                      variant: "destructive",
                    });
                  } else {
                    setData(data.map((v) => (v.id === secret.id ? secret : v)));

                    toast({
                      title: "Secret Updated",
                      description: "Secret updated successfully!",
                    });
                  }
                })
              }
            />

            <DialogDeleteSecret
              secret={secret}
              onDeleted={() =>
                setTimeout(async () => {
                  setData((data) => data.filter((v) => v.id !== secret.id));

                  const res = await delSecret(secret);

                  if (res) {
                    console.log("delete secret result:", res);

                    toast({
                      title: "Error",
                      description: res,
                      variant: "destructive",
                    });
                  } else {
                    setData(data.filter((v) => v.id !== secret.id));

                    toast({
                      title: "Secret Deleted",
                      description: "Secret deleted successfully!",
                    });
                  }
                })
              }
            />
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    defaultColumn: {
      minSize: 0,
      size: 0,
    },
  });

  const prm = table.getPaginationRowModel();
  const row = prm.rows.at(0);
  const showFirst = row ? row.index + 1 : 0;
  const showLast = Math.max(
    showFirst + table.getPaginationRowModel().rows.length - 1,
    0,
  );
  const total = table.getFilteredRowModel().rows.length;

  return (
    <>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="filter-expired">Hide Expired</Label>
          <Switch
            id="filter-expired"
            // checked={filterExpired}
            // onCheckedChange={setFilterExpired}
          />
        </div>
        <DialogCreate
          onCreated={(secret) => {
            setTimeout(async () => {
              const res = await upsertSecret(userSeed, secret);

              if (res) {
                console.log("upsert secret result:", res);

                toast({
                  title: "Error",
                  description: res,
                  variant: "destructive",
                });
              } else {
                setTimeout(() => {
                  setData([...data, secret]);
                });

                toast({
                  title: "Secret Created",
                  description: "Secret created successfully!",
                });
              }
            });
          }}
        />
      </div>
      <div className="rounded-md border mb-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No secrets found.
                  {columnFilters.length
                    ? null
                    : " Click the '+ New Secret' button to create your first secret!"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-row items-center justify-between space-x-2 pt-4">
        <div className="text-sm text-muted-foreground">
          Displaying {showFirst}-{showLast} of {total} secrets.
        </div>
        <div className="flex flex-row items-center space-x-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <div>Page {pagination.pageIndex + 1}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </>
  );
};
