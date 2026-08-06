import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { buildLeafletMapHtml, type MapMarker } from '../utils/leafletMapHtml';

type Props = {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  markers: MapMarker[];
  onSelect: (userId: string) => void;
};

// Memoized: the WebView reloads its whole page whenever the `html` string
// changes, so this component must not re-render (and rebuild that string)
// unless center/radius/markers actually changed — otherwise any unrelated
// parent re-render (e.g. a slider dragging) reloads the map every frame.
export const ProximityMap = memo(function ProximityMap({ center, radiusKm, markers, onSelect }: Props) {
  const html = useMemo(
    () => buildLeafletMapHtml({ center, radiusKm, markers }),
    [center.latitude, center.longitude, radiusKm, markers]
  );

  return (
    <View style={styles.wrapper} testID="proximity-map">
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'select' && typeof data.userId === 'string') {
              onSelect(data.userId);
            }
          } catch {
            /* message malformé, ignoré */
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
