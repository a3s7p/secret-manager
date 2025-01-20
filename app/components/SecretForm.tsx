import { FC, useState } from "react";
import { Secret, SecretSchema } from "../types";
import { useNillion, useNilStoreValues } from "@nillion/client-react-hooks";
import {
  NadaValue,
  UserId,
  Uuid,
  ValuesPermissionsBuilder,
} from "@nillion/client-vms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { PermissionsTable } from "./PermissionsTable";

export const SecretForm: FC<{
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
