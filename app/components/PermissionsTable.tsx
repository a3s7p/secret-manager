import { useState } from "react";
import { Permission } from "../types";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { PermissionSwitch } from "./PermissionSwitch";
import { ComputePermissionsList } from "./ComputePermissionsList";
import { DialogDelete } from "./DialogDelete";
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
import { Input } from "@/components/ui/input";

export function PermissionsTable() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<Permission[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const columns: ColumnDef<Permission>[] = [
    {
      accessorKey: "uid",
      header: "User ID",
      cell: ({ row }) => <div>{row.getValue("uid")}</div>,
    },
    {
      accessorKey: "read",
      header: () => <div className="w-full text-center mx-auto">Read</div>,
      cell: ({ row }) => (
        <div className="w-full flex">
          <PermissionSwitch
            state={row.getValue("read")}
            setState={(state) =>
              setData(
                data.map((v) =>
                  v.uid === row.getValue("uid") ? { ...v, read: state } : v,
                ),
              )
            }
          />
        </div>
      ),
    },
    {
      accessorKey: "write",
      header: () => <div className="w-full text-center mx-auto">Write</div>,
      cell: ({ row }) => (
        <div className="w-full flex">
          <PermissionSwitch
            state={row.getValue("write")}
            setState={(state) =>
              setData(
                data.map((v) =>
                  v.uid === row.getValue("uid") ? { ...v, write: state } : v,
                ),
              )
            }
          />
        </div>
      ),
    },
    {
      accessorKey: "delete",
      header: () => <div className="w-full text-center mx-auto">Delete</div>,
      cell: ({ row }) => (
        <div className="w-full flex">
          <PermissionSwitch
            state={row.getValue("delete")}
            setState={(state) =>
              setData(
                data.map((v) =>
                  v.uid === row.getValue("uid") ? { ...v, delete: state } : v,
                ),
              )
            }
          />
        </div>
      ),
    },
    {
      accessorKey: "compute",
      header: "Compute with program IDs",
      cell: ({ row }) => {
        return (
          <ComputePermissionsList
            pids={row.getValue("compute")}
            setPids={(newPids) =>
              setData(
                data.map((v) =>
                  v.uid === row.getValue("uid")
                    ? { ...v, compute: newPids }
                    : v,
                ),
              )
            }
          />
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      header: "Revoke permission",
      cell: ({ row }) => {
        return (
          <div className="flex flex-col justify-start lg:flex-row lg:justify-center lg:space-x-1 items-center mx-auto">
            <DialogDelete
              title="Revoke Permission"
              onConfirmed={() =>
                setData(data.filter((v) => v.uid !== row.getValue("uid")))
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
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
    },
    defaultColumn: {
      minSize: 0,
      size: 0,
    },
  });

  return (
    <>
      <>
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
                    No special permissions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {table.getCanPreviousPage() || table.getCanNextPage() ? (
          <div className="flex flex-row items-center justify-between space-x-2 pt-4">
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
        ) : null}
        <Input
          id="uid"
          type="text"
          placeholder="Add User ID"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
          }}
        />
        {userId.length > 0 && userId.length !== 40 && (
          <p className="text-destructive">
            User IDs must be in hex format and 40 characters long.
          </p>
        )}
        <Button
          variant="secondary"
          className="w-full"
          disabled={userId.length !== 40}
          onClick={() => {
            setData([
              ...data,
              {
                uid: userId || "",
                read: false,
                write: false,
                delete: false,
                compute: [],
              },
            ]);
            setUserId("");
          }}
        >
          Add permission
        </Button>
      </>
    </>
  );
}
