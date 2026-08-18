import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * The former public Guide used a rejected non-KingCam visual source.
 * Do not replace it with a synthetic identity. Until an accepted full-body
 * KingCam performance exists, this legacy route returns to the approved
 * KingCam profile surface.
 */
export default function KingCamGuide() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/kingcam");
  }, [setLocation]);

  return null;
}
