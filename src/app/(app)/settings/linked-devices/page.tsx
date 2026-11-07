"use client";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
export default function LinkedDevicesPage() {
  return (
    <FeatureUnavailable
      title="Linked Devices"
      description="Linked-device management isn't available yet. You can still sign in on another device with Scan to Login."
    />
  );
}
