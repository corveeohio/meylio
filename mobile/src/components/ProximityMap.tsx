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

export function ProximityMap({ center, radiusKm, markers, onSelect }: Props) {
  const html = buildLeafletMapHtml({ center, radiusKm, markers });

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
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
