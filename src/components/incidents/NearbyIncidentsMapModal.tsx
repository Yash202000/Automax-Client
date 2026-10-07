import MapSwitch from "../maps/MapSwitch";
import GoogleNearbyIncidentsMapModal from "./GoogleNearbyIncidentsMapModal";
import LeafletNearbyIncidentsMapModal from "./LeafletNearbyIncidentsMapModal";

type NearbyIncidentsMapModalProps = React.ComponentProps<
  typeof LeafletNearbyIncidentsMapModal
>;

// Nearby incidents map. Native Google Maps when a key is configured (and
// working), otherwise the Leaflet + OSM map.
export function NearbyIncidentsMapModal(props: NearbyIncidentsMapModalProps) {
  return (
    <MapSwitch
      google={<GoogleNearbyIncidentsMapModal {...props} />}
      osm={<LeafletNearbyIncidentsMapModal {...props} />}
    />
  );
}

export default NearbyIncidentsMapModal;
