import { Switch } from "@/components/ui/switch";
import { FC } from "react";

export const PermissionSwitch: FC<{
  state: boolean;
  setState: (_: boolean) => void;
}> = ({ state, setState }) => (
  <Switch
    className="mx-auto"
    defaultChecked={state}
    onCheckedChange={setState}
  />
);
