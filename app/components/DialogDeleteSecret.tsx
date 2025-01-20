import { FC, useEffect } from "react";
import { Secret } from "../types";
import { useNilDeleteValues } from "@nillion/client-react-hooks";
import { Uuid } from "@nillion/client-vms";
import { DialogDelete } from "./DialogDelete";

export const DialogDeleteSecret: FC<{
  secret: Secret;
  onDeleted: () => void;
}> = ({ secret, onDeleted }) => {
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
