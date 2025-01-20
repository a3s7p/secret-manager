import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit } from "lucide-react";
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
import { SecretForm } from "./SecretForm";

export const DialogUpdate: FC<{
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
          onSuccess={(newSecret: Secret) => {
            setTimeout(() => setOpen(false), 500);
            console.log("update success!", newSecret.id);
            onUpdated(newSecret);
          }}
          onError={(msg: any) => {
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
