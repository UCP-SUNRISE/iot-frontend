"use client";

import React from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Server, RadioTower } from "lucide-react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TopNav() {
  const { user, isLoading } = useUser();
  const { isConnected, registeredDevices } = useMqtt();

  const onlineDevices = registeredDevices.filter(d => d.last_status === "online").length;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
            SUNRISE
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Health Icons */}
          <div className="hidden md:flex items-center gap-4 text-muted-foreground mr-2">
            <div className="flex items-center gap-1.5" title={isConnected ? "Edge Server Online" : "Edge Server Offline"}>
              <Server className={`h-4 w-4 ${isConnected ? "text-green-500" : "text-red-500"}`} />
              <span className="text-xs font-medium">Server</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 hover:text-foreground transition-colors" title={`${onlineDevices} Device(s) Online`}>
                  <RadioTower className={`h-4 w-4 ${onlineDevices > 0 ? "text-green-500" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">Devices ({onlineDevices})</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Connected Devices</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  {registeredDevices.length > 0 ? (
                    <div className="space-y-3">
                      {registeredDevices.map((device) => (
                        <div key={device.device_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-mono">{device.device_id}</span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{device.last_status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground py-4">
                      No devices currently connected.
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* User Profile Widget */}
          {isLoading ? (
            <Avatar className="h-8 w-8 animate-pulse bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-8 w-8 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture || ""} alt={user.name || "User"} />
                    <AvatarFallback>
                      {user.email?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/auth/logout" className="w-full text-red-600 focus:text-red-600 cursor-pointer">
                    Log Out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a
              href="/api/auth/login"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Log In
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
