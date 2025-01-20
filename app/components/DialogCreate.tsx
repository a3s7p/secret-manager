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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SecretForm } from "./SecretForm";

export const DialogCreate: FC<{ onCreated: (secret: Secret) => void }> = ({
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
          onSuccess={(newSecret: Secret) => {
            setTimeout(() => setOpen(false), 500);
            console.log("store success!", newSecret.id);
            onCreated(newSecret);
          }}
          onError={(msg: string) => {
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
