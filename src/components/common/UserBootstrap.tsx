import React, { useEffect, useMemo } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useAppDispatch } from "../../hooks/redux";
import { fetchUsers } from "../../store/usersSlice";
import SoftPhone from "../sip/Softphone";
import { useSettings } from "../../contexts/SettingsContext";
import { useSoftphoneStore } from "../../stores/softphoneStore";
import usePermissions from "@/hooks/usePermissions";
import { CintrixCtiHost } from "@/components/cti/CintrixCtiHost";

export const UserBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  // Use zustand selectors so this component re-renders only when the
  // specific slice it reads changes. Subscribing to the full store via
  // destructuring would re-render on every set(), even no-op sets.
  const isOpen = useSoftphoneStore((s) => s.isOpen);
  const setIsOpen = useSoftphoneStore((s) => s.setIsOpen);
  const { isSuperAdmin, hasAnyPermission } = usePermissions();

  const canViewSoftphone = isSuperAdmin || hasAnyPermission(["dashboard:ccm"]);

  // When Cintrix is the CTI provider, the native SoftPhone must not mount at
  // all: its auto-connect effect registers the native JsSIP stack whenever
  // the persisted `shouldConnect` is true, giving previously-connected agents
  // a second SIP registration (double ringtone, native panel popping over the
  // widget) alongside CintrixCtiHost. Plain flag (not an early return) so all
  // hooks above/below still run unconditionally.
  const isCintrixCti =
    (window.APP_CONFIG?.CTI_PROVIDER ?? import.meta.env.VITE_CTI_PROVIDER) ===
    "cintrix";

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUsers());
    }
  }, [isAuthenticated, dispatch]);

  // Memoize the settings/auth object props so SoftPhone's effects don't
  // re-fire on every UserBootstrap render. Without this, fresh object
  // literals here would produce a new reference each render even when
  // the underlying primitive values are unchanged.
  const softphoneSettings = useMemo(
    () => ({
      domain: settings?.sip_domain || "zkff.automaxsw.com",
      socketURL:
        settings?.sip_socket_url || "wss://zkff.automaxsw.com:7443",
    }),
    [settings?.sip_domain, settings?.sip_socket_url],
  );

  const softphoneAuth = useMemo(
    () => ({
      user: {
        userID: user?.id || "",
        extension: user?.extension || "",
      },
    }),
    [user?.id, user?.extension],
  );

  return (
    <>
      {children}
      {isAuthenticated && canViewSoftphone && !isCintrixCti && (
        <SoftPhone
          showSip={isOpen}
          onClose={() => setIsOpen(false)}
          settings={softphoneSettings}
          auth={softphoneAuth}
        />
      )}
      {isAuthenticated && canViewSoftphone && isCintrixCti && (
        <CintrixCtiHost />
      )}
    </>
  );
};
