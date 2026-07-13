import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { buildLeafletMapHtml, type MapMarker } from '../utils/leafletMapHtml';

type Props = {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  markers: MapMarker[];
  onSelect: (userId: string) => void;
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
};

export function ProximityMap({ center, radiusKm, markers, onSelect }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = buildLeafletMapHtml({ center, radiusKm, markers });

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (data && data.type === 'select' && typeof data.userId === 'string') {
        onSelect(data.userId);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelect]);

  return (
    <View style={styles.wrapper} testID="proximity-map">
      <iframe ref={iframeRef} srcDoc={html} style={iframeStyle} title="Carte de proximité" />
    </View>
  );
}
