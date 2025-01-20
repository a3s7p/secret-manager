import { Column } from "@tanstack/react-table";
import { FC } from "react";
import { Secret } from "../types";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export const SortHeaderButton: FC<{
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
