"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAsync, useLocalStorage } from "react-use";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  createClient,
  NillionProvider,
  useNilDeleteValues,
  useNillion,
  useNilRetrieveValues,
  useNilStoreValues,
} from "@nillion/client-react-hooks";

import React, { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Wallet2,
  Eye,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  NadaValue,
  ProgramId,
  UserId,
  Uuid,
  ValuesPermissionsBuilder,
  VmClient,
  VmClientBuilder,
} from "@nillion/client-vms";

import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { upsertSecret, delSecret, findOrAddUser, getSecrets } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { Permission, Secret, SecretSchema } from "./types";

const SortHeaderButton: FC<{
  name: string;
  column: Column<Secret, unknown>;
}> = ({ name, column }) => {
  return (
    <Button
      variant="header"
      className="px-0"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {name}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown />
      ) : (
        <ArrowUpDown />
      )}
    </Button>
  );
};

const ComputePermissionsList: FC<{
  pids: ProgramId[];
  setPids?: (newPids: ProgramId[]) => void;
}> = ({ pids, setPids }) => {
  const [newPid, setNewPid] = useState("");
  const handleAdd = (pid: ProgramId) => setPids && setPids([...pids, pid]);
  const handleDelete = (pid: ProgramId) =>
    setPids && setPids(pids.filter((id) => id !== pid));

  return (
    <div className="w-full flex flex-col items-stretch space-y-1">
      {pids.length > 0 ? (
        pids.map((pid) => (
          <div
            key={pid}
            className="flex flex-row justify-stretch items-center space-x-2 mr-auto"
          >
            <Badge
              variant="outline"
              className="mx-0 overflow-ellipsis rounded-sm min-w-80"
            >
              {pid}
            </Badge>
            {setPids && (
              <Button
                variant="destructive"
                className="w-5 h-5"
                onClick={() => handleDelete(pid)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ))
      ) : (
        <div className="flex flex-row justify-stretch items-center space-x-2 mr-auto">
          None
        </div>
      )}
      {setPids && (
        <div className="flex flex-row justify-stretch items-center space-x-2 mr-auto">
          <Input
            type="text"
            value={newPid}
            placeholder="Add program ID"
            className="h-5 min-w-80"
            onChange={(e) => setNewPid(e.target.value.toLowerCase())}
          />
          <Button
            variant="outline"
            className="w-5 h-5 mx-auto"
            onClick={() => handleAdd(newPid)}
            disabled={newPid.length < 40 || pids.some((v) => v === newPid)}
          >
            <Plus />
          </Button>
        </div>
      )}
    </div>
  );
};

const PermissionSwitch: FC<{
  state: boolean;
  setState: (_: boolean) => void;
}> = ({ state, setState }) => (
  <Switch
    className="mx-auto"
    defaultChecked={state}
    onCheckedChange={setState}
  />
);

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

const SecretsTable: FC<{ userSeed: Uuid }> = ({ userSeed }) => {
  const initialData = useAsync(async () => await getSecrets(userSeed));

  const [data, setData] = useState<Secret[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
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

type ConnectionStatus = "disconnected" | "connected" | "connecting" | "error";

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

const statusColors: Record<ConnectionStatus, string> = {
  disconnected: "bg-gray-500",
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  error: "bg-red-500",
};

function ConnectionStatus({ status }: ConnectionStatusProps) {
  return <div className={cn("w-3 h-3 rounded-full", statusColors[status])} />;
}

const SecretForm: FC<{
  secret?: Secret;
  onSuccess?: (secret: Secret) => void;
  onError?: (error: string) => void;
}> = ({ secret, onSuccess, onError }) => {
  const { client } = useNillion();
  const nilStore = useNilStoreValues();

  const [datatype, setDatatype] = useState("text");
  const [newSecret, setNewSecret] = useState<Secret>();

  if (nilStore.isError) {
    // this seems to be the only way to debug FiberFailure correctly...
    console.log("nilStore error:", nilStore);
  }

  function onSubmit(data: Secret) {
    console.log("submitted secret form:", data);

    const id = data.id as Uuid;

    const values = [
      {
        name: data.name,
        value: (() => {
          switch (data.datatype) {
            case "text":
            case "json":
              return NadaValue.new_secret_blob(
                new Uint8Array(Buffer.from(data.value)),
              );
            case "int":
              return NadaValue.new_secret_integer(data.value);
          }
        })(),
      },
    ];

    // calculate date difference in days for ttl value
    const ttl = (() => {
      const d1 = new Date();
      const d2 = data.expirationDate;
      const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
      const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
      return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    })();

    const permissions = data.permissions
      .reduce(
        (vpb, p) => {
          var newVpb = vpb;
          const rawUid = new UserId(Uint8Array.from(Buffer.from(p.uid, "hex")));

          if (p.read) {
            newVpb = newVpb.grantRetrieve(rawUid);
          }

          if (p.write) {
            newVpb = newVpb.grantUpdate(rawUid);
          }

          if (p.delete) {
            newVpb = newVpb.grantDelete(rawUid);
          }

          newVpb = p.compute.reduce((vpb, pid) => {
            return vpb.grantCompute(rawUid, pid);
          }, newVpb);

          return vpb;
        },
        ValuesPermissionsBuilder.init().permissions(
          ValuesPermissionsBuilder.default(client.id),
        ),
      )
      .build();

    const args = { id, values, ttl, permissions };

    setNewSecret(data);
    console.log("executing store with:", args);

    nilStore.execute(args);
  }

  const [hasSignaled, setHasSignaled] = useState(false);

  if (!hasSignaled && (nilStore.isSuccess || nilStore.isError)) {
    if (onSuccess && nilStore.isSuccess && newSecret) {
      onSuccess({ ...newSecret, id: nilStore.data });
    } else if (onError && nilStore.isError) {
      onError(nilStore.error.message);
    }
    setHasSignaled(true);
    setNewSecret(undefined);
  }

  const form = useForm<Secret>({
    resolver: zodResolver(SecretSchema),
    defaultValues: secret || {
      id: undefined,
      name: "",
      value: "",
      datatype: "text",
      creationDate: new Date(),
      expirationDate: (() => {
        var date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      })(),
      permissions: [],
    },
  });

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret Name</FormLabel>
                <FormControl>
                  <Input placeholder="my-secret" {...field} />
                </FormControl>
                <FormDescription>
                  This is what your secret will be called.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="datatype"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data type</FormLabel>
                <Select
                  onValueChange={(v) => {
                    setDatatype(v);
                    field.onChange(v);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Data type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="int">Integer</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Pick an appropriate data type for your secret.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value</FormLabel>
                <FormControl>
                  {datatype === "text" ? (
                    <Textarea
                      rows={10}
                      placeholder="Some secret text..."
                      {...field}
                    />
                  ) : datatype === "json" ? (
                    <Textarea
                      rows={10}
                      placeholder="Some secret JSON..."
                      className="font-mono"
                      {...field}
                    />
                  ) : datatype === "int" ? (
                    <Input type="number" placeholder="0" {...field} />
                  ) : null}
                </FormControl>
                <FormDescription>
                  This is what your secret will contain.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expirationDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>When this secret will expire.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <>
                <FormItem>
                  <Collapsible>
                    <FormControl>
                      <CollapsibleTrigger asChild>
                        <Button className="w-full px-0" variant="header">
                          Permissions
                          <ChevronsUpDown className="h-4 w-4 ml-auto" />
                          <span className="sr-only">
                            Toggle Permissions panel
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                    </FormControl>
                    <CollapsibleContent className="space-y-3">
                      <PermissionsTable />
                    </CollapsibleContent>
                  </Collapsible>
                  <FormMessage />
                </FormItem>
              </>
            )}
          />

          <div className="flex flex-col items-end">
            {nilStore.isError ? (
              <div className="flex flex-col w-full text-mono text-destructive">
                <p>
                  <b>Error:</b>
                </p>
                <Textarea
                  className="overflow-x-scroll"
                  value={[
                    nilStore.error.cause as string,
                    nilStore.error.name,
                    nilStore.error.message,
                    nilStore.error.stack || "",
                  ].join("\n")}
                  readOnly
                />
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={nilStore.isLoading || nilStore.isSuccess}
              className="ml-auto"
            >
              {nilStore.isLoading ? (
                "Storing..."
              ) : nilStore.isSuccess ? (
                <>
                  <Check className="ml-2 h-4 w-4" /> Stored!
                </>
              ) : nilStore.isError ? (
                <>
                  <X className="ml-2 h-4 w-4" /> Failed!
                </>
              ) : secret?.id ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

const DialogCreate: FC<{ onCreated: (secret: Secret) => void }> = ({
  onCreated,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-5">
          <Plus className="h-4 w-4 mr-2" />
          New Secret
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-screen lg:max-w-[90%]">
        <DialogHeader>
          <DialogTitle>New Secret</DialogTitle>
          <DialogDescription>
            Enter the details for your new secret
          </DialogDescription>
        </DialogHeader>
        <SecretForm
          onSuccess={(newSecret) => {
            setTimeout(() => setOpen(false), 500);
            console.log("store success!", newSecret.id);
            onCreated(newSecret);
          }}
          onError={(msg) => {
            setOpen(false);

            toast({
              title: "Error",
              description: msg,
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

const DialogView: FC<{ secret: Secret }> = ({ secret }) => {
  const { toast } = useToast();
  const nilRetrieve = useNilRetrieveValues();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>();

  if (open && !value && nilRetrieve.isIdle) {
    nilRetrieve.execute({ id: secret.id as Uuid });
  }

  if (open && !value && nilRetrieve.isError) {
    console.log("retrieve error:", nilRetrieve);

    toast({
      title: nilRetrieve.error.name,
      description: nilRetrieve.error.message,
    });
  }

  if (open && !value && nilRetrieve.isSuccess) {
    console.log("retrieve success:", nilRetrieve);
    setValue(JSON.stringify(nilRetrieve.data, null, 2));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon">
                <Eye />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>View</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>View Secret</DialogTitle>
          <DialogDescription>Displaying current secret value</DialogDescription>
        </DialogHeader>
        <Textarea
          id="secretValue"
          value={value || "Loading value..."}
          className="font-mono min-h-80"
          readOnly
        />
      </DialogContent>
    </Dialog>
  );
};

const DialogUpdate: FC<{
  secret: Secret;
  onUpdated: (secret: Secret) => void;
}> = ({ secret, onUpdated }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon">
                <Edit />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Update</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="w-full max-w-screen lg:max-w-[90%]">
        <DialogHeader>
          <DialogTitle>Update Secret</DialogTitle>
          <DialogDescription>
            Update the fields of this secret
          </DialogDescription>
        </DialogHeader>
        <SecretForm
          secret={secret}
          onSuccess={(newSecret) => {
            setTimeout(() => setOpen(false), 500);
            console.log("update success!", newSecret.id);
            onUpdated(newSecret);
          }}
          onError={(msg) => {
            setOpen(false);

            toast({
              title: "Error",
              description: msg,
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

const DialogDeleteSecret: FC<{ secret: Secret; onDeleted: () => void }> = ({
  secret,
  onDeleted,
}) => {
  const nilDelete = useNilDeleteValues();

  useEffect(() => {
    if (nilDelete.isSuccess) {
      console.log("delete success!", nilDelete);
      onDeleted();
    } else if (nilDelete.isError) {
      console.log("delete error!", secret, nilDelete);
      onDeleted();
    }
  }, [nilDelete.status]);

  return (
    <DialogDelete
      title="Delete Secret"
      onConfirmed={() => {
        nilDelete.execute({ id: secret.id as Uuid });
      }}
    />
  );
};

const DialogDelete: FC<{
  title?: string;
  onConfirmed: () => void;
}> = ({ title, onConfirmed }) => {
  return (
    <>
      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{title || "Delete"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title || "Delete?"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this?
              <br />
              <b>This action cannot be undone!</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                className="bg-destructive"
                onClick={onConfirmed}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const NetworkSelect: FC = () => {
  const [network, setNetwork] = useLocalStorage("selectedNetwork", "photon2");

  return (
    <Select value={network} onValueChange={setNetwork}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select network" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="photon2">photon2</SelectItem>
        <SelectItem value="photon3" disabled>
          photon3 (WIP)
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

const queryClient = new QueryClient();

export default function Page() {
  // const [network, setNetwork] = useState("");
  const [client, setClient] = useState<VmClient>();
  const [userSeed, setUserSeed] = useState<Uuid>();

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      if (!window.keplr) {
        setLoginError(
          "You do not seem to have Keplr Wallet installed. This is required for the Secret Vault to work.",
        );
        return;
      }

      const chainId = "nillion-chain-testnet-1";
      const key = await window.keplr.getKey(chainId);
      const addr = key.bech32Address;
      const seed = await findOrAddUser(addr);

      setUserSeed(seed);

      setClient(
        await new VmClientBuilder()
          .seed(seed)
          .bootnodeUrl(
            "https://node-1.photon2.nillion-network.nilogy.xyz:14311/",
          )
          .chainUrl("https://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz")
          .signer(window.keplr.getOfflineSigner(chainId))
          .build(),
      );
    } catch (err) {
      setLoginError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setClient(undefined);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <ConnectionStatus
              status={
                loginError
                  ? "error"
                  : isLoading
                    ? "connecting"
                    : client
                      ? "connected"
                      : "disconnected"
              }
            />
            {isLoading ? (
              <span className="text-sm text-muted-foreground">
                Connecting ...
              </span>
            ) : loginError ? (
              <span className="text-sm text-red-500">
                {loginError.toString()}
              </span>
            ) : client ? (
              <span className="text-sm font-medium">
                Connected as <b>{client.payer.address}</b> on{" "}
                <b>{client.payer.chain.signer.chainId}</b>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Not connected
              </span>
            )}
          </div>
          {client && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          )}
        </header>
        <main className="flex flex-1 flex-col p-4 justify-start h-full">
          {client ? (
            <QueryClientProvider client={queryClient}>
              <NillionProvider client={client}>
                <h1 className="text-3xl font-bold mb-4">Manage Secrets</h1>
                <SecretsTable userSeed={userSeed as Uuid} />
              </NillionProvider>
            </QueryClientProvider>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center h-full my-auto">
                <h1 className="text-3xl font-bold mb-4">
                  Nillion Secret Vault
                </h1>
                <p className="text-lg text-center max-w-md mb-4">
                  Connect your Keplr wallet to manage your secrets!
                </p>
                <div className="flex flex-col items-center gap-4 mt-5">
                  <div className="flex flex-row gap-4 items-center">
                    <label>Network:</label>
                    <NetworkSelect />
                    <Button
                      size="lg"
                      onClick={handleLogin}
                      disabled={isLoading}
                    >
                      <Wallet2 className="mr-2 h-5 w-5" />
                      {isLoading ? "Logging in..." : "Connect Keplr Wallet"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        <Dialog open={!!loginError} onOpenChange={() => setLoginError(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login Error</DialogTitle>
              <DialogDescription>{loginError?.toString()}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
