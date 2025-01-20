"use client";

import { Uuid, VmClient, VmClientBuilder } from "@nillion/client-vms";
import { NillionProvider } from "@nillion/client-react-hooks";
import { useState } from "react";
import { findOrAddUser } from "./actions";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Window as KeplrWindow } from "@keplr-wallet/types";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { NetworkSelect } from "./components/NetworkSelect";
import { SecretsTable } from "./components/SecretsTable";

declare global {
  interface Window extends KeplrWindow {}
}

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
                <b>{client.payer.chain.signer.chainId}</b>, user seed{" "}
                <b>{userSeed}</b>, user ID <b>{client.id.toHex()}</b>
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
            <NillionProvider client={client}>
              <h1 className="text-3xl font-bold mb-4">Manage Secrets</h1>
              <SecretsTable userSeed={userSeed as Uuid} />
            </NillionProvider>
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
