import { Component, type ReactNode } from "react";
import { reportGoogleFailure } from "../../../utils/mapProvider";

interface Props {
  children: ReactNode;
  // Rendered instead of the children once something inside throws.
  fallback: ReactNode;
}

// Google's map code can throw inside React's lifecycle when the API is in a bad
// state — notably while unmounting an advanced marker after the key was
// rejected. That must never take the page down: treat it as a Google failure,
// switch every map to OSM, and render the fallback.
export default class GoogleMapBoundary extends Component<
  Props,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportGoogleFailure(`Google Maps error: ${error.message}`);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
