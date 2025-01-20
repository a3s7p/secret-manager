import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye } from "lucide-react";
import { FC, useState } from "react";
import { Secret } from "../types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNilRetrieveValues } from "@nillion/client-react-hooks";
import { Uuid } from "@nillion/client-vms";
import { Textarea } from "@/components/ui/textarea";

export const DialogView: FC<{ secret: Secret }> = ({ secret }) => {
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
