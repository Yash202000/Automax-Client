import React, { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useAppDispatch } from "../../hooks/redux";
import { fetchUsers } from "../../store/usersSlice";
import SoftPhone from "../sip/Softphone";
import { useSettings } from "../../contexts/SettingsContext";
import { useSoftphoneStore } from "../../stores/softphoneStore";
import usePermissions from "@/hooks/usePermissions";

export const UserBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const { isOpen, setIsOpen } = useSoftphoneStore();
  const { isSuperAdmin, hasAnyPermission } = usePermissions();

  const canViewSoftphone = isSuperAdmin || hasAnyPermission(["dashboard:ccm"]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUsers());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <>
      {children}
      {isAuthenticated && canViewSoftphone && (
        <SoftPhone
          showSip={isOpen}
          onClose={() => setIsOpen(false)}
          settings={{
            domain: settings?.sip_domain || "zkff.automaxsw.com",
            socketURL:
              settings?.sip_socket_url || "wss://zkff.automaxsw.com:7443",
          }}
          auth={{
            user: {
              userID: user?.id || "",
              extension: user?.extension || "",
            },
          }}
        />
      )}
    </>
  );
};
