import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgramId } from "@nillion/client-vms";
import { Plus, Trash2 } from "lucide-react";
import { FC, useState } from "react";

export const ComputePermissionsList: FC<{
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
