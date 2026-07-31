import { Platform } from 'react-native';

const LOCAL_DEV_URL = Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.14:3000';
const PRODUCTION_URL = 'https://api.meylio.fr';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? LOCAL_DEV_URL : PRODUCTION_URL);
