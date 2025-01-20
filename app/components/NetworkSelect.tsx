import { FC } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "react-use";

export const NetworkSelect: FC = () => {
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
