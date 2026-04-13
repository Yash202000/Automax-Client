import { LocationPicker } from "./LocationPicker";
import type { LocationData } from "./LocationPicker";
import { Modal, ModalBody, ModalHeader, ModalTitle } from "./Modal";
import { useTranslation } from "react-i18next";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value?: LocationData;
  onChange: (location: LocationData | undefined) => void;
}

export function LocationPickerModal({
  isOpen,
  onClose,
  value,
  onChange,
}: LocationPickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{t("incidents.selectLocationModal")}</ModalTitle>
      </ModalHeader>
      <ModalBody className="max-h-[80vh] overflow-y-auto">
        <div className="p-1">
          <LocationPicker
            value={value}
            onChange={onChange}
            isExpanded={true}
            onToggleExpand={onClose}
          />
        </div>
      </ModalBody>
    </Modal>
  );
}
